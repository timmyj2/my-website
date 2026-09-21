const COOKIE = "tb_sess";
const TTL_SEC = 60 * 60 * 24 * 7;

function bytesToHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a, b) {
  const enc = new TextEncoder();
  const aa = enc.encode(String(a));
  const bb = enc.encode(String(b));
  const len = Math.max(aa.length, bb.length);
  let out = aa.length === bb.length ? 0 : 1;
  for (let i = 0; i < len; i++) {
    out |= (aa[i] || 0) ^ (bb[i] || 0);
  }
  return out === 0;
}

async function hmacHex(secret, payload) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return bytesToHex(sig);
}

function cookieFlags() {
  return "Path=/; HttpOnly; Secure; SameSite=Lax";
}

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extraHeaders,
    },
  });
}

export async function makeSessionCookie(env) {
  const exp = Math.floor(Date.now() / 1000) + TTL_SEC;
  const payload = `v1.${exp}`;
  const sig = await hmacHex(env.REPORTS_SECRET, payload);
  const value = `${payload}.${sig}`;
  return `${COOKIE}=${value}; Max-Age=${TTL_SEC}; ${cookieFlags()}`;
}

export function clearSessionCookie() {
  return `${COOKIE}=; Max-Age=0; ${cookieFlags()}`;
}

export async function readSession(request, env) {
  if (!env.REPORTS_SECRET) return false;
  const raw = request.headers.get("Cookie") || "";
  const match = raw.match(/(?:^|;\s*)tb_sess=([^;]+)/);
  if (!match) return false;
  const parts = match[1].split(".");
  if (parts.length !== 3) return false;
  const [ver, expStr, sig] = parts;
  const payload = `${ver}.${expStr}`;
  const expected = await hmacHex(env.REPORTS_SECRET, payload);
  if (!timingSafeEqual(sig, expected)) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  return true;
}

export function pinMatches(env, pin) {
  const expected = String(env.REPORTS_PIN || "");
  const got = String(pin || "").trim();
  if (!expected || !got) return false;
  return timingSafeEqual(expected, got);
}

export function secretsReady(env) {
  return Boolean(env.REPORTS_PIN && env.REPORTS_SECRET);
}
