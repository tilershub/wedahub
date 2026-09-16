# වැඩHUB

Sri Lankan services marketplace for **https://wedahub.lk**. Astro + React, with existing Supabase accounts and provider/project data.

The blogs, guides and tiling estimator belong to **https://tilershub.lk**, prepared independently on `codex/tilershub-content` for the separate `tilershub/tilershub-content` repository.

See [MIGRATION.md](MIGRATION.md) before deployment, [V1_PLAN.md](V1_PLAN.md) for
the v1 build, and [BRAND.md](BRAND.md) for the palette and its contrast rules.

Requires **Node 22.12 or newer** (Astro 7). To validate:

```sh
npm ci
node --test scripts/migration.test.mjs scripts/contrast.test.mjs scripts/phone.test.mjs scripts/sms.test.mjs
npm run build
npm run check:worker   # boots the built Worker: unmatched paths 404, migrations 301
npm run check:schema   # every table.column referenced in src/ exists
```

`npm run dev` starts local development. Since Astro 7 the dev server
**daemonizes** — it returns immediately and keeps running in the background.
Use `npx astro dev status`, `npx astro dev logs` and `npx astro dev stop`
rather than expecting Ctrl-C on a foreground process.

Database migrations live in `supabase/migrations/` and are applied in filename
order.
