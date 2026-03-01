# (The) Opinionator
Opinionated formatter based on my coding style for JavaScript.  Opinionator uses a deterministic AST printer (CLI) to enforce all formatting rules. It is HIGHLY opinionated and does not support any configuration. Take it or leave it. 

>The Opinionator does what is objectively correct and does not care about your feelings or preferences.

## Command Usage
Instalation:
```
npm install -g opinionator
```

Bulk Format:
```
opinionator src/
```
Or:
```
opinionator filename.js
```

Chceck w/o Changes:
```
opinionator src/ --check
```

Command Returns:
- 0 = clean / no changes (in --check)
- 1 = formatting changes needed
- 2 = parse error / internal crash



## File Usage

Ignore next line:
```js
// opinionator-ignore-next
doThing().then(...)
```

Ignore a range:
```js
// opinionator-ignore-start
...weird legacy block...
// opinionator-ignore-end
```

To Ignore Entire File (must be the first non-shebang line):
```js
// opinionator-ignore-file
```



## Design

- Deterministic output
- No reliance on original spacing
- Pure AST → printer model
- Targets ESM codebases only
- Targets .js, .mjs, .cjs file extensions
- Ignores dist/, build/, node_modules/ by default
- Reads and ingores files included in .gitignore



## Digest

### General Formatting

- 2-space indentation
- No semicolons
- No 'use strict'
- Stroustrup brace style
- Space before parentheses on named functions — `foo ( arg )`
- Space before and after parentheses in function calls — `foo ( arg )`
- No trailing blank line in blocks
- One blank line after class signature
- One blank line before class closing brace
- Two blank lines between functions
- One blank line before return
- One blank line between validation and execution
- One blank line between unrelated blocks (if/for/try)
- Always include parentheses in arrow function declarations (`(x) =>`)
- Quote object keys only when required (`'kebab-key'`)


### Function Arguments

- Standard JS formatting
- Trailing commas allowed
- Multi-line argument lists


### Elm-Style Formatting for Objects & Arrays

- Opening brace/bracket on next line
- 2-space indentation
- Leading commas
- One property per line
- No trailing commas
- No inline object/array returns
- Nested objects aligned with the first letter of the parent property


### Naming Conventions

| Type | Style |
|------|--------|
| Variables | snake_case |
| Functions | camelCase |
| Classes | PascalCase |
| Private methods | _camelCase |
| Module constants | SCREAMING_SNAKE_CASE |

- Prefer `const`; `let` only when reassigned; forbid `var`


### Conditions

- Boolean → `=== true` / `=== false`
- No `!` for boolean negation — use `=== false` instead of `!expr`
- Existence → `== null` / `!= null`
- Explicit property existence → `=== undefined` / `!== undefined`
- Always use `===` / `!==` for all other comparisons
- No implicit truthy checks unless checking for null
- Single-line guards preferred when they fit under the maximum length; otherwise, multi-line


### Imports

- Enforce `node:` prefix for built-ins (`node:path`)
- Always include file extensions for ESM module imports
- Import ordering (deterministic):
  1. Built-in (`node:fs`, `node:path`)
  2. External dependencies
  3. Internal (relative / alias)
- Sort entire import lines within a group
- Blank line between groups
- Named imports sorted (`{ a, b, c }`)
- Merge duplicate imports from same module


### Strings

- Use single quotes
- Use template literals when interpolation is needed


### Promises

- No `forEach(async () => ...)`. Prefer `for...of` with `await`.
- No floating promises: require `await` or explicit `.catch()`
  - Exception allowed for promises folloing void (void doThing())


### Line Length & Wrapping

- 120 characters
- Chained calls (`a.b().c()`) break after `.`
- Conditionals break and indent before `?` and `:`
- `if` conditions should not nest
- In `if/else`, `else` breaks after the closing `if` curly brace


### Comments

- Enforce a space after `//`
- Block comments only for documentation, not inline disabling
- No JSDoc comments; informational comments only


### Errors

- Error-first: always rethrow the original error or attach the cause (`new Error('msg', { cause: err })`)


### Logging

- No `console.log` in library code


### Architectural Rules

- No singleton exports
- No inline export of objects



## Technology
- @babel/parser
- Custom AST printer
- Built on Node 20.16.0

