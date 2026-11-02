import Lenis from "lenis";
import { navigate } from "astro:transitions/client";
import { createWarp, type Warp } from "./warp";
import { sound } from "./sound";

interface Moment {
  id: string;
  date: string;
  name: string;
  angle: number;
  message: string;
  target?: string;
  refusal?: string;
}

const moments = (window as unknown as { __moments: Moment[] }).__moments;
const SHOT_WIDTHS = [390, 820, 1440];
const WARP_MS = 950;
const ARRIVE_MS = 900;
const DIGITS = "0123456789";

const TOTAL_TIMELINES = 2;
const CONVERGE_DELAY_MS = 6000;

/* Progress. Memory first, so the site still works if storage is blocked. */

function readList(storage: () => Storage, key: string): string[] {
  try {
    return JSON.parse(storage().getItem(key) ?? "[]");
  } catch {
    return [];
  }
}

function writeList(storage: () => Storage, key: string, value: string[]) {
  try {
    storage().setItem(key, JSON.stringify(value));
  } catch {}
}

const FOUND_KEY = "worldline:found";
const TRIP_KEY = "worldline:trip";
const SEEN_KEY = "worldline:ending";
const local = () => localStorage;
const session = () => sessionStorage;
const found = new Set(readList(local, FOUND_KEY));
let trip = new Set(readList(session, TRIP_KEY));
let endingSeen = readList(local, SEEN_KEY).length > 0;

function addFound(path: string) {
  found.add(path);
  writeList(local, FOUND_KEY, [...found]);
}

function addToTrip(path: string) {
  trip.add(path);
  writeList(session, TRIP_KEY, [...trip]);
}

function clearTrip() {
  trip = new Set();
  writeList(session, TRIP_KEY, []);
}

const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const currentWorld = () => document.documentElement.dataset.world ?? "real";

/* Meter */

function preloadDigits() {
  for (const frame of [...DIGITS, "off", "dp"]) new Image().src = `/meter/${frame}.webp`;
}

function setMeter(el: Element, value: string) {
  const imgs = el.querySelectorAll("img");
  [...value].forEach((c, i) => {
    if (imgs[i]) imgs[i].src = `/meter/${c === "." ? "dp" : c}.webp`;
  });
}

function spinMeter(el: Element, to: string, duration: number) {
  const imgs = [...el.querySelectorAll("img")];
  const chars = [...to];
  const start = performance.now();
  let last = 0;
  return new Promise<void>((resolve) => {
    const tick = (now: number) => {
      const t = now - start;
      if (t - last > 48) {
        last = t;
        imgs.forEach((img, i) => {
          if (chars[i] === ".") return;
          const settleAt = duration * (0.55 + (0.45 * i) / imgs.length);
          if (t >= settleAt) img.src = `/meter/${chars[i]}.webp`;
          else {
            if (i === 7) sound.tick();
            const pick = Math.random() < 0.06 ? "off" : DIGITS[Math.floor(Math.random() * 10)];
            img.src = `/meter/${pick}.webp`;
          }
        });
      }
      if (t < duration) requestAnimationFrame(tick);
      else {
        setMeter(el, to);
        resolve();
      }
    };
    requestAnimationFrame(tick);
  });
}

/* Console */

function openConsole() {
  const dialog = document.querySelector<HTMLDialogElement>("#console");
  const trigger = document.querySelector<HTMLElement>("#open-console");
  if (!dialog || !trigger) return;
  const rect = trigger.getBoundingClientRect();
  dialog.showModal();
  preloadDigits();
  loadShot();
  if (reducedMotion()) {
    dialog.animate({ opacity: [0, 1] }, { duration: 160, easing: "ease" });
    return;
  }
  const inset = `inset(${rect.top}px ${innerWidth - rect.right}px ${innerHeight - rect.bottom}px ${rect.left}px)`;
  dialog.animate({ clipPath: [inset, "inset(0px)"] }, { duration: 460, easing: "cubic-bezier(0.32, 0.72, 0, 1)" });
}

function selected(): Moment {
  const value = document.querySelector<HTMLInputElement>('input[name="moment"]:checked')?.value;
  return moments.find((m) => m.id === value) ?? moments[1];
}

function renderMoment() {
  const moment = selected();
  const dial = document.querySelector<HTMLElement>("#dial");
  dial?.style.setProperty("--dial-angle", `${moment.angle}deg`);
  document.querySelector("#send-message")!.textContent = moment.message;
  const refusal = document.querySelector<HTMLElement>("#send-refusal")!;
  refusal.hidden = true;
  refusal.textContent = "";
  const button = document.querySelector<HTMLButtonElement>("#send-button")!;
  const here = moment.target === location.pathname;
  button.disabled = here;
  if (here) {
    refusal.hidden = false;
    refusal.textContent = "You're already in this one.";
  }
}

function select(id: string) {
  const input = document.querySelector<HTMLInputElement>(`input[name="moment"][value="${id}"]`);
  if (!input || input.checked) return;
  input.checked = true;
  if ("vibrate" in navigator) navigator.vibrate(8);
  sound.detent();
  renderMoment();
}

function bindDial() {
  const dial = document.querySelector<HTMLElement>("#dial");
  if (!dial) return;
  const angleFrom = (e: PointerEvent) => {
    const r = dial.getBoundingClientRect();
    const a = (Math.atan2(e.clientX - (r.left + r.width / 2), r.top + r.height / 2 - e.clientY) * 180) / Math.PI;
    return Math.max(-72, Math.min(72, a));
  };
  const nearest = (a: number) =>
    moments.reduce((best, m) => (Math.abs(m.angle - a) < Math.abs(best.angle - a) ? m : best));
  let dragging = false;
  dial.addEventListener("pointerdown", (e) => {
    dragging = true;
    dial.setPointerCapture(e.pointerId);
    dial.classList.add("is-dragging");
    dial.style.setProperty("--dial-angle", `${angleFrom(e)}deg`);
    select(nearest(angleFrom(e)).id);
  });
  dial.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const a = angleFrom(e);
    dial.style.setProperty("--dial-angle", `${a}deg`);
    select(nearest(a).id);
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    dial.classList.remove("is-dragging");
    renderMoment();
  };
  dial.addEventListener("pointerup", end);
  dial.addEventListener("pointercancel", end);
}

/* Page image used by the warp */

let shot: Promise<HTMLImageElement | null> | null = null;
let shotKey = "";

function loadShot() {
  const width = SHOT_WIDTHS.find((w) => innerWidth <= w) ?? SHOT_WIDTHS[SHOT_WIDTHS.length - 1];
  const key = `${currentWorld()}-${width}`;
  if (shot && key === shotKey) return shot;
  shotKey = key;
  shot = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = `/shots/${key}.webp`;
  });
  return shot;
}

function viewportCrop(img: HTMLImageElement) {
  const scale = Math.min(devicePixelRatio || 1, 1.5);
  const crop = document.createElement("canvas");
  crop.width = Math.round(innerWidth * scale);
  crop.height = Math.round(innerHeight * scale);
  const ctx = crop.getContext("2d")!;
  const ratio = img.naturalWidth / innerWidth;
  ctx.fillStyle = getComputedStyle(document.documentElement).backgroundColor;
  ctx.fillRect(0, 0, crop.width, crop.height);
  const h = Math.min(innerHeight * ratio, img.naturalHeight - scrollY * ratio);
  ctx.drawImage(img, 0, scrollY * ratio, img.naturalWidth, h, 0, 0, crop.width, h / (ratio / scale));
  return crop;
}

let warp: Warp | null | undefined;
let maskLoaded: Promise<HTMLImageElement | null> | null = null;

function loadMask() {
  maskLoaded ??= new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = "/console/mask.webp";
  });
  return maskLoaded;
}

async function getWarp() {
  if (warp !== undefined) return warp;
  const mask = await loadMask();
  const canvas = document.querySelector<HTMLCanvasElement>("#warp");
  if (!mask || !canvas) return (warp = null);
  try {
    warp = createWarp(canvas, mask);
  } catch {
    warp = null;
  }
  return warp;
}

function animate(duration: number, frame: (t: number) => void, stop: () => boolean) {
  return new Promise<void>((resolve) => {
    const start = performance.now();
    const step = (now: number) => {
      const t = stop() ? 1 : Math.min(1, (now - start) / duration);
      frame(t);
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

/* Moving between worlds */

let travelling = false;
let skip = false;

function targetMeter(html: string) {
  return html.match(/data-meter-value="([^"]+)"/)?.[1] ?? "0.000000";
}

function afterSwap() {
  return new Promise<void>((resolve) =>
    document.addEventListener("astro:page-load", () => resolve(), { once: true }),
  );
}

async function plainTravel(path: string) {
  const main = document.querySelector("main");
  await main?.animate({ opacity: [1, 0] }, { duration: 160, easing: "ease", fill: "forwards" }).finished;
  const loaded = afterSwap();
  await navigate(path);
  await loaded;
  document.querySelector("main")?.animate({ opacity: [0, 1] }, { duration: 200, easing: "ease" });
}

function settleFocus(label: string) {
  scrollTo(0, 0);
  lenis?.scrollTo(0, { immediate: true });
  document.querySelector<HTMLElement>("main")?.focus({ preventScroll: true });
  const announcer = document.querySelector("#announcer");
  if (announcer) announcer.textContent = label;
}

async function travel(path: string, label: string) {
  if (travelling) return;
  travelling = true;
  skip = false;
  lenis?.stop();
  const dialog = document.querySelector<HTMLDialogElement>("#console");

  const [engine, image] = reducedMotion() ? [null, null] : await Promise.all([getWarp(), loadShot()]);
  if (!engine || !image) {
    dialog?.close();
    await plainTravel(path);
    settleFocus(label);
    lenis?.start();
    travelling = false;
    return;
  }

  const html = await fetch(path).then((r) => r.text()).catch(() => "");
  const canvas = document.querySelector<HTMLCanvasElement>("#warp")!;
  const transit = document.querySelector<HTMLElement>("#transit")!;
  const meterMarkup = document.querySelector("#console .meter")!.cloneNode(true) as HTMLElement;
  transit.replaceChildren(meterMarkup);

  const source = document.querySelector("#console .meter")!.getBoundingClientRect();

  engine.resize();
  engine.setPage(viewportCrop(image));
  engine.draw(0, 0, 0);
  canvas.hidden = false;
  transit.hidden = false;
  dialog?.close();

  // The meter is the one thing that survives the trip, so it glides from the
  // console to the centre rather than appearing there.
  const end = transit.getBoundingClientRect();
  const dx = source.left + source.width / 2 - (end.left + end.width / 2);
  const dy = source.top + source.height / 2 - (end.top + end.height / 2);
  transit.animate(
    {
      transform: [
        `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(${source.width / end.width})`,
        "translate(-50%, -50%)",
      ],
    },
    { duration: 620, easing: "cubic-bezier(0.77, 0, 0.175, 1)" },
  );

  const spin = spinMeter(meterMarkup, targetMeter(html), WARP_MS + ARRIVE_MS * 0.5);
  sound.whoosh((WARP_MS + ARRIVE_MS) / 1000);

  await animate(
    WARP_MS,
    (t) => {
      const p = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      const jolt = t < 0.22 ? 1 - t / 0.22 : 0;
      engine.draw(0, p, jolt);
    },
    () => skip,
  );
  engine.draw(0, 1, 0);

  const loaded = afterSwap();
  await navigate(path);
  await loaded;
  settleFocus(label);

  const mode = document.documentElement.dataset.world === "alchemist" ? 2 : 1;
  revealHeadline();
  await animate(ARRIVE_MS, (t) => engine.draw(mode, 1 - (1 - t) ** 2.4, 0), () => skip);
  await spin;
  canvas.hidden = true;

  // Hand the meter back: it settles exactly where the new page's meter sits.
  const home = document.querySelector(".module .meter")?.getBoundingClientRect();
  if (home && !skip) {
    const from = transit.getBoundingClientRect();
    const toX = home.left + home.width / 2 - (from.left + from.width / 2);
    const toY = home.top + home.height / 2 - (from.top + from.height / 2);
    await transit.animate(
      {
        transform: [
          "translate(-50%, -50%)",
          `translate(-50%, -50%) translate(${toX}px, ${toY}px) scale(${home.width / from.width})`,
        ],
      },
      { duration: 520, easing: "cubic-bezier(0.77, 0, 0.175, 1)", fill: "forwards" },
    ).finished;
  }
  transit.getAnimations().forEach((a) => a.cancel());
  transit.hidden = true;
  transit.replaceChildren();
  lenis?.start();
  travelling = false;
}

/* Going home, and the ending */

async function returnHome() {
  const finish = trip.size >= 2;
  await travel("/", "Back on the real site.");
  if (finish) {
    clearTrip();
    showEnding();
  } else {
    updateStatus();
  }
}

function showEnding() {
  const ending = document.querySelector<HTMLDialogElement>("#ending");
  if (!ending) return;
  endingSeen = true;
  writeList(local, SEEN_KEY, ["seen"]);
  // Restart the line animations on replay.
  const lines = ending.querySelector("#ending-lines");
  lines?.replaceWith(lines.cloneNode(true));
  ending.showModal();
  updateStatus();
}

function updateStatus() {
  const status = document.querySelector("#module-status");
  if (status) status.textContent = found.size ? `Found ${found.size} of ${TOTAL_TIMELINES}` : "Open";
  const replay = document.querySelector<HTMLElement>("#replay-ending");
  if (replay) replay.hidden = !(endingSeen && currentWorld() === "real");
}

let convergeTimer: ReturnType<typeof setTimeout> | undefined;

function scheduleConverge() {
  clearTimeout(convergeTimer);
  if (trip.size < 2 || currentWorld() === "real") return;
  convergeTimer = setTimeout(() => {
    const notice = document.querySelector<HTMLElement>("#converge");
    if (notice) notice.hidden = false;
  }, CONVERGE_DELAY_MS);
}

function updateSoundButtons() {
  document.querySelectorAll<HTMLButtonElement>("[data-sound]").forEach((button) => {
    button.setAttribute("aria-pressed", String(sound.on));
    button.textContent = sound.on ? "Sound on" : "Sound off";
  });
}

/* Headline */

function revealHeadline() {
  const h1 = document.querySelector<HTMLElement>("[data-reveal]");
  if (!h1 || reducedMotion() || h1.querySelector(".reveal-line")) return;
  const text = h1.textContent ?? "";
  h1.setAttribute("aria-label", text);
  h1.innerHTML = text
    .split(" ")
    .map((word) => `<span class="reveal-line" aria-hidden="true"><span>${word}</span></span>`)
    .join(" ");
  h1.querySelectorAll<HTMLElement>(".reveal-line").forEach((line, i) => {
    (line.firstElementChild as HTMLElement).style.transitionDelay = `${120 + i * 90}ms`;
    requestAnimationFrame(() => requestAnimationFrame(() => line.classList.add("is-in")));
  });
}

/* Scroll */

let lenis: Lenis | null = null;

function setupScroll() {
  if (lenis || reducedMotion() || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  lenis = new Lenis({ lerp: 0.14, anchors: true });
  const raf = (time: number) => {
    lenis?.raf(time);
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);
}

/* Page setup, run on every page swap */

function setup() {
  setupScroll();
  document.querySelector("#open-console")?.addEventListener("click", openConsole);
  document.querySelector("[data-console-close]")?.addEventListener("click", () => {
    document.querySelector<HTMLDialogElement>("#console")?.close();
  });
  document.querySelectorAll('input[name="moment"]').forEach((input) => {
    input.addEventListener("change", () => {
      if ("vibrate" in navigator) navigator.vibrate(8);
      sound.detent();
      renderMoment();
    });
  });
  bindDial();
  renderMoment();

  document.querySelector("#console-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const moment = selected();
    if (moment.refusal) {
      const refusal = document.querySelector<HTMLElement>("#send-refusal")!;
      refusal.hidden = false;
      refusal.textContent = moment.refusal;
      sound.refuse();
      const meter = document.querySelector("#console .meter");
      if (meter && !reducedMotion()) spinMeter(meter, meter.getAttribute("data-value")!, 420);
      return;
    }
    if (moment.target && moment.target !== location.pathname) {
      addToTrip(moment.target);
      addFound(moment.target);
      travel(moment.target, `Now viewing a fictional timeline: ${moment.name} never happened.`);
    }
  });

  document.querySelector("[data-return]")?.addEventListener("click", (e) => {
    e.preventDefault();
    returnHome();
  });
  document.querySelector("[data-return-button]")?.addEventListener("click", returnHome);

  document.querySelectorAll("[data-sound]").forEach((button) => {
    button.addEventListener("click", () => {
      sound.toggle();
      updateSoundButtons();
    });
  });
  updateSoundButtons();

  document.querySelector("#replay-ending")?.addEventListener("click", () => {
    document.querySelector<HTMLDialogElement>("#console")?.close();
    showEnding();
  });
  document.querySelectorAll("[data-ending-close]").forEach((el) => {
    el.addEventListener("click", (e) => {
      document.querySelector<HTMLDialogElement>("#ending")?.close();
      const hash = el.getAttribute("href");
      if (!hash) return;
      e.preventDefault();
      const section = document.querySelector<HTMLElement>(hash);
      if (section) window.scrollTo(0, section.getBoundingClientRect().top + scrollY);
      lenis?.resize();
    });
  });

  if (currentWorld() !== "real") addFound(location.pathname);
  updateStatus();
  scheduleConverge();
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && travelling) skip = true;
});
document.addEventListener("astro:page-load", setup);
