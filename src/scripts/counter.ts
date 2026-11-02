// The shared tally of attempts to change the past. It's a garnish: with no URL
// configured, or the API down or slow, the console simply doesn't mention it.
export interface Counts {
  total: number;
  fixed: number;
  devops: number;
  samsung: number;
}

const URL_BASE: string = import.meta.env.PUBLIC_COUNTER_URL ?? "";
const SENT_KEY = "worldline:counted";
let counts: Counts | null = null;

async function request(path: string, method: string) {
  if (!URL_BASE) return;
  try {
    const res = await fetch(URL_BASE + path, { method, signal: AbortSignal.timeout(2500) });
    if (res.ok) counts = await res.json();
  } catch {}
}

export const loadCounts = () => request("/counts", "GET");

/** Each visit counts once per moment, so pressing Send repeatedly doesn't inflate it. */
export function recordAttempt(moment: string) {
  let sent: string[] = [];
  try {
    sent = JSON.parse(sessionStorage.getItem(SENT_KEY) ?? "[]");
    if (sent.includes(moment)) return Promise.resolve();
    sessionStorage.setItem(SENT_KEY, JSON.stringify([...sent, moment]));
  } catch {}
  return request(`/counts/${moment}`, "POST");
}

export function describeCounts(moment: string) {
  if (!counts?.total) return "";
  const here = counts[moment as keyof Counts] ?? 0;
  const tries = `${counts.total} ${counts.total === 1 ? "try" : "tries"} at changing my past so far`;
  const line = here ? `${tries}, ${here} on this one.` : `${tries}, none on this one yet.`;
  if (moment !== "fixed" || !here) return line;
  return `${line} ${here === 1 ? "It didn't work." : "None of them worked."}`;
}
