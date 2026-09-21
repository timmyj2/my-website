# PIN-protected reports — Cloudflare setup

The page is public. The pin and the report data are not.

| Lives in GitHub | Lives only on Cloudflare |
| --- | --- |
| `/reports/` shell (login UI + empty state) | `REPORTS_PIN` |
| `/functions/api/*` auth code | `REPORTS_SECRET` |
| | future report JSON (KV / R2) |

`my-website` is a public repo. Never commit report bodies or the pin.

## 1. Merge the branch

Merge `reports-pin-gate` into `main`. Cloudflare Pages will rebuild automatically.

Confirm Functions compiled: in the Pages deploy log you should see something like “Uploading functions” / no “functions directory ignored” warning.

## 2. Add the two secrets

1. Open [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages**.
2. Click the Pages project for this site (`timmyjfly` / whatever you named it).
3. **Settings** → **Variables and secrets** (sometimes labeled **Environment variables**).
4. Add both for **Production** (and Preview if you want preview URLs to work):

| Name | Type | Example |
| --- | --- | --- |
| `REPORTS_PIN` | Secret | a 4–8 digit pin only you know |
| `REPORTS_SECRET` | Secret | a long random string, not the pin |

For `REPORTS_SECRET`, generate something like:

```bash
openssl rand -hex 32
```

Save. Cloudflare will trigger a new deployment when secrets change. If it does not, open **Deployments** and retry the latest production deploy so Functions pick up the new env.

## 3. Confirm Functions are on

Settings → **Functions** should not be disabled.

If an old deploy used “Direct Upload” without a functions folder, reconnect the GitHub repo:

- Settings → **Builds & deployments**
- Production branch: `main`
- Build command: leave empty
- Build output directory: `/` (root)

## 4. Test

1. Open https://timmyjfly.pages.dev/reports/
2. Wrong pin → “Wrong pin.”
3. Right pin → empty reports container + Lock button
4. Refresh → still signed in (7-day HttpOnly cookie)
5. Lock → back to the pin screen

If you get “Set REPORTS_PIN and REPORTS_SECRET…”, the secrets are missing on that environment (Production vs Preview).

## 5. Later: put real reports in

Do not add `reports/2026-09-21.json` to git. Next step is a KV namespace bound as `REPORTS`, then `/api/reports` reads keys like `2026-09-21`.
