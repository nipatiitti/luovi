import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import { defineConfig, globalIgnores } from 'eslint/config'
import tseslint from 'typescript-eslint'

const simSources = [
  'packages/core/src/**/*.ts',
  'packages/sim-*/src/**/*.ts',
  'packages/data/src/**/*.ts',
  'packages/tool-bake/src/**/*.ts',
  'packages/tool-validate/src/harness/**/*.ts',
  'packages/tool-validate/src/benchmarks/**/*.ts',
]

// IEEE 754 operations that every engine rounds identically. Everything else in Math differs
// across V8, JavaScriptCore and SpiderMonkey and must come from core's deterministic math.
const portableMath = ['sqrt', 'abs', 'floor', 'ceil', 'round', 'trunc', 'min', 'max', 'sign', 'fround', 'imul', 'clz32']
const mathSelector = `CallExpression[callee.object.name='Math']:not([callee.property.name=/^(${portableMath.join('|')})$/])`

// tsc keeps import specifiers as written and Node resolves them literally, so an extensionless
// or .js relative import breaks either the built output or running the source directly.
// rewriteRelativeImportExtensions turns '.ts' into '.js' at emit, which runs in both.
const relativeImportsNameTs = {
  selector:
    ':matches(ImportDeclaration, ExportNamedDeclaration, ExportAllDeclaration, ImportExpression)[source.value=/^[.][.]?[/](?!.*[.](ts|json)$)/]',
  message: 'Relative imports name the .ts file so Node can run the build output.',
}

// ECMAScript lets an engine round a literal past its 20th significant digit as it likes; 17
// digits always round-trip a double.
const atMost17Digits = {
  selector: 'Literal[raw=/^[0._]*[1-9]([._]*[0-9]){16}[._0-9]*[1-9]/]:not([bigint])',
  message: 'Numeric literal with more than 17 significant digits; write the 17-digit round-trip value.',
}

// The allowlist above only sees direct calls; any other use of Math (an alias, a destructure, an
// uncalled member, a computed member) would carry a non-portable function past it.
const noBareMath = {
  selector:
    "Identifier[name='Math']:not(CallExpression > MemberExpression.callee[computed=false] > Identifier.object, MemberExpression[computed=false] > Identifier.property, Property[computed=false] > Identifier.key)",
  message: 'Math outside a direct call escapes the allowlist; import from @luovi/core/math.',
}

const noPromiseChains = [
  {
    selector: "MemberExpression[object.name='Promise'][property.name=/^(then|catch|finally)$/]",
    message: 'Use async/await.',
  },
  {
    selector: 'CallExpression[callee.property.name=/^(then|catch)$/]',
    message: 'Use async/await instead of promise chains.',
  },
]

const simRestrictions = [
  ...noPromiseChains,
  relativeImportsNameTs,
  atMost17Digits,
  {
    selector: mathSelector,
    message: 'Implementation-defined Math function; use the deterministic math in @luovi/core.',
  },
  {
    selector: "MemberExpression[object.name='Math'][property.name='random']",
    message: 'Use the seeded RNG in @luovi/core.',
  },
  {
    selector: "BinaryExpression[operator='**'], AssignmentExpression[operator='**=']",
    message: 'The ** operator is implementation-approximated like Math.pow; write x * x or use @luovi/core.',
  },
  {
    selector: "MemberExpression[object.name='Date'], NewExpression[callee.name='Date']",
    message: 'Time is the integer tick; wall-clock reads are banned in simulation packages.',
  },
]

export default defineConfig(
  globalIgnores([
    '**/dist/**',
    '**/node_modules/**',
    'eslint.config.js',
    '.dependency-cruiser.cjs',
    // SvelteKit's generated types and build output, and the tool's Vite config, which no tsconfig covers.
    'packages/tool-scenario/.svelte-kit/**',
    'packages/tool-scenario/build/**',
    'packages/tool-scenario/vite.config.js',
    // Svelte components stay out of lint rather than pulling in a Svelte parser; their logic lives in linted .ts
    // modules beside them, so a component is markup, bindings and calls.
    '**/*.svelte',
  ]),
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/promise-function-async': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'no-restricted-syntax': ['error', ...noPromiseChains, relativeImportsNameTs],
    },
  },
  {
    files: simSources,
    rules: {
      'no-restricted-globals': [
        'error',
        'window',
        'document',
        'navigator',
        'performance',
        'requestAnimationFrame',
        'setTimeout',
        'setInterval',
        'setImmediate',
        'queueMicrotask',
        // A global object reaches Math (and everything else banned here) as a property, which the
        // Math selectors cannot see.
        ...['globalThis', 'global', 'self'].map((name) => ({
          name,
          message: 'The global object escapes the simulation restrictions; import what you need.',
        })),
      ],
      'no-restricted-syntax': ['error', ...simRestrictions, noBareMath],
    },
  },
  {
    // The one file that re-exports the exact Math members, so it names Math by design.
    files: ['packages/core/src/math/exact.ts'],
    rules: { 'no-restricted-syntax': ['error', ...simRestrictions] },
  },
  prettier,
)
