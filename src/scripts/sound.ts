// Every sound here is synthesised in the browser. Off until someone asks for it.

const KEY = "worldline:sound";
let enabled = false;
let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;

try {
  enabled = localStorage.getItem(KEY) === "on";
} catch {}

function ready() {
  if (!enabled) return null;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") ctx.resume();
  if (!noise) {
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return ctx;
}

function burst(frequency: number, q: number, peak: number, length: number) {
  const ac = ready();
  if (!ac) return;
  const source = ac.createBufferSource();
  source.buffer = noise;
  const filter = ac.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = frequency;
  filter.Q.value = q;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(peak, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + length);
  source.connect(filter).connect(gain).connect(ac.destination);
  source.start();
  source.stop(ac.currentTime + length);
}

export const sound = {
  get on() {
    return enabled;
  },
  toggle() {
    enabled = !enabled;
    try {
      localStorage.setItem(KEY, enabled ? "on" : "off");
    } catch {}
    if (enabled) this.detent();
    return enabled;
  },
  detent: () => burst(2600, 3, 0.35, 0.035),
  tick: () => burst(5200, 8, 0.05, 0.018),
  refuse: () => burst(150, 2, 0.9, 0.22),
  whoosh(duration: number) {
    const ac = ready();
    if (!ac) return;
    const source = ac.createBufferSource();
    source.buffer = noise;
    source.loop = true;
    const filter = ac.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 1.4;
    const now = ac.currentTime;
    filter.frequency.setValueAtTime(240, now);
    filter.frequency.exponentialRampToValueAtTime(3400, now + duration * 0.5);
    filter.frequency.exponentialRampToValueAtTime(160, now + duration);
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.32, now + duration * 0.5);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter).connect(gain).connect(ac.destination);
    source.start();
    source.stop(now + duration);
  },
};
