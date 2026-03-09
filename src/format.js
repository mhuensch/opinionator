// opinionator-ignore-file
import { parse } from './parser.js'
import { print } from './printer.js'

const NL = '\n'
const PLACEHOLDER_PREFIX = '__opinionator_placeholder_'


export async function format ( source, options = {} ) {
  if ( shouldIgnoreFile( source ) ) {
    const ignore_result =
      { code: source
      , changed: false
      }

    return ignore_result
  }
  const preprocess = preprocessIgnoreDirectives( source )
  const modified_source = preprocess.modified_source
  const placeholders = preprocess.placeholders
  const ast = parse( modified_source )
  extractComplexCallArgs( ast )
  const result = print( ast )
  let formatted = result.code
  if ( placeholders.length > 0 ) {
    formatted = restorePlaceholders( formatted, placeholders )
  }

  const warnings = result.warnings || []
  const naming_errors = warnings.filter( ( w ) => w.startsWith( 'Naming:' ) )
  const nesting_errors = warnings.filter( ( w ) => w.startsWith( 'Nesting:' ) )
  const truthy_errors = warnings.filter( ( w ) => w.startsWith( 'Implicit truthy:' ) )
  const async_foreach_errors = warnings.filter( ( w ) => w.startsWith( 'Async forEach:' ) )
  const floating_promise_errors = warnings.filter( ( w ) => w.startsWith( 'Floating promise:' ) )
  const swallowed_error_errors = warnings.filter( ( w ) => w.startsWith( 'Swallowed error:' ) )

  if ( warnings.length > 0 ) {
    for ( const warning of warnings ) {
      process.stderr.write( 'opinionator: ' + warning + NL )
    }
  }

  const changed = formatted !== source
  const format_result =
    { code: formatted
    , changed: changed
    , warnings: warnings
    }

  if ( naming_errors.length > 0 ) {
    const err = new Error( 'Naming convention violations found:\n' + naming_errors.join( '\n' ) )
    err.code = 'NAMING_VIOLATION'
    err.result = format_result
    throw err
  }

  if ( nesting_errors.length > 0 ) {
    const err = new Error( 'Nesting violations found:\n' + nesting_errors.join( '\n' ) )
    err.code = 'NESTING_VIOLATION'
    err.result = format_result
    throw err
  }

  if ( truthy_errors.length > 0 ) {
    const err = new Error( 'Implicit truthy check violations found:\n' + truthy_errors.join( '\n' ) )
    err.code = 'TRUTHY_CHECK'
    err.result = format_result
    throw err
  }

  if ( async_foreach_errors.length > 0 ) {
    const err = new Error( 'Async forEach violations found:\n' + async_foreach_errors.join( '\n' ) )
    err.code = 'ASYNC_FOREACH'
    err.result = format_result
    throw err
  }

  if ( floating_promise_errors.length > 0 ) {
    const err = new Error( 'Floating promise violations found:\n' + floating_promise_errors.join( '\n' ) )
    err.code = 'FLOATING_PROMISE'
    err.result = format_result
    throw err
  }

  if ( swallowed_error_errors.length > 0 ) {
    const err = new Error( 'Swallowed error violations found:\n' + swallowed_error_errors.join( '\n' ) )
    err.code = 'SWALLOWED_ERROR'
    err.result = format_result
    throw err
  }

  return format_result
}


function shouldIgnoreFile ( source ) {
  const lines = source.split( NL )
  let first_code_line = 0
  if ( lines.length > 0 && lines[0].startsWith( '#!' ) ) {
    first_code_line = 1
  }

  if ( first_code_line < lines.length ) {
    const line = lines[first_code_line].trim()
    if ( line === '// opinionator-ignore-file' ) {
      return true
    }
  }

  return false
}


function preprocessIgnoreDirectives ( source ) {
  const lines = source.split( NL )
  const result_lines = lines.slice()
  const placeholders = []
  let placeholder_id = 0
  let i = 0
  while ( i < result_lines.length ) {
    const trimmed = result_lines[i].trim()
    if ( trimmed === '// opinionator-ignore-next' ) {
      let target_line = -1
      for ( let j = i + 1; j < result_lines.length; j++ ) {
        const next_trimmed = result_lines[j].trim()
        if ( next_trimmed !== '' && next_trimmed.startsWith( '//' ) === false ) {
          target_line = j
          break
        }
      }

      if ( target_line >= 0 ) {
        const original_lines = []
        for ( let k = i; k <= target_line; k++ ) {
          original_lines.push( result_lines[k] )
        }
        const id = PLACEHOLDER_PREFIX + placeholder_id + '__'
        placeholders.push(
          { id: id
          , lines: original_lines
          }
        )
        const placeholder_stmt = 'void \'' + id + '\''
        result_lines.splice( i, target_line - i + 1, placeholder_stmt )
        placeholder_id++
      }
      i++
    }
    else if ( trimmed === '// opinionator-ignore-start' ) {
      let end_line = -1
      for ( let j = i + 1; j < result_lines.length; j++ ) {
        if ( result_lines[j].trim() === '// opinionator-ignore-end' ) {
          end_line = j
          break
        }
      }

      if ( end_line >= 0 ) {
        const original_lines = []
        for ( let k = i; k <= end_line; k++ ) {
          original_lines.push( result_lines[k] )
        }
        const id = PLACEHOLDER_PREFIX + placeholder_id + '__'
        placeholders.push(
          { id: id
          , lines: original_lines
          }
        )
        const placeholder_stmt = 'void \'' + id + '\''
        result_lines.splice( i, end_line - i + 1, placeholder_stmt )
        placeholder_id++
      }
      i++
    }
    else {
      i++
    }
  }
  const info =
    { modified_source: result_lines.join( NL )
    , placeholders: placeholders
    }

  return info
}


const MAX_INLINE_LEN = 120


function estimateLen ( node ) {
  if ( node === false ) {
    return 0
  }

  switch ( node.type ) {
  case 'Identifier':
    return node.name.length
  case 'StringLiteral':
    return node.value.length + 2
  case 'Literal':
    if ( typeof node.value === 'string' ) {
      return node.value.length + 2
    }

    return String( node.value ).length
  case 'NumericLiteral':
    return String( node.value ).length
  case 'BooleanLiteral':
    return String( node.value ).length
  case 'NullLiteral':
    return 4
  case 'MemberExpression':
    return estimateLen( node.object ) + 1 + estimateLen( node.property )
  case 'NewExpression':
  case 'CallExpression':
    const callee_len = estimateLen( node.callee )
    const args_len = node.arguments.reduce( ( s, a ) => s + estimateLen( a ) + 2, 0 )

    return callee_len + 2 + args_len + 2
  case 'ObjectExpression':
    return 4 + node.properties.reduce( ( s, p ) => {
      const k = p.key?.name?.length || ( p.key?.value != null ? String( p.key.value ).length + 2 : 10 )

      return s + k + 2 + estimateLen( p.value ) + 2
    }, 0 )
  case 'ArrayExpression':
    return 4 + node.elements.reduce( ( s, e ) => s + ( e ? estimateLen( e ) : 0 ) + 2, 0 )
  default:
    return 20
  }
}


function makeIdentifier ( name ) {
  return { type: 'Identifier', name: name }
}


function makeConstDecl ( name, init ) {
  return { type: 'VariableDeclaration'
, kind: 'const'
, declarations:
  [ { type: 'VariableDeclarator'
    , id: makeIdentifier( name )
    , init: init
    }
  ]
}
}


function isComplexArg ( node ) {
  return node.type === 'ObjectExpression' || node.type === 'ArrayExpression'
}


function isCallLike ( node ) {
  return node?.type === 'CallExpression' || node?.type === 'NewExpression'
}


function getCallInfo ( stmt ) {
  if ( stmt.type === 'ReturnStatement' && isCallLike( stmt.argument ) ) {
    const s = stmt

    return { call: s.argument
, replace: ( c ) => {
      s.argument = c
    }
}
  }

  if ( stmt.type === 'ExpressionStatement' && isCallLike( stmt.expression ) ) {
    const s = stmt

    return { call: s.expression
, replace: ( c ) => {
      s.expression = c
    }
}
  }

  if ( stmt.type === 'VariableDeclaration' ) {
    for ( const decl of stmt.declarations ) {
      if ( isCallLike( decl.init ) ) {
        const d = decl

        return { call: d.init
, replace: ( c ) => {
          d.init = c
        }
}
      }
    }
  }

  return null
}


function extractFromList ( stmts, depth ) {
  let i = 0
  const counts = {}
  while ( i < stmts.length ) {
    const stmt = stmts[i]
    const info = getCallInfo( stmt )
    if ( info != null ) {
      const { call } = info
      const has_complex = call.arguments.some( isComplexArg )
      const est_len = estimateLen( call ) + depth * 2
      if ( has_complex && est_len > MAX_INLINE_LEN ) {
        const insertions = []
        for ( let j = 0; j < call.arguments.length; j++ ) {
          const arg = call.arguments[j]
          if ( isComplexArg( arg ) ) {
            const base = arg.type === 'ObjectExpression' ? 'options' : 'items'
            counts[base] = ( counts[base] || 0 ) + 1
            const name = counts[base] === 1 ? base : base + counts[base]
            insertions.push( makeConstDecl( name, arg ) )
            call.arguments[j] = makeIdentifier( name )
          }
        }

        if ( insertions.length > 0 ) {
          stmts.splice( i, 0, ...insertions )
          i += insertions.length
        }
      }
    }
    recurseStmt( stmt, depth )
    i++
  }
}


function recurseStmt ( stmt, depth ) {
  if ( stmt === false ) {
    return
  }

  if ( stmt.type === 'FunctionDeclaration' && stmt.body?.body ) {
    extractFromList( stmt.body.body, depth + 1 )
  }

  if ( stmt.type === 'ClassDeclaration' || stmt.type === 'ClassExpression' ) {
    for ( const member of stmt.body?.body || [] ) {
      if ( member.body?.body ) {
        extractFromList( member.body.body, depth + 2 )
      }
    }
  }

  if ( stmt.type === 'ExportNamedDeclaration' || stmt.type === 'ExportDefaultDeclaration' ) {
    if ( stmt.declaration ) {
      recurseStmt( stmt.declaration, depth )
    }
  }

  if ( stmt.type === 'IfStatement' ) {
    if ( stmt.consequent?.body ) {
      extractFromList( stmt.consequent.body, depth + 1 )
    }

    if ( stmt.alternate?.body ) {
      extractFromList( stmt.alternate.body, depth + 1 )
    }
  }

  if ( stmt.type === 'ForStatement' || stmt.type === 'ForOfStatement' || stmt.type === 'ForInStatement' || stmt.type === 'WhileStatement' || stmt.type === 'DoWhileStatement' ) {
    if ( stmt.body?.body ) {
      extractFromList( stmt.body.body, depth + 1 )
    }
  }

  if ( stmt.type === 'TryStatement' ) {
    if ( stmt.block?.body ) {
      extractFromList( stmt.block.body, depth + 1 )
    }

    if ( stmt.handler?.body?.body ) {
      extractFromList( stmt.handler.body.body, depth + 1 )
    }

    if ( stmt.finalizer?.body ) {
      extractFromList( stmt.finalizer.body, depth + 1 )
    }
  }
}


function extractComplexCallArgs ( ast ) {
  const body = ast.program ? ast.program.body : ast.body
  extractFromList( body, 0 )
}


function restorePlaceholders ( formatted, placeholders ) {
  const lines = formatted.split( NL )
  for ( const placeholder of placeholders ) {
    const search_str = 'void \'' + placeholder.id + '\''
    for ( let i = 0; i < lines.length; i++ ) {
      if ( lines[i].trim() === search_str ) {
        lines.splice( i, 1, ...placeholder.lines )
        break
      }
    }
  }

  return lines.join( NL )
}
