import { json, readSession } from "../_lib/auth.js";

// Grok adds a row here when you send a daily report link.
const REPORTS = [
  // { date: "2026-09-21", title: "Monday automations", url: "https://..." }
];

export async function onRequestGet({ request, env }) {
  if (!(await readSession(request, env))) {
    return json({ error: "Locked." }, 401);
  }
  return json({ reports: REPORTS });
}
