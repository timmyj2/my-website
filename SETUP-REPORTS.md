# PIN-protected reports — Cloudflare setup

The page is public. The pin and the report data are not.

| Lives in GitHub | Lives only on Cloudflare |
| --- | --- |
| `/reports/` shell (login UI) | `REPORTS_PIN` |
| `/functions/api/*` auth code | `REPORTS_SECRET` |
| | KV namespace bound as `REPORTS` |

`my-website` is a public repo. Never commit report bodies or the pin.

## Secrets (already needed)

Pages project → **Settings → Variables and secrets**

- `REPORTS_PIN` — 4–8 digit pin
- `REPORTS_SECRET` — long random string (`openssl rand -hex 32`)

Redeploy after adding them.

## Store reports in KV

1. Dashboard → **Storage & databases → KV** → **Create**.
   Name it something like `tim-toolbelt-reports`.
2. Pages project → **Settings → Bindings → Add → KV namespace**.
   - Variable name: `REPORTS` (exact)
   - Namespace: the one you just created
   - Add it for Production (and Preview if you use preview URLs)
3. Redeploy the Pages project so the binding attaches.
4. Open the KV namespace → **Add entry**:
   - Key: `report:2026-09-21`
   - Type: text
   - Value: JSON like:

```json
{
  "date": "2026-09-21",
  "title": "Monday automations",
  "status": "ok",
  "summary": "All jobs finished.",
  "body": "Put the full write-up here."
}
```

Keys must start with `report:`.

## Test

1. https://timmyjfly.pages.dev/reports/
2. Unlock with the pin
3. The card for that date should appear
