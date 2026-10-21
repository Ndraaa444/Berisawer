# Bagisawer

Futuristic creator tipping dashboard and browser overlay, built with React, TypeScript, Vite, and an optional Supabase browser client.

## Current scope

- Responsive creator console with overview, donation preview, overlay setup, and profile settings.
- Supabase email OTP sign-in when public Supabase environment values are configured.
- TypeScript strict checks and production build in GitHub Actions.
- Cloudflare Pages deployment workflow is opt-in and will run only when repository variable `CLOUDFLARE_PAGES_ENABLED=true` is set on `main`.

> **Payments are intentionally disabled.** QRIS and payment gateway integration must remain off until merchant verification and end-to-end webhook testing are complete. Dashboard activity and metrics shown before live backend integration are sample data only. Overlay URLs use stable per-feature token IDs. Keep token URLs private and revoke them if shared unintentionally.

## Local development

Requirements: Node.js 20 or newer.

```sh
npm install
cp .env.example .env.local
npm run dev
```

Set these public browser values in `.env.local`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (or the Supabase publishable key supported by your project)

Run checks before shipping:

```sh
npm run typecheck
npm run build
```

## Cloudflare Pages

Project name: `bagisawer`  
Primary domain: `https://bagisawer.my.id` (DNS managed separately)  
Cloudflare zone nameservers assigned: `bowen.ns.cloudflare.com`, `elinore.ns.cloudflare.com`  
Build command: `npm run build`  
Build output directory: `dist`  
Production branch: `main`

For GitHub Actions deployment, configure repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, then set repository variable `CLOUDFLARE_PAGES_ENABLED` to `true`. The token needs Pages deployment permissions. Do not put secrets in `VITE_*` variables because they are bundled into browser code.

## Security notes

- Never expose a Supabase service-role key or payment gateway server key in frontend code or `VITE_*` variables.
- Keep Row Level Security enabled and verify ownership policies on every user-facing table.
- Only treat payments as successful after validating the payment provider's server-side webhook signature and amount.
- Generate, store, rotate, and revoke overlay tokens server-side; never use a hard-coded placeholder as a production token.
