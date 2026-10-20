import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

const simSources = [
  'packages/core/src/**/*.ts',
  'packages/sim-*/src/**/*.ts',
  'packages/data-*/src/**/*.ts',
];

// IEEE 754 operations that every engine rounds identically. Everything else in Math differs
// across V8, JavaScriptCore and SpiderMonkey and must come from core's deterministic math.
const portableMath = [
  'sqrt',
  'abs',
  'floor',
  'ceil',
  'round',
  'trunc',
  'min',
  'max',
  'sign',
  'fround',
  'imul',
  'clz32',
];
const mathSelector = `CallExpression[callee.object.name='Math']:not([callee.property.name=/^(${portableMath.join('|')})$/])`;

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', 'eslint.config.js', '.dependency-cruiser.cjs'] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
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
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "MemberExpression[object.name='Promise'][property.name=/^(then|catch|finally)$/]",
          message: 'Use async/await.',
        },
        {
          selector: 'CallExpression[callee.property.name=/^(then|catch)$/]',
          message: 'Use async/await instead of promise chains.',
        },
      ],
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
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: mathSelector,
          message:
            'Implementation-defined Math function; use the deterministic math in @luovi/core.',
        },
        {
          selector: "MemberExpression[object.name='Math'][property.name='random']",
          message: 'Use the seeded RNG in @luovi/core.',
        },
        {
          selector: "BinaryExpression[operator='**'], AssignmentExpression[operator='**=']",
          message:
            'The ** operator is implementation-approximated like Math.pow; write x * x or use @luovi/core.',
        },
        {
          selector: "MemberExpression[object.name='Date']",
          message: 'Time is the integer tick; wall-clock reads are banned in simulation packages.',
        },
        {
          selector: "NewExpression[callee.name='Date']",
          message: 'Time is the integer tick; wall-clock reads are banned in simulation packages.',
        },
        {
          selector:
            "MemberExpression[object.name='Promise'][property.name=/^(then|catch|finally)$/]",
          message: 'Use async/await.',
        },
        {
          selector: 'CallExpression[callee.property.name=/^(then|catch)$/]',
          message: 'Use async/await instead of promise chains.',
        },
      ],
    },
  },
  prettier,
);
