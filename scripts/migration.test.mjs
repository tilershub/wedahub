import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { migrationRedirect } from '../src/lib/migration.js'
const cases = [["/blog/a?utm_source=old", "https://tilershub.lk/blog/a?utm_source=old"], ["/estimator/", "https://wedahub.lk/providers"], ["/guides/a", "https://tilershub.lk/guides/a"], ["/join-tilershub?district=Colombo", "https://wedahub.lk/join-wedahub?district=Colombo"], ["/providers/someone", null], ["/blogger", null], ["/", null]]
for (const [path, destination] of cases) test(path, () => assert.equal(migrationRedirect(new URL(path, 'https://wedahub.lk')), destination))
test('redirect destination ignores the incoming host', () => {
  const output = migrationRedirect(new URL(cases[0][0], 'https://untrusted.example'))
  assert.equal(output, cases[0][1])
})
test('deployment is explicit during the split', () => {
 const workflow = readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8')
 assert.match(workflow, /workflow_dispatch/); assert.doesNotMatch(workflow, /branches: \[main\]/)
})

// The migration redirects above only ever run if an unmatched request can
// reach Astro's middleware at all. With not_found_handling = "none" such a
// request falls through to the Worker, and the adapter's no-route-matched
// branch calls env.ASSETS.fetch() before rendering anything. If [assets] does
// not declare a binding, env.ASSETS is undefined and every path that is not an
// exact route match returns 500 instead of a 404 or one of these 301s — which
// is exactly what both live sites did for two days after the split.
test('[assets] binds ASSETS, so unmatched paths reach the middleware', () => {
  const config = readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8')
  const assets = config.split(/^\[/m).find(section => section.startsWith('assets]')) ?? ''
  if (!/not_found_handling\s*=\s*"none"/.test(assets)) return
  assert.match(assets, /^\s*binding\s*=\s*"ASSETS"/m,
    'wrangler.toml [assets] sets not_found_handling = "none" but does not bind ASSETS')
})
