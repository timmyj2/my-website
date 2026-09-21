import { json, makeSessionCookie, pinMatches, secretsReady } from "../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  if (!secretsReady(env)) {
    return json(
      { error: "Set REPORTS_PIN and REPORTS_SECRET in Cloudflare Pages → Settings → Variables and secrets." },
      503
    );
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  await new Promise((r) => setTimeout(r, 400));

  if (!pinMatches(env, body.pin)) {
    return json({ error: "Wrong pin." }, 401);
  }

  return json({ ok: true }, 200, { "Set-Cookie": await makeSessionCookie(env) });
}
