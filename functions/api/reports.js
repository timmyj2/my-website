import { json, readSession } from "../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  if (!(await readSession(request, env))) {
    return json({ error: "Locked." }, 401);
  }

  // Empty container on purpose. Later: read dated JSON from KV / R2.
  const reports = [];
  return json({ reports });
}
