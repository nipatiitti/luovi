// Layer order from docs/intention/05-separation-of-concerns.md:
// data -> core -> sim-ocean/hull/rig -> sim-world -> render-* -> tool-*/game-*
// A package never imports from a layer above it. Renderers and tools never import a model package.
// data imports core as types only (docs/adr/0009): the contract types, never a runtime edge.
const pkg = (glob) => `^packages/(${glob})/`

const data = 'data'
const core = 'core'
const models = 'sim-(ocean|hull|rig)'
const world = 'sim-world'
const render = 'render-[^/]+'
const tools = 'tool-[^/]+'
const games = 'game-[^/]+'

const mayImport = (name, from, allowed) => ({
  name,
  severity: 'error',
  comment: `${from} may import only: ${allowed || 'nothing from the workspace'}`,
  from: { path: pkg(from) },
  to: {
    path: '^packages/',
    pathNot: [pkg(from)].concat(allowed ? [pkg(allowed)] : []),
  },
})

module.exports = {
  forbidden: [
    mayImport('data-imports-only-core', data, core),
    {
      name: 'data-imports-core-as-types-only',
      severity: 'error',
      comment: 'data may import core for its types only; it has no runtime dependency on anything.',
      from: { path: pkg(data) },
      to: { path: pkg(core), dependencyTypesNot: ['type-only'] },
    },
    mayImport('core-imports-nothing', core, null),
    mayImport('models-import-core-and-data', models, `${core}|${data}`),
    mayImport('world-imports-core-data-models', world, `${core}|${data}|${models}`),
    mayImport('render-imports-core-and-world', render, `${core}|${world}`),
    mayImport('tools-import-core-data-world-render', tools, `${core}|${data}|${world}|${render}`),
    mayImport('games-import-core-world-render', games, `${core}|${world}|${render}`),
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'sim-has-no-dom-or-gpu-deps',
      severity: 'error',
      comment: 'Simulation packages are pure: no DOM, no WebGPU, no browser-only libraries.',
      from: { path: pkg(`${core}|${data}|${models}|${world}`) },
      to: { path: 'node_modules/(@webgpu|three|@babylonjs|pixi\\.js)' },
    },
    {
      name: 'validate-harness-has-no-node-deps',
      severity: 'error',
      comment: 'The harness and benchmarks also run in a browser page; file access comes through HarnessIo.',
      from: { path: '^packages/tool-validate/src/(harness|benchmarks)/' },
      to: { dependencyTypes: ['core'] },
    },
  ],
  options: {
    tsConfig: { fileName: 'tsconfig.base.json' },
    tsPreCompilationDeps: true,
    exclude: { path: 'node_modules|/dist/|/[.]engines/' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'types', 'default'],
      mainFields: ['module', 'main', 'types'],
    },
    reporterOptions: { text: { highlightFocused: true } },
  },
}
