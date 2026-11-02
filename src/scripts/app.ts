import Lenis from "lenis";
import { navigate } from "astro:transitions/client";
import { createWarp, type Warp } from "./warp";
import { flight, startSky } from "./sky";
import { BOX, type FieldObject } from "../data/field";
import { sound } from "./sound";
import { describeCounts, loadCounts, recordAttempt } from "./counter";

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
const WARP_MS = 900;
const VOYAGE_MS = 950;
const ARRIVE_MS = 900;
const TRIP_MS = WARP_MS + VOYAGE_MS + ARRIVE_MS;
const LAND_MS = 520;
const WORLD_FONTS = [
  '40px "Libre Caslon Text"',
  'italic 20px "Libre Caslon Text"',
  '16px "Courier Prime"',
  '40px "IM Fell English"',
  'italic 20px "IM Fell English"',
];
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
  loadMask();
  loadField();
  loadCounts().then(renderCount);
  // A late font would rewrap the next world's hero and move its meter mid-landing.
  for (const font of WORLD_FONTS) document.fonts.load(font).catch(() => {});
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

function renderCount() {
  const line = document.querySelector<HTMLElement>("#send-count");
  if (!line) return;
  line.textContent = describeCounts(selected().id);
  line.hidden = !line.textContent;
}

function renderMoment() {
  const moment = selected();
  renderCount();
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
  const h = Math.max(1, Math.min(innerHeight * ratio, img.naturalHeight - scrollY * ratio));
  ctx.drawImage(img, 0, scrollY * ratio, img.naturalWidth, h, 0, 0, crop.width, h / (ratio / scale));
  return crop;
}

let warp: Warp | null | undefined;
const textures = new Map<string, Promise<HTMLImageElement | null>>();

function loadTexture(src: string) {
  if (!textures.has(src)) {
    textures.set(
      src,
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
      }),
    );
  }
  return textures.get(src)!;
}

const loadMask = () => loadTexture("/console/mask.webp");
const loadField = () => loadTexture("/space/field.webp");

async function getWarp() {
  if (warp !== undefined) return warp;
  const [mask, field] = await Promise.all([loadMask(), loadField()]);
  const canvas = document.querySelector<HTMLCanvasElement>("#warp");
  if (!mask || !field || !canvas) return (warp = null);
  try {
    warp = createWarp(canvas, mask, field);
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
  // The tubes are screened so space shows through them. Over the page they need
  // this black plate behind them, which gives way as the page does.
  const plate = document.querySelector<HTMLElement>("#transit-plate")!;

  const source = document.querySelector("#console .meter")!.getBoundingClientRect();

  engine.resize();
  engine.setPage(viewportCrop(image), currentWorld() === "real");
  engine.draw(0, 0, 0, flight.fly, 0, flight.dim);
  canvas.hidden = false;
  transit.hidden = false;
  plate.hidden = false;
  plate.style.width = `${transit.offsetWidth}px`;
  plate.style.height = `${transit.offsetHeight}px`;
  plate.style.opacity = "1";
  dialog?.close();

  // The meter is the one thing that survives the trip, so it glides from the
  // console to the centre rather than appearing there.
  const end = transit.getBoundingClientRect();
  const dx = source.left + source.width / 2 - (end.left + end.width / 2);
  const dy = source.top + source.height / 2 - (end.top + end.height / 2);
  for (const el of [transit, plate]) {
    el.animate(
      {
        transform: [
          `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(${source.width / end.width})`,
          "translate(-50%, -50%)",
        ],
      },
      { duration: 620, easing: "cubic-bezier(0.77, 0, 0.175, 1)" },
    );
  }

  const spin = spinMeter(meterMarkup, targetMeter(html), WARP_MS + VOYAGE_MS - 80);
  sound.whoosh(TRIP_MS / 1000);

  // One continuous flight through the field across all three phases.
  const start = performance.now();
  const startFly = flight.fly;
  const startDim = flight.dim;
  flight.held = true;
  const fly = () => {
    const t = Math.min(1, (performance.now() - start) / TRIP_MS);
    flight.fly = startFly + Math.log2(1 + 2.1 * t * t * (3 - 2 * t));
    flight.dim = startDim + (1 - startDim) * Math.min(1, t * 4);
    return { at: flight.fly, speed: Math.sin(Math.PI * t) ** 2, dim: flight.dim };
  };

  await animate(
    WARP_MS,
    (t) => {
      const p = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      const jolt = t < 0.22 ? 1 - t / 0.22 : 0;
      const { at, speed, dim } = fly();
      engine.draw(0, p, jolt, at, speed, dim);
      plate.style.opacity = String(Math.max(0, Math.min(1, (0.6 - p) / 0.3)));
    },
    () => skip,
  );
  plate.hidden = true;

  // Swap the page while nothing but space is showing.
  const voyage = animate(
    VOYAGE_MS,
    () => {
      const { at, speed, dim } = fly();
      engine.draw(0, 1, 0, at, speed, dim);
    },
    () => skip,
  );
  const loaded = afterSwap();
  await navigate(path);
  await loaded;
  settleFocus(label);

  // Hand the meter back while there is still only space: it settles exactly
  // where the new page's meter sits, and the new world breaks through around it.
  const landing = start + WARP_MS + VOYAGE_MS - LAND_MS - performance.now();
  if (landing > 0 && !skip) await new Promise((resolve) => setTimeout(resolve, landing));
  const home = document.querySelector(".module .meter")?.getBoundingClientRect();
  if (home && !skip) {
    const from = transit.getBoundingClientRect();
    const toX = home.left + home.width / 2 - (from.left + from.width / 2);
    const toY = home.top + home.height / 2 - (from.top + from.height / 2);
    transit.animate(
      {
        transform: [
          "translate(-50%, -50%)",
          `translate(-50%, -50%) translate(${toX}px, ${toY}px) scale(${home.width / from.width})`,
        ],
      },
      { duration: LAND_MS, easing: "cubic-bezier(0.77, 0, 0.175, 1)", fill: "forwards" },
    );
  }
  await voyage;

  const mode = document.documentElement.dataset.world === "alchemist" ? 2 : 1;
  revealHeadline();
  await animate(
    ARRIVE_MS,
    (t) => {
      const { at, speed, dim } = fly();
      engine.draw(mode, 1 - (1 - t) ** 2.4, 0, at, speed, dim);
    },
    () => skip,
  );
  await spin;
  canvas.hidden = true;
  transit.getAnimations().forEach((a) => a.cancel());
  transit.hidden = true;
  transit.replaceChildren();
  flight.held = false;
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
  const fresh = lines?.cloneNode(true) as HTMLElement | undefined;
  if (fresh && readList(local, BOX_KEY).length && fresh.children.length < 4) {
    const line = document.createElement("p");
    line.textContent = "You also found the box. It isn't on my CV.";
    fresh.append(line);
  }
  if (fresh) lines?.replaceWith(fresh);
  ending.showModal();
  updateStatus();
}

function updateStatus() {
  const status = document.querySelector("#module-status");
  if (status) status.textContent = found.size ? `Found ${found.size} of ${TOTAL_TIMELINES} other lives` : `${TOTAL_TIMELINES} other lives to find`;
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

function splitWords(el: HTMLElement) {
  const text = el.textContent ?? "";
  el.setAttribute("aria-label", text);
  el.innerHTML = text
    .trim()
    .split(/\s+/)
    .map((word) => `<span class="reveal-line" aria-hidden="true"><span>${word}</span></span>`)
    .join(" ");
  const lines = [...el.querySelectorAll<HTMLElement>(".reveal-line")];
  lines.forEach((line, i) => {
    (line.firstElementChild as HTMLElement).style.transitionDelay = `${120 + i * 90}ms`;
  });
  return lines;
}

function revealHeadline() {
  const h1 = document.querySelector<HTMLElement>("[data-reveal]");
  if (!h1 || reducedMotion() || h1.querySelector(".reveal-line")) return;
  const lines = splitWords(h1);
  requestAnimationFrame(() => requestAnimationFrame(() => lines.forEach((line) => line.classList.add("is-in"))));
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

/* The real site: live space, the opening, type that arrives as you scroll */

let stopSky: (() => void) | null = null;

async function setupSky() {
  const canvas = document.querySelector<HTMLCanvasElement>("#sky");
  if (!canvas || reducedMotion()) return;
  const field = await loadField();
  // The page may have changed while the image loaded.
  if (!field || !canvas.isConnected) return;
  try {
    stopSky = startSky(canvas, field, showSight);
    const hint = document.querySelector<HTMLElement>("#sky-hint");
    if (hint) {
      hint.textContent = matchMedia("(hover: hover)").matches
        ? "Move your cursor across the sky: it bends the light. A few things are hiding in there."
        : "Drag across the sky: your finger bends the light. A few things are hiding in there.";
      hint.hidden = false;
    }
  } catch {
    // The CSS background behind the canvas stays.
  }
}

document.addEventListener("astro:before-swap", () => {
  stopSky?.();
  stopSky = null;
});

const BOX_KEY = "worldline:box";
let sighted: FieldObject | null = null;
let noteTimer: ReturnType<typeof setTimeout> | undefined;

function showSight(object: FieldObject | null, x: number, y: number) {
  const note = document.querySelector<HTMLElement>("#sky-note");
  if (!note) return;
  if (object) {
    clearTimeout(noteTimer);
    noteTimer = undefined;
    if (object !== sighted) {
      sighted = object;
      note.textContent = object.note;
      note.classList.add("is-on");
      sound.detent();
      if (object === BOX) writeList(local, BOX_KEY, ["found"]);
      // It stays put once placed, so it can be read while the mass moves on.
      const flip = x > innerWidth - 340;
      const left = flip ? x - note.offsetWidth - 28 : x + 28;
      const top = Math.max(12, Math.min(innerHeight - note.offsetHeight - 12, y - 20));
      note.style.left = `${Math.max(12, Math.round(left))}px`;
      note.style.top = `${Math.round(top)}px`;
    }
  } else if (sighted && !noteTimer) {
    noteTimer = setTimeout(() => {
      sighted = null;
      noteTimer = undefined;
      note.classList.remove("is-on");
    }, 1600);
  }
}

// Clicking the box goes to the one moment that can't be changed.
window.addEventListener("click", (e) => {
  if (sighted !== BOX || (e.target as Element).closest("a, button, input, label, dialog")) return;
  const fixed = document.querySelector<HTMLInputElement>('input[name="moment"][value="fixed"]');
  if (!fixed) return;
  fixed.checked = true;
  renderMoment();
  openConsole();
});

async function playOpening() {
  const root = document.documentElement;
  if (!root.classList.contains("opening")) return;
  try {
    sessionStorage.setItem("worldline:opened", "1");
  } catch {}
  const overlay = document.querySelector<HTMLElement>("#opening");
  const transit = document.querySelector<HTMLElement>("#transit");
  const home = document.querySelector<HTMLElement>(".module .meter");
  if (!overlay || !transit || !home) return root.classList.remove("opening");

  const meter = home.cloneNode(true) as HTMLElement;
  meter.querySelectorAll("img").forEach((img, i) => {
    if (i !== 1) img.src = "/meter/off.webp";
  });
  transit.replaceChildren(meter);
  transit.hidden = false;
  await Promise.race([loadField(), new Promise((resolve) => setTimeout(resolve, 1200))]);
  await spinMeter(meter, home.dataset.value!, 1000);

  const to = home.getBoundingClientRect();
  const from = transit.getBoundingClientRect();
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const easing = "cubic-bezier(0.77, 0, 0.175, 1)";
  flight.kick = 2.2;
  revealHeadline();
  overlay.animate({ opacity: [1, 0] }, { duration: 700, easing, fill: "forwards" });
  await transit.animate(
    {
      transform: ["translate(-50%, -50%)", `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(${to.width / from.width})`],
    },
    { duration: 700, easing, fill: "forwards" },
  ).finished;

  root.classList.remove("opening");
  transit.getAnimations().forEach((a) => a.cancel());
  transit.hidden = true;
  transit.replaceChildren();
}

function lightAge(years: number) {
  const short = (n: number) => (n < 10 ? n.toFixed(1).replace(".0", "") : Math.round(n).toString());
  if (years < 1000) return `${Math.round(years)} ${Math.round(years) === 1 ? "year" : "years"}`;
  if (years < 1e6) return `${short(years / 1e3)} thousand years`;
  if (years < 1e9) return `${short(years / 1e6)} million years`;
  return `${short(years / 1e9)} billion years`;
}

function setupType() {
  if (reducedMotion()) return;
  const name = document.querySelector<HTMLElement>(".sp-hero__name");
  const meter = document.querySelector<HTMLElement>(".sp-hero .meter");
  const quiet = document.querySelectorAll<HTMLElement>(".sp-hero .module__label, .sp-hero__role, .sp-hero__what");
  const lookback = document.querySelector<HTMLElement>("#lookback");
  if (lookback) lookback.hidden = false;
  document.querySelectorAll<HTMLElement>("[data-lines]").forEach((el) => {
    const lines = splitWords(el);
    const seen = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        lines.forEach((line) => line.classList.add("is-in"));
        seen.disconnect();
      },
      { threshold: 0.2 },
    );
    seen.observe(el);
  });

  // The statement lights up word by word as it passes through the screen.
  const statements = [...document.querySelectorAll<HTMLElement>("[data-words]")].map((el) => {
    el.innerHTML = (el.textContent ?? "")
      .trim()
      .split(/\s+/)
      .map((word) => `<span class="word">${word}</span>`)
      .join(" ");
    return { el, words: [...el.querySelectorAll<HTMLElement>(".word")] };
  });
  if (!statements.length) return;
  let queued = false;
  // The name and the meter pass the camera as the flight begins.
  const passHero = () => {
    const t = Math.min(1, scrollY / (innerHeight * 0.9));
    const fade = (from: number, to: number) => 1 - Math.max(0, Math.min(1, (t - from) / (to - from)));
    if (name) {
      name.style.transform = t ? `scale(${1 + 5 * t * t})` : "";
      name.style.opacity = String(fade(0.35, 0.85));
    }
    if (meter) {
      meter.style.transform = t ? `scale(${1 + 3.4 * t * t})` : "";
      meter.style.opacity = String(fade(0.4, 0.9));
    }
    quiet.forEach((el) => (el.style.opacity = String(fade(0, 0.3))));
  };
  const readLookback = () => {
    if (!lookback) return;
    const x = Math.min(1, scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight));
    lookback.classList.toggle("is-on", scrollY > innerHeight * 0.2);
    lookback.textContent = `Further out is further back: this light left ${lightAge(10 ** (x * Math.log10(13e9)))} ago`;
  };
  // The fixed nav steps aside while reading, and returns on the way back up.
  const nav = document.querySelector<HTMLElement>(".sp-top");
  let lastY = scrollY;
  const paint = () => {
    queued = false;
    nav?.classList.toggle("is-tucked", scrollY > innerHeight && scrollY > lastY);
    lastY = scrollY;
    passHero();
    readLookback();
    for (const { el, words } of statements) {
      const box = el.getBoundingClientRect();
      const p = (innerHeight * 0.85 - box.top) / (box.height + innerHeight * 0.3);
      words.forEach((word, i) => {
        const lit = Math.max(0, Math.min(1, (p * words.length - i) / 4));
        word.style.opacity = String(0.22 + 0.78 * lit);
      });
    }
  };
  paint();
  const onScroll = () => {
    if (!queued) requestAnimationFrame(paint);
    queued = true;
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  document.addEventListener("astro:before-swap", () => window.removeEventListener("scroll", onScroll), { once: true });
}

/* Page setup, run on every page swap */

function setup() {
  setupScroll();
  setupSky();
  playOpening();
  setupType();
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
    if (!(moment.target && moment.target === location.pathname)) recordAttempt(moment.id).then(renderCount);
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
