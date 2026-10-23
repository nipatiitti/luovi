import { fileURLToPath } from 'node:url'
import adapter from '@sveltejs/adapter-static'
import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'

// SharedArrayBuffer, which the simulation hands state through, exists only on a cross-origin isolated page.
// Vite's server.headers reaches its own assets but not the page SvelteKit serves, so a middleware ahead of both
// sets the headers on every response of the dev and preview servers.
const isolation = {
  name: 'cross-origin-isolation',
  configureServer: (server) => {
    server.middlewares.use(isolate)
  },
  configurePreviewServer: (server) => {
    server.middlewares.use(isolate)
  },
}

/** @type {import('vite').Connect.NextHandleFunction} */
function isolate(_request, response, next) {
  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
  response.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
  next()
}

// Workspace packages are served from source, so the tool never waits on (or runs ahead of) a tsc build.
const packages = fileURLToPath(new URL('..', import.meta.url))

export default defineConfig({
  // A single-page app: no server rendering (see src/routes/+layout.ts), every route falls back to one page.
  plugins: [isolation, sveltekit({ adapter: adapter({ fallback: 'index.html' }) })],
  // The simulation Worker is a module Worker (src/lib/host/worker.ts) and imports the simulation packages, so the
  // build emits it as an ES module rather than a classic script.
  worker: { format: 'es' },
  resolve: {
    alias: [
      { find: /^@luovi\/core\/math$/, replacement: `${packages}core/src/math/index.ts` },
      { find: /^@luovi\/([^/]+)$/, replacement: `${packages}$1/src/index.ts` },
    ],
  },
})
