import { json, readSession } from "../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  const hasPin = Boolean(env.REPORTS_PIN);
  const hasSecret = Boolean(env.REPORTS_SECRET);
  const setup = hasPin && hasSecret;
  const ok = setup ? await readSession(request, env) : false;
  return json({
    ok,
    setup,
    hasPin,
    hasSecret,
  });
}
