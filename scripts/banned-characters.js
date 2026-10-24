// AGENTS.md bans the em dash and the bullet anywhere in the UI: each stands in for a sentence or a layout that
// should have been written. ESLint stays out of Svelte files (eslint.config.js says why), so this script reads the
// packages that produce UI itself: the text a user can see is a string or template in TypeScript, or Svelte markup.
// Comments are not UI and are not checked.
import { globSync, readFileSync } from 'node:fs'
import ts from 'typescript'

const banned = /[—•]/g
const sources = ['packages/{tool,render}-*/src/**/*.{ts,svelte,html}']

const textKinds = new Set([
  ts.SyntaxKind.StringLiteral,
  ts.SyntaxKind.NoSubstitutionTemplateLiteral,
  ts.SyntaxKind.TemplateHead,
  ts.SyntaxKind.TemplateMiddle,
  ts.SyntaxKind.TemplateTail,
])

// The offsets of the string and template text in a TypeScript source.
const scriptText = (source) => {
  const spans = []
  const visit = (node) => {
    if (textKinds.has(node.kind)) spans.push([node.getStart(file), node.getEnd()])
    ts.forEachChild(node, visit)
  }
  const file = ts.createSourceFile('source.ts', source, ts.ScriptTarget.Latest, true)
  visit(file)
  return spans
}

// A Svelte file is markup with script blocks in it: the markup counts whole bar its comments, a script block counts
// as TypeScript does.
const svelteText = (source) => {
  const spans = []
  let markupFrom = 0
  for (const block of source.matchAll(/(<script[^>]*>)([\s\S]*?)<\/script>|<!--[\s\S]*?-->/g)) {
    spans.push([markupFrom, block.index])
    markupFrom = block.index + block[0].length
    if (block[1] !== undefined) {
      const bodyFrom = block.index + block[1].length
      spans.push(...scriptText(block[2]).map(([from, to]) => [bodyFrom + from, bodyFrom + to]))
    }
  }
  spans.push([markupFrom, source.length])
  return spans
}

const lineOf = (source, offset) => source.slice(0, offset).split('\n').length

const findings = globSync(sources).flatMap((path) => {
  const source = readFileSync(path, 'utf8')
  const spans = path.endsWith('.ts') ? scriptText(source) : svelteText(source)
  return spans.flatMap(([from, to]) =>
    [...source.slice(from, to).matchAll(banned)].map(
      (hit) =>
        `${path}:${lineOf(source, from + hit.index)}: banned character U+${hit[0].codePointAt(0).toString(16).toUpperCase().padStart(4, '0')} in UI text (AGENTS.md)`,
    ),
  )
})

for (const finding of findings) console.error(finding)
process.exitCode = findings.length > 0 ? 1 : 0
