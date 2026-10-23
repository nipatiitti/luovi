/**
 * Why the page will not start, or undefined when it may. The simulation will hand its state to the renderer through
 * a SharedArrayBuffer, which browsers only expose on a cross-origin isolated page, so there is no fallback.
 */
export const isolationProblem = (isolated: boolean): string | undefined =>
  isolated
    ? undefined
    : 'This page is not cross-origin isolated, so the browser withholds SharedArrayBuffer, which the simulation ' +
      'uses to hand its state to the renderer. Serve the page with the headers Cross-Origin-Opener-Policy: ' +
      'same-origin and Cross-Origin-Embedder-Policy: require-corp. The dev server sends both: run ' +
      '"pnpm --filter @luovi/tool-scenario dev" and open the address it prints.'
