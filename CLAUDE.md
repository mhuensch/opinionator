# Opinionator

Opinionated, zero-config JavaScript formatter. Deterministic AST printer — parses with @babel/parser, reprints via a custom printer. Targets ESM codebases (.js, .mjs, .cjs).

## Project structure

```
index.js                CLI entry point
src/parser.js           @babel/parser wrapper
src/printer.js          AST → formatted source
src/format.js           Orchestrates parse → print
test/rules/*.test.js    Per-rule test files
test/core/              Core integration tests
test/cli/               CLI test fixtures
```

## Commands

- **Run tests:** `npm test`
- **Format a file:** `node index.js <file-or-dir>` or `npm start -- <file-or-dir>`
- **Check without writing:** `node index.js <file-or-dir> --check`

## Tech

- Node 20.16.0, ESM (`"type": "module"`)
- @babel/parser + recast for parsing
- Node built-in test runner (`node --test`)
- No TypeScript, no build step

## Conventions

- This project formats its own code with its own rules (see README.md for the full rule digest)
- 2-space indent, no semicolons, single quotes
- snake_case variables, camelCase functions, PascalCase classes, SCREAMING_SNAKE_CASE constants
- Elm-style object/array formatting (leading commas, one property per line)
- Stroustrup brace style
- 120-char line width
