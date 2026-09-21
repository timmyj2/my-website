import { json, readSession } from "../_lib/auth.js";

function parseReport(key, raw) {
  if (!raw) return null;
  try {
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    return {
      id: data.id || key.replace(/^report:/, ""),
      date: data.date || "",
      title: data.title || key,
      status: data.status || "ready",
      summary: data.summary || "",
      body: data.body || "",
    };
  } catch {
    return {
      id: key.replace(/^report:/, ""),
      date: "",
      title: key,
      status: "ready",
      summary: String(raw).slice(0, 240),
      body: String(raw),
    };
  }
}

export async function onRequestGet({ request, env }) {
  if (!(await readSession(request, env))) {
    return json({ error: "Locked." }, 401);
  }

  if (!env.REPORTS) {
    return json({ reports: [], source: "none" });
  }

  const listed = await env.REPORTS.list({ prefix: "report:" });
  const reports = [];
  for (const item of listed.keys) {
    const raw = await env.REPORTS.get(item.name);
    const parsed = parseReport(item.name, raw);
    if (parsed) reports.push(parsed);
  }

  reports.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return json({ reports, source: "kv" });
}
