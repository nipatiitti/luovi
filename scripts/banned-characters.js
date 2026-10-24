// AGENTS.md bans the em dash and the bullet anywhere in the UI: each stands in for a sentence or a layout that
// should have been written. ESLint stays out of Svelte files (eslint.config.js says why), so this script reads the
// packages that produce UI itself: the text a user can see is a string or template in TypeScript, or Svelte markup.
// Comments are not UI and are not checked. Escapes are caught too, since `\u2014` or `&mdash;` renders the same
// character: a string is judged by its cooked value, and markup by its text after character references are decoded.
import { globSync, readFileSync } from 'node:fs'
import ts from 'typescript'

const sources = ['packages/{tool,render}-*/src/**/*.{ts,svelte,html}']
const bannedCharacter = /[\u2014\u2022]/g

// Each way markup can spell a banned character, with the character it renders. A JavaScript escape counts in markup
// because a `{'...'}` expression there is a string the script pass never sees.
const markupForms = [
  [/\u2014|&mdash;|&#0*8212;|&#x0*2014;|\\u2014|\\u\{0*2014\}/gi, '\u2014'],
  [/\u2022|&bull;|&bullet;|&#0*8226;|&#x0*2022;|\\u2022|\\u\{0*2022\}/gi, '\u2022'],
]

const textKinds = new Set([
  ts.SyntaxKind.StringLiteral,
  ts.SyntaxKind.NoSubstitutionTemplateLiteral,
  ts.SyntaxKind.TemplateHead,
  ts.SyntaxKind.TemplateMiddle,
  ts.SyntaxKind.TemplateTail,
])

// The banned characters in a TypeScript source's strings and templates, at the offset of the literal holding each.
// A tagged template with an invalid escape has no cooked value, and its raw text stands in.
const scriptHits = (source) => {
  const hits = []
  const visit = (node) => {
    if (textKinds.has(node.kind)) {
      const cooked = node.text ?? node.rawText ?? ''
      for (const hit of cooked.matchAll(bannedCharacter)) hits.push([node.getStart(file), hit[0]])
    }
    ts.forEachChild(node, visit)
  }
  const file = ts.createSourceFile('source.ts', source, ts.ScriptTarget.Latest, true)
  visit(file)
  return hits
}

const markupHits = (source, from, to) =>
  markupForms.flatMap(([form, character]) =>
    [...source.slice(from, to).matchAll(form)].map((hit) => [from + hit.index, character]),
  )

// A Svelte file is markup with script blocks in it: the markup counts whole bar its comments, a script block counts
// as TypeScript does.
const svelteHits = (source) => {
  const hits = []
  let markupFrom = 0
  for (const block of source.matchAll(/(<script[^>]*>)([\s\S]*?)<\/script>|<!--[\s\S]*?-->/g)) {
    hits.push(...markupHits(source, markupFrom, block.index))
    markupFrom = block.index + block[0].length
    if (block[1] !== undefined) {
      const bodyFrom = block.index + block[1].length
      hits.push(...scriptHits(block[2]).map(([offset, character]) => [bodyFrom + offset, character]))
    }
  }
  hits.push(...markupHits(source, markupFrom, source.length))
  return hits
}

const lineOf = (source, offset) => source.slice(0, offset).split('\n').length

const findings = globSync(sources).flatMap((path) => {
  const source = readFileSync(path, 'utf8')
  const hits = path.endsWith('.ts') ? scriptHits(source) : svelteHits(source)
  return hits
    .toSorted(([a], [b]) => a - b)
    .map(
      ([offset, character]) =>
        `${path}:${lineOf(source, offset)}: banned character U+${character.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')} in UI text (AGENTS.md)`,
    )
})

for (const finding of findings) console.error(finding)
process.exitCode = findings.length > 0 ? 1 : 0
