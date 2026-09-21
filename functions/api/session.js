import { json, readSession, secretsReady } from "../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  if (!secretsReady(env)) return json({ ok: false, setup: false }, 200);
  const ok = await readSession(request, env);
  return json({ ok, setup: true });
}
