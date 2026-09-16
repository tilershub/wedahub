import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import cloudflare from '@astrojs/cloudflare'

export default defineConfig({
  integrations: [react()],
  output: 'server',
  adapter: cloudflare({
    // The adapter defaults to transforming images through a Cloudflare Images
    // binding. Nothing here uses astro:assets — every image is a Supabase
    // Storage URL rendered by a plain <img> — so that default would demand an
    // IMAGES binding at deploy time for a feature the app never calls.
    imageService: 'passthrough',
  }),
  site: 'https://wedahub.lk',
  // Same reasoning, and it buys something: Astro sessions default to a KV
  // namespace named SESSION, which this account has no reason to provision.
  // Auth is Supabase cookies and nothing reads Astro.session, so switching it
  // off also drops the session runtime out of the SSR bundle — which this app
  // cares about, being aimed at mid-range Android on mobile data.
  session: false,
  // Astro 7 changed the default to 'jsx', which strips whitespace between
  // inline elements the way JSX does. This UI puts adjacent <span>s next to
  // each other all over — the si-text/en-text pairs, the chip rows, the
  // icon-then-label runs — and relies on the space between them rendering.
  // Kept at the pre-upgrade behaviour so the upgrade is a dependency change
  // and not a silent reflow of every page.
  compressHTML: true,
})
