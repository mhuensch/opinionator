# (The) Opinionator
Opinionated formatter based on my coding style for JavaScript.  Opinionator uses a deterministic AST printer (CLI) to enforce all formatting rules. It is HIGHLY opinionated and does not support any configuration. Take it or leave it. 

>The Opinionator does what is objectively correct and does not care about your feelings or preferences.

## Command Usage

**Installation**

```
npm install       # install dependencies, chmod +x index.js
npm link          # registers the 'lunohoco' command globally
npm start         # node index.js
npm test          # node index.test.js
```

**Once Linked**

Bulk Format:
```
opinionator src/
```
Or:
```
opinionator filename.js
```

Check w/o Changes:
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
- Formatting rules are applied silently (code is rewritten)
- Validation rules throw errors with actionable messages and error codes:
  - `NAMING_VIOLATION` — naming convention violations
  - `NESTING_VIOLATION` — if nested inside if
  - `TRUTHY_CHECK` — implicit truthy checks
  - `ASYNC_FOREACH` — forEach with async callback
  - `FLOATING_PROMISE` — .then() without .catch()
  - `SWALLOWED_ERROR` — catch block that doesn't rethrow or wrap with cause
- Targets ESM codebases only
- Targets .js, .mjs, .cjs file extensions
- Ignores dist/, build/, node_modules/ by default
- Reads and ignores files included in .gitignore



## Digest

### General Formatting

- 2-space indentation
- No semicolons
- No 'use strict'
- Stroustrup brace style
- Spaces inside parentheses on function definitions — `function foo ( arg )`
- No spaces inside parentheses on function calls — `foo(arg)`
- Spaces inside parentheses on control structures — `if ( x )`, `for ( ... )`
- No trailing blank line in blocks
- One blank line after class signature
- One blank line before class closing brace
- Two blank lines between top-level function/class declarations
- One blank line between top-level call expressions (e.g. `describe()` blocks)
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

Naming violations are **not auto-fixed**. The formatter throws a `NAMING_VIOLATION` error with actionable messages describing each violation and the expected name. This allows a human or AI agent to fix naming across all references rather than silently breaking code by renaming only the declaration.

| Type | Style |
|------|--------|
| Variables | snake_case |
| Functions | camelCase |
| Classes | PascalCase |
| Private methods | _camelCase |
| Module constants | SCREAMING_SNAKE_CASE |

- Prefer `const`; `let` only when reassigned; `var` is auto-converted to `const`
- Destructured names are not checked (they come from external APIs)


### Conditions

- Boolean → `=== true` / `=== false`
- No `!` for boolean negation — use `=== false` instead of `!expr`
- Existence → `== null` / `!= null`
- Explicit property existence → `=== undefined` / `!== undefined`
- Always use `===` / `!==` for all other comparisons
- No implicit truthy checks — use explicit comparisons (`=== true`, `!= null`, etc.)
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

- No `forEach(async () => ...)`. Prefer `for...of` with `await`. Throws `ASYNC_FOREACH`.
- No floating promises: `.then()` without `.catch()` throws `FLOATING_PROMISE`. Add `.catch()` or use `await` with `try/catch`.
  - Exception allowed for promises following `void` (`void doThing()`)


### Line Length & Wrapping

- 120 characters
- Chained calls (`a.b().c()`) break after `.` when exceeding line width
- Conditionals break and indent before `?` and `:`
- `if` conditions should not nest — throws `NESTING_VIOLATION` for `if` inside `if` (else-if chains and loops as separators are allowed)
- No implicit truthy checks — throws `TRUTHY_CHECK` for bare identifiers/member expressions in conditions (function calls, boolean literals, `== null`, `!= null` are allowed)
- In `if/else`, `else` breaks after the closing `if` curly brace


### Errors

- Error-first: always rethrow the original error or attach the cause (`new Error('msg', { cause: err })`). Throws `SWALLOWED_ERROR`.
- Catch blocks without a parameter are allowed (intentionally ignoring the error)


### Logging

- `console.log` calls are automatically removed


### Architectural Rules (Planned)

- No singleton exports
- No inline export of objects



## Technology
- @babel/parser
- Custom AST printer
- Built on Node 20.16.0