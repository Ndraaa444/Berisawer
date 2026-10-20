# Berisawer

Futuristic creator tipping dashboard and browser overlay.

> QRIS and payment gateway integrations remain disabled until merchant verification is complete.

## Development

- Node.js 20+
- `npm install`
- Copy `.env.example` to `.env.local` and configure Supabase public URL and anon key.
- `npm run dev`
- `npm run build`

Never put the Supabase service-role key or payment gateway secret in frontend environment variables.