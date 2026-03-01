const NL = '\n'
const items =
  [ 'assert'
  , 'buffer'
  , 'child_process'
  , 'cluster'
  , 'console'
  , 'constants'
  , 'crypto'
  , 'dgram'
  , 'dns'
  , 'domain'
  , 'events'
  , 'fs'
  , 'http'
  , 'http2'
  , 'https'
  , 'module'
  , 'net'
  , 'os'
  , 'path'
  , 'perf_hooks'
  , 'process'
  , 'punycode'
  , 'querystring'
  , 'readline'
  , 'repl'
  , 'stream'
  , 'string_decoder'
  , 'sys'
  , 'timers'
  , 'tls'
  , 'trace_events'
  , 'tty'
  , 'url'
  , 'util'
  , 'v8'
  , 'vm'
  , 'wasi'
  , 'worker_threads'
  , 'zlib'
  , 'test'
  , 'node:test'
  ]
const BUILTIN_MODULES = new Set( items )
const MAX_LINE_LENGTH = 120
const INDENT = '  '
const items2 =
  [ 'break'
  , 'case'
  , 'catch'
  , 'continue'
  , 'debugger'
  , 'default'
  , 'delete'
  , 'do'
  , 'else'
  , 'finally'
  , 'for'
  , 'function'
  , 'if'
  , 'in'
  , 'instanceof'
  , 'new'
  , 'return'
  , 'switch'
  , 'this'
  , 'throw'
  , 'try'
  , 'typeof'
  , 'var'
  , 'void'
  , 'while'
  , 'with'
  , 'class'
  , 'const'
  , 'enum'
  , 'export'
  , 'extends'
  , 'import'
  , 'super'
  , 'implements'
  , 'interface'
  , 'let'
  , 'package'
  , 'private'
  , 'protected'
  , 'public'
  , 'static'
  , 'yield'
  , 'await'
  , 'async'
  ]
const RESERVED_WORDS = new Set( items2 )


export function print ( ast ) {
  const printer = new Printer ()

  return printer.printProgram( ast )
}


class Printer {

  constructor () {
    this.depth = 0
    this.output = ''
    this.warnings = []
  }

  indent () {
    return INDENT.repeat( this.depth )
  }

  emit ( str ) {
    this.output += str
  }

  emitLine ( str ) {
    if ( str === undefined ) {
      str = ''
    }

    if ( str ) {
      this.emit( this.indent() + str + NL )
    }
    else {
      this.emit( NL )
    }
  }

  warn ( msg ) {
    this.warnings.push( msg )
  }

  printProgram ( ast ) {
    const body = ast.program ? ast.program.body : ast.body
    const sorted_body = this.sortImports( body )
    this.printStatementList( sorted_body, true )
    this.output = this.output.replace( /\n{2,}$/, NL )
    if ( this.output.endsWith( NL ) === false ) {
      this.output += NL
    }
    const result =
      { code: this.output
      , warnings: this.warnings
      }

    return result
  }

  sortImports ( body ) {
    const imports = []
    const rest = []
    let collecting_imports = true
    for ( const node of body ) {
      if ( collecting_imports && node.type === 'ImportDeclaration' ) {
        imports.push( node )
      }
      else {
        collecting_imports = false
        rest.push( node )
      }
    }

    if ( imports.length === 0 ) {
      return body
    }

    const merged = this.mergeImports( imports )
    const builtins = []
    const external = []
    const internal = []
    for ( const imp of merged ) {
      const source = imp.source.value
      if ( source.startsWith( 'node:' ) || BUILTIN_MODULES.has( source ) ) {
        builtins.push( imp )
      }
      else if ( source.startsWith( '.' ) || source.startsWith( '/' ) ) {
        internal.push( imp )
      }
      else {
        external.push( imp )
      }
    }
    const sort_fn = ( a, b ) => a.source.value.localeCompare( b.source.value )
    builtins.sort( sort_fn )
    external.sort( sort_fn )
    internal.sort( sort_fn )
    const sorted = []
    if ( builtins.length > 0 ) {
      sorted.push( ...builtins )
      sorted.push( 'BLANK' )
    }

    if ( external.length > 0 ) {
      sorted.push( ...external )
      sorted.push( 'BLANK' )
    }

    if ( internal.length > 0 ) {
      sorted.push( ...internal )
      sorted.push( 'BLANK' )
    }

    if ( sorted.length > 0 && sorted[sorted.length - 1] === 'BLANK' ) {
      sorted.pop()
    }

    return sorted.concat( rest )
  }

  mergeImports ( imports ) {
    const by_source = new Map ()
    for ( const imp of imports ) {
      const key = imp.source.value
      if ( by_source.has( key ) === false ) {
        by_source.set( key, { node: imp, specifiers: imp.specifiers.slice() } )
      }
      else {
        const existing = by_source.get( key )
        existing.specifiers.push( ...imp.specifiers )
      }
    }
    const result = []
    for ( const entry of by_source.values() ) {
      entry.node.specifiers = entry.specifiers
      result.push( entry.node )
    }

    return result
  }

  printStatementList ( stmts, is_top_level ) {
    if ( is_top_level === undefined ) {
      is_top_level = false
    }
    let prev_type = null
    let prev_was_import = false
    for ( let i = 0; i < stmts.length; i++ ) {
      const stmt = stmts[i]
      if ( stmt === 'BLANK' ) {
        this.emitLine()
        prev_was_import = false
        continue
      }

      if ( this.isUseStrict( stmt ) ) {
        continue
      }
      const curr_is_import = stmt.type === 'ImportDeclaration'
      if ( prev_type !== null && prev_was_import === false && curr_is_import === false ) {
        if ( is_top_level && this.isTopLevelFunctionLike( stmt ) && prev_type !== null ) {
          this.emitLine()
          this.emitLine()
        }
        else if ( is_top_level && this.isTopLevelFunctionLike( stmts[this.findPrevIndex( stmts, i )] ) ) {
          this.emitLine()
          this.emitLine()
        }
        else if ( this.needsBlankLineBefore( stmt, stmts, i ) ) {
          this.emitLine()
        }
      }

      if ( prev_was_import && curr_is_import === false ) {
        this.emitLine()
      }
      prev_type = stmt.type
      prev_was_import = curr_is_import
      this.printStatement( stmt )
    }
  }

  findPrevIndex ( stmts, i ) {
    for ( let j = i - 1; j >= 0; j-- ) {
      if ( stmts[j] !== 'BLANK' && this.isUseStrict( stmts[j] ) === false ) {
        return j
      }
    }

    return -1
  }

  isTopLevelFunctionLike ( node ) {
    if ( node === false ) {
      return false
    }

    if ( node.type === 'FunctionDeclaration' ) {
      return true
    }

    if ( node.type === 'ClassDeclaration' ) {
      return true
    }

    if ( node.type === 'ExportNamedDeclaration' && node.declaration ) {
      return this.isTopLevelFunctionLike( node.declaration )
    }

    if ( node.type === 'ExportDefaultDeclaration' && node.declaration ) {
      return this.isTopLevelFunctionLike( node.declaration )
    }

    return false
  }

  needsBlankLineBefore ( node, stmts, idx ) {
    if ( node.type === 'ReturnStatement' ) {
      const real_stmts = stmts.filter( function ( s ) {
        return s !== 'BLANK'
      } )

      return real_stmts.length > 1
    }

    if ( idx > 0 ) {
      const prev_idx = this.findPrevIndex( stmts, idx )
      if ( prev_idx >= 0 ) {
        const prev = stmts[prev_idx]
        if ( this.isBlockStatement( node ) && this.isBlockStatement( prev ) ) {
          return true
        }

        if ( this.isGuardCheck( prev ) && this.isGuardCheck( node ) === false ) {
          return true
        }
      }
    }

    return false
  }

  isBlockStatement ( node ) {
    const block_types =
      [ 'IfStatement'
      , 'ForStatement'
      , 'ForInStatement'
      , 'ForOfStatement'
      , 'WhileStatement'
      , 'DoWhileStatement'
      , 'TryStatement'
      , 'SwitchStatement'
      ]

    return block_types.indexOf( node.type ) >= 0
  }

  isGuardCheck ( node ) {
    if ( node.type === 'IfStatement' ) {
      const consequent = node.consequent
      if ( consequent.type === 'BlockStatement' ) {
        const body = consequent.body
        if ( body.length === 1 ) {
          const single = body[0]
          if ( single.type === 'ReturnStatement' || single.type === 'ThrowStatement' ) {
            return true
          }
        }
      }

      if ( consequent.type === 'ReturnStatement' || consequent.type === 'ThrowStatement' ) {
        return true
      }
    }

    return false
  }

  isUseStrict ( node ) {
    if ( node.type === 'ExpressionStatement' ) {
      const expr = node.expression
      if ( expr.type === 'StringLiteral' && expr.value === 'use strict' ) {
        return true
      }

      if ( expr.type === 'Literal' && expr.value === 'use strict' ) {
        return true
      }

      if ( expr.type === 'DirectiveLiteral' && expr.value === 'use strict' ) {
        return true
      }
    }

    if ( node.type === 'Directive' ) {
      if ( node.value && node.value.value === 'use strict' ) {
        return true
      }
    }

    return false
  }

  printStatement ( node ) {
    switch ( node.type ) {
    case 'ImportDeclaration':
      this.printImportDeclaration( node )
      break
    case 'ExportNamedDeclaration':
      this.printExportNamedDeclaration( node )
      break
    case 'ExportDefaultDeclaration':
      this.printExportDefaultDeclaration( node )
      break
    case 'ExportAllDeclaration':
      this.printExportAllDeclaration( node )
      break
    case 'VariableDeclaration':
      this.printVariableDeclaration( node )
      break
    case 'FunctionDeclaration':
      this.printFunctionDeclaration( node )
      break
    case 'ClassDeclaration':
      this.printClassDeclaration( node )
      break
    case 'IfStatement':
      this.printIfStatement( node )
      break
    case 'ForStatement':
      this.printForStatement( node )
      break
    case 'ForInStatement':
      this.printForInStatement( node )
      break
    case 'ForOfStatement':
      this.printForOfStatement( node )
      break
    case 'WhileStatement':
      this.printWhileStatement( node )
      break
    case 'DoWhileStatement':
      this.printDoWhileStatement( node )
      break
    case 'SwitchStatement':
      this.printSwitchStatement( node )
      break
    case 'ReturnStatement':
      this.printReturnStatement( node )
      break
    case 'ThrowStatement':
      this.printThrowStatement( node )
      break
    case 'TryStatement':
      this.printTryStatement( node )
      break
    case 'ExpressionStatement':
      this.printExpressionStatement( node )
      break
    case 'BlockStatement':
      this.printBlockBody( node.body )
      break
    case 'BreakStatement':
      this.printBreakStatement( node )
      break
    case 'ContinueStatement':
      this.printContinueStatement( node )
      break
    case 'LabeledStatement':
      this.printLabeledStatement( node )
      break
    case 'EmptyStatement':
      break
    case 'DebuggerStatement':
      this.emitLine( 'debugger' )
      break
    default:
      this.emitLine( this.printExpression( node ) )
      break
    }
  }

  printImportDeclaration ( node ) {
    const source = this.normalizeImportSource( node.source.value )
    const specifiers = node.specifiers || []
    if ( specifiers.length === 0 ) {
      this.emitLine( 'import \'' + source + '\'' )

      return
    }
    const default_spec = specifiers.find( function ( s ) {
      return s.type === 'ImportDefaultSpecifier'
    } )
    const namespace_spec = specifiers.find( function ( s ) {
      return s.type === 'ImportNamespaceSpecifier'
    } )
    const named_specs = specifiers.filter( function ( s ) {
      return s.type === 'ImportSpecifier'
    } ).sort( function ( a, b ) {
      const a_name = a.imported.name || a.imported.value
      const b_name = b.imported.name || b.imported.value

      return a_name.localeCompare( b_name )
    } )
    const parts = []
    if ( default_spec ) {
      parts.push( default_spec.local.name )
    }

    if ( namespace_spec ) {
      parts.push( '* as ' + namespace_spec.local.name )
    }

    if ( named_specs.length > 0 ) {
      const named_parts = named_specs.map( function ( s ) {
        const imported = s.imported.name || s.imported.value
        const local = s.local.name
        if ( imported !== local ) {
          return imported + ' as ' + local
        }

        return imported
      } )
      parts.push( '{ ' + named_parts.join( ', ' ) + ' }' )
    }
    this.emitLine( 'import ' + parts.join( ', ' ) + ' from \'' + source + '\'' )
  }

  normalizeImportSource ( source ) {
    if ( BUILTIN_MODULES.has( source ) && source.startsWith( 'node:' ) === false ) {
      return 'node:' + source
    }

    return source
  }

  printExportNamedDeclaration ( node ) {
    if ( node.declaration ) {
      this.emit( this.indent() + 'export ' )
      this.printDeclarationNoIndent( node.declaration )
    }
    else if ( node.specifiers && node.specifiers.length > 0 ) {
      const specs = node.specifiers.map( function ( s ) {
        const local = s.local.name
        const exported = s.exported.name || s.exported.value
        if ( local !== exported ) {
          return local + ' as ' + exported
        }

        return local
      } )
      if ( node.source ) {
        const source = this.normalizeImportSource( node.source.value )
        this.emitLine( 'export { ' + specs.join( ', ' ) + ' } from \'' + source + '\'' )
      }
      else {
        this.emitLine( 'export { ' + specs.join( ', ' ) + ' }' )
      }
    }
  }

  printDeclarationNoIndent ( node ) {
    if ( node.type === 'VariableDeclaration' ) {
      this.printVariableDeclaration( node, true )
    }
    else if ( node.type === 'FunctionDeclaration' ) {
      this.printFunctionDeclaration( node, true )
    }
    else if ( node.type === 'ClassDeclaration' ) {
      this.printClassDeclaration( node, true )
    }
    else {
      this.printStatement( node )
    }
  }

  printExportDefaultDeclaration ( node ) {
    const decl = node.declaration
    if ( decl.type === 'NewExpression' ) {
      this.warn( 'Singleton export detected: export default new ...' )
    }

    if ( decl.type === 'ObjectExpression' ) {
      this.warn( 'Inline object export detected: export default { ... }' )
    }

    if ( decl.type === 'FunctionDeclaration' || decl.type === 'ClassDeclaration' ) {
      this.emit( this.indent() + 'export default ' )
      if ( decl.type === 'FunctionDeclaration' ) {
        this.printFunctionDeclaration( decl, true )
      }
      else {
        this.printClassDeclaration( decl, true )
      }
    }
    else {
      const expr_str = this.printExpression( decl )
      this.emitLine( 'export default ' + expr_str )
    }
  }

  printExportAllDeclaration ( node ) {
    const source = this.normalizeImportSource( node.source.value )
    if ( node.exported ) {
      const name = node.exported.name || node.exported.value
      this.emitLine( 'export * as ' + name + ' from \'' + source + '\'' )
    }
    else {
      this.emitLine( 'export * from \'' + source + '\'' )
    }
  }

  printVariableDeclaration ( node, is_exported ) {
    if ( is_exported === undefined ) {
      is_exported = false
    }
    const kind = this.resolveVarKind( node )
    const prefix = is_exported ? '' : this.indent()
    for ( let i = 0; i < node.declarations.length; i++ ) {
      const decl = node.declarations[i]
      const name = this.printPattern( decl.id )
      const transformed_name = this.transformVariableName( name, kind, node )
      if ( decl.init === null || decl.init === undefined ) {
        this.emit( prefix + kind + ' ' + transformed_name + NL )
      }
      else if ( this.isObjectOrArrayLiteral( decl.init ) && this.isEmptyCollection( decl.init ) === false ) {
        if ( decl.init.type === 'ArrayExpression' && this.isSimpleArray( decl.init ) ) {
          const inline_str = this.printExpression( decl.init )
          const inline_line = kind + ' ' + transformed_name + ' = ' + inline_str
          if ( inline_str.indexOf( NL ) < 0 && inline_line.length + this.depth * 2 <= MAX_LINE_LENGTH ) {
            this.emit( prefix + inline_line + NL )
          }
          else {
            const obj_str = this.printElmStyleValue( decl.init )
            this.emit( prefix + kind + ' ' + transformed_name + ' =' + NL )
            this.depth++
            const lines = obj_str.split( NL )
            for ( const line of lines ) {
              this.emitLine( line )
            }
            this.depth--
          }
        }
        else {
          const obj_str = this.printElmStyleValue( decl.init )
          this.emit( prefix + kind + ' ' + transformed_name + ' =' + NL )
          this.depth++
          const lines = obj_str.split( NL )
          for ( const line of lines ) {
            this.emitLine( line )
          }
          this.depth--
        }
      }
      else {
        const init_str = this.printExpression( decl.init )
        const full_line = kind + ' ' + transformed_name + ' = ' + init_str
        this.emit( prefix + full_line + NL )
      }
    }
  }

  resolveVarKind ( node ) {
    if ( node.kind === 'var' ) {
      return 'const'
    }

    return node.kind
  }

  transformVariableName ( name, kind, node ) {
    if ( name.startsWith( '{' ) || name.startsWith( '[' ) ) {
      return name
    }

    if ( kind === 'const' && /^[A-Z][A-Z0-9_]*$/.test( name ) ) {
      return name
    }

    if ( kind === 'const' || kind === 'let' ) {
      if ( /^[A-Z]/.test( name ) ) {
        return name
      }

      return toSnakeCase( name )
    }

    return name
  }

  isObjectOrArrayLiteral ( node ) {
    if ( node === false ) {
      return false
    }

    return node.type === 'ObjectExpression' || node.type === 'ArrayExpression'
  }

  isEmptyCollection ( node ) {
    if ( node.type === 'ObjectExpression' ) {
      return node.properties.length === 0
    }

    if ( node.type === 'ArrayExpression' ) {
      return node.elements.length === 0
    }

    return false
  }

  isSimpleArray ( node ) {
    return node.elements.every( function ( e ) {
      return e !== null && e.type !== 'ObjectExpression' && e.type !== 'ArrayExpression'
    } )
  }

  printFunctionDeclaration ( node, no_indent ) {
    if ( no_indent === undefined ) {
      no_indent = false
    }
    const prefix = no_indent ? '' : this.indent()
    const async_str = node.async ? 'async ' : ''
    const generator_str = node.generator ? '*' : ''
    const name = node.id ? toCamelCase( node.id.name ) : ''
    const params = this.printParams( node.params )
    const params_str = params === '' ? '()' : '( ' + params + ' )'
    const head = async_str + 'function' + generator_str + ' ' + name + ' ' + params_str + ' {'
    this.emit( prefix + head + NL )
    this.depth++
    this.printBlockBody( node.body.body )
    this.depth--
    this.emitLine( '}' )
  }

  printParams ( params ) {
    if ( params.length === 0 ) {
      return ''
    }

    return params.map( ( p ) => this.printPattern( p ) ).join( ', ' )
  }

  printPattern ( node ) {
    if ( node.type === 'Identifier' ) {
      return node.name
    }

    if ( node.type === 'AssignmentPattern' ) {
      return this.printPattern( node.left ) + ' = ' + this.printExpression( node.right )
    }

    if ( node.type === 'RestElement' ) {
      return '...' + this.printPattern( node.argument )
    }

    if ( node.type === 'ObjectPattern' ) {
      const self = this
      const props = node.properties.map( function ( p ) {
        if ( p.type === 'RestElement' ) {
          return '...' + self.printPattern( p.argument )
        }

        const key = self.printPropertyKey( p )
        const val = self.printPattern( p.value )
        if ( key === val ) {
          return key
        }

        return key + ': ' + val
      } )

      return '{ ' + props.join( ', ' ) + ' }'
    }

    if ( node.type === 'ArrayPattern' ) {
      const self = this
      const elems = node.elements.map( function ( e ) {
        if ( e === null ) {
          return ''
        }

        return self.printPattern( e )
      } )

      return '[ ' + elems.join( ', ' ) + ' ]'
    }

    return this.printExpression( node )
  }

  printClassDeclaration ( node, no_indent ) {
    if ( no_indent === undefined ) {
      no_indent = false
    }
    const prefix = no_indent ? '' : this.indent()
    const name = node.id ? toPascalCase( node.id.name ) : ''
    let head = 'class ' + name
    if ( node.superClass ) {
      head += ' extends ' + this.printExpression( node.superClass )
    }
    head += ' {'
    this.emit( prefix + head + NL )
    this.depth++
    this.emitLine()
    const body = node.body.body || []
    for ( let i = 0; i < body.length; i++ ) {
      if ( i > 0 ) {
        this.emitLine()
      }
      this.printClassMember( body[i] )
    }
    this.emitLine()
    this.depth--
    this.emitLine( '}' )
  }

  printClassMember ( node ) {
    if ( node.type === 'ClassMethod' || node.type === 'ClassPrivateMethod' ) {
      this.printClassMethod( node )
    }
    else if ( node.type === 'ClassProperty' || node.type === 'ClassPrivateProperty' ) {
      this.printClassProperty( node )
    }
    else if ( node.type === 'StaticBlock' ) {
      this.emitLine( 'static {' )
      this.depth++
      this.printBlockBody( node.body )
      this.depth--
      this.emitLine( '}' )
    }
    else {
      this.emitLine( this.printExpression( node ) )
    }
  }

  printClassMethod ( node ) {
    const prefix_parts = []
    if ( node.static ) {
      prefix_parts.push( 'static' )
    }

    if ( node.async ) {
      prefix_parts.push( 'async' )
    }
    let name
    if ( node.type === 'ClassPrivateMethod' ) {
      name = '#' + node.key.id.name
    }
    else if ( node.computed ) {
      name = '[' + this.printExpression( node.key ) + ']'
    }
    else {
      name = this.printExpression( node.key )
    }

    if ( node.computed === false && node.key.type === 'Identifier' ) {
      if ( node.kind === 'constructor' ) {
        name = 'constructor'
      }
      else if ( name.startsWith( '_' ) ) {
        name = '_' + toCamelCase( name.slice( 1 ) )
      }
      else {
        name = toCamelCase( name )
      }
    }
    const generator_str = node.generator ? '*' : ''
    let method_prefix = ''
    if ( node.kind === 'get' ) {
      method_prefix = 'get '
    }
    else if ( node.kind === 'set' ) {
      method_prefix = 'set '
    }
    const params = this.printParams( node.params )
    const params_str = params === '' ? '()' : '( ' + params + ' )'
    const prefix_str = prefix_parts.length > 0 ? prefix_parts.join( ' ' ) + ' ' : ''
    const head = prefix_str + method_prefix + generator_str + name + ' ' + params_str + ' {'
    this.emitLine( head )
    this.depth++
    this.printBlockBody( node.body.body )
    this.depth--
    this.emitLine( '}' )
  }

  printClassProperty ( node ) {
    const prefix_parts = []
    if ( node.static ) {
      prefix_parts.push( 'static' )
    }
    let name
    if ( node.type === 'ClassPrivateProperty' ) {
      name = '#' + node.key.id.name
    }
    else if ( node.computed ) {
      name = '[' + this.printExpression( node.key ) + ']'
    }
    else {
      name = this.printPropertyKeyRaw( node.key )
    }
    const prefix = prefix_parts.length > 0 ? prefix_parts.join( ' ' ) + ' ' : ''
    if ( node.value ) {
      const val = this.printExpression( node.value )
      this.emitLine( prefix + name + ' = ' + val )
    }
    else {
      this.emitLine( prefix + name )
    }
  }

  printBlockBody ( body ) {
    const self = this
    const stmts = body.filter( function ( s ) {
      return self.isUseStrict( s ) === false
    } )
    this.printStatementList( stmts, false )
  }

  printIfStatement ( node ) {
    const condition = this.printExpression( node.test )
    this.emitLine( 'if ( ' + condition + ' ) {' )
    this.depth++
    if ( node.consequent.type === 'BlockStatement' ) {
      this.printBlockBody( node.consequent.body )
    }
    else {
      this.printStatement( node.consequent )
    }
    this.depth--
    if ( node.alternate ) {
      if ( node.alternate.type === 'IfStatement' ) {
        this.emitLine( '}' )
        const alt_condition = this.printExpression( node.alternate.test )
        this.emitLine( 'else if ( ' + alt_condition + ' ) {' )
        this.depth++
        if ( node.alternate.consequent.type === 'BlockStatement' ) {
          this.printBlockBody( node.alternate.consequent.body )
        }
        else {
          this.printStatement( node.alternate.consequent )
        }
        this.depth--
        if ( node.alternate.alternate ) {
          this.printElseChain( node.alternate.alternate )
        }
        else {
          this.emitLine( '}' )
        }
      }
      else {
        this.emitLine( '}' )
        this.emitLine( 'else {' )
        this.depth++
        if ( node.alternate.type === 'BlockStatement' ) {
          this.printBlockBody( node.alternate.body )
        }
        else {
          this.printStatement( node.alternate )
        }
        this.depth--
        this.emitLine( '}' )
      }
    }
    else {
      this.emitLine( '}' )
    }
  }

  printElseChain ( node ) {
    if ( node.type === 'IfStatement' ) {
      this.emitLine( '}' )
      const condition = this.printExpression( node.test )
      this.emitLine( 'else if ( ' + condition + ' ) {' )
      this.depth++
      if ( node.consequent.type === 'BlockStatement' ) {
        this.printBlockBody( node.consequent.body )
      }
      else {
        this.printStatement( node.consequent )
      }
      this.depth--
      if ( node.alternate ) {
        this.printElseChain( node.alternate )
      }
      else {
        this.emitLine( '}' )
      }
    }
    else {
      this.emitLine( '}' )
      this.emitLine( 'else {' )
      this.depth++
      if ( node.type === 'BlockStatement' ) {
        this.printBlockBody( node.body )
      }
      else {
        this.printStatement( node )
      }
      this.depth--
      this.emitLine( '}' )
    }
  }

  printForStatement ( node ) {
    const init = node.init ? this.printForInit( node.init ) : ''
    const test = node.test ? this.printExpression( node.test ) : ''
    const update = node.update ? this.printExpression( node.update ) : ''
    this.emitLine( 'for ( ' + init + '; ' + test + '; ' + update + ' ) {' )
    this.depth++
    if ( node.body.type === 'BlockStatement' ) {
      this.printBlockBody( node.body.body )
    }
    else {
      this.printStatement( node.body )
    }
    this.depth--
    this.emitLine( '}' )
  }

  printForInit ( node ) {
    if ( node.type === 'VariableDeclaration' ) {
      const kind = this.resolveVarKind( node )
      const self = this
      const decls = node.declarations.map( function ( d ) {
        const name = self.printPattern( d.id )
        if ( d.init ) {
          return name + ' = ' + self.printExpression( d.init )
        }

        return name
      } )

      return kind + ' ' + decls.join( ', ' )
    }

    return this.printExpression( node )
  }

  printForInStatement ( node ) {
    const left = node.left.type === 'VariableDeclaration'
      ? this.resolveVarKind( node.left ) + ' ' + this.printPattern( node.left.declarations[0].id )
      : this.printExpression( node.left )
    const right = this.printExpression( node.right )
    this.emitLine( 'for ( ' + left + ' in ' + right + ' ) {' )
    this.depth++
    if ( node.body.type === 'BlockStatement' ) {
      this.printBlockBody( node.body.body )
    }
    else {
      this.printStatement( node.body )
    }
    this.depth--
    this.emitLine( '}' )
  }

  printForOfStatement ( node ) {
    const await_str = node.await ? 'await ' : ''
    const left = node.left.type === 'VariableDeclaration'
      ? this.resolveVarKind( node.left ) + ' ' + this.printPattern( node.left.declarations[0].id )
      : this.printExpression( node.left )
    const right = this.printExpression( node.right )
    this.emitLine( 'for ' + await_str + '( ' + left + ' of ' + right + ' ) {' )
    this.depth++
    if ( node.body.type === 'BlockStatement' ) {
      this.printBlockBody( node.body.body )
    }
    else {
      this.printStatement( node.body )
    }
    this.depth--
    this.emitLine( '}' )
  }

  printWhileStatement ( node ) {
    const condition = this.printExpression( node.test )
    this.emitLine( 'while ( ' + condition + ' ) {' )
    this.depth++
    if ( node.body.type === 'BlockStatement' ) {
      this.printBlockBody( node.body.body )
    }
    else {
      this.printStatement( node.body )
    }
    this.depth--
    this.emitLine( '}' )
  }

  printDoWhileStatement ( node ) {
    this.emitLine( 'do {' )
    this.depth++
    if ( node.body.type === 'BlockStatement' ) {
      this.printBlockBody( node.body.body )
    }
    else {
      this.printStatement( node.body )
    }
    this.depth--
    this.emitLine( '}' )
    const condition = this.printExpression( node.test )
    this.emitLine( 'while ( ' + condition + ' )' )
  }

  printSwitchStatement ( node ) {
    const discriminant = this.printExpression( node.discriminant )
    this.emitLine( 'switch ( ' + discriminant + ' ) {' )
    for ( const case_node of node.cases ) {
      if ( case_node.test ) {
        this.emitLine( 'case ' + this.printExpression( case_node.test ) + ':' )
      }
      else {
        this.emitLine( 'default:' )
      }
      this.depth++
      this.printBlockBody( case_node.consequent )
      this.depth--
    }
    this.emitLine( '}' )
  }

  printTryStatement ( node ) {
    this.emitLine( 'try {' )
    this.depth++
    this.printBlockBody( node.block.body )
    this.depth--
    if ( node.handler ) {
      const param = node.handler.param ? ' ( ' + this.printPattern( node.handler.param ) + ' )' : ''
      this.emitLine( '}' )
      this.emitLine( 'catch' + param + ' {' )
      this.depth++
      this.printBlockBody( node.handler.body.body )
      this.depth--
    }

    if ( node.finalizer ) {
      this.emitLine( '}' )
      this.emitLine( 'finally {' )
      this.depth++
      this.printBlockBody( node.finalizer.body )
      this.depth--
    }
    this.emitLine( '}' )
  }

  printReturnStatement ( node ) {
    if ( node.argument === null || node.argument === undefined ) {
      this.emitLine( 'return' )

      return
    }
    const expr = this.printExpression( node.argument )
    this.emitLine( 'return ' + expr )
  }

  printThrowStatement ( node ) {
    const expr = this.printExpression( node.argument )
    this.emitLine( 'throw ' + expr )
  }

  printExpressionStatement ( node ) {
    if ( this.isConsoleLog( node.expression ) ) {
      this.warn( 'Removed console.log call' )

      return
    }
    const expr = this.printExpression( node.expression )
    this.emitLine( expr )
  }

  isConsoleLog ( node ) {
    if ( node.type === 'CallExpression' ) {
      const callee = node.callee
      if ( callee.type === 'MemberExpression' ) {
        if ( callee.object.type === 'Identifier' && callee.object.name === 'console' ) {
          if ( callee.property.type === 'Identifier' && callee.property.name === 'log' ) {
            return true
          }
        }
      }
    }

    return false
  }

  printBreakStatement ( node ) {
    if ( node.label ) {
      this.emitLine( 'break ' + node.label.name )
    }
    else {
      this.emitLine( 'break' )
    }
  }

  printContinueStatement ( node ) {
    if ( node.label ) {
      this.emitLine( 'continue ' + node.label.name )
    }
    else {
      this.emitLine( 'continue' )
    }
  }

  printLabeledStatement ( node ) {
    this.emitLine( node.label.name + ':' )
    this.printStatement( node.body )
  }

  printExpression ( node ) {
    if ( node === false ) {
      return ''
    }

    switch ( node.type ) {
    case 'Identifier':
      return node.name
    case 'StringLiteral':
    case 'Literal':
      return this.printLiteral( node )
    case 'NumericLiteral':
      return String( node.value )
    case 'BigIntLiteral':
      return node.value + 'n'
    case 'BooleanLiteral':
      return String( node.value )
    case 'NullLiteral':
      return 'null'
    case 'RegExpLiteral':
      return '/' + node.pattern + '/' + node.flags
    case 'TemplateLiteral':
      return this.printTemplateLiteral( node )
    case 'TaggedTemplateExpression':
      return this.printExpression( node.tag ) + this.printTemplateLiteral( node.quasi )
    case 'BinaryExpression':
    case 'LogicalExpression':
      return this.printBinaryExpression( node )
    case 'UnaryExpression':
      return this.printUnaryExpression( node )
    case 'UpdateExpression':
      return this.printUpdateExpression( node )
    case 'AssignmentExpression':
      return this.printAssignmentExpression( node )
    case 'ConditionalExpression':
      return this.printConditionalExpression( node )
    case 'CallExpression':
    case 'OptionalCallExpression':
      return this.printCallExpression( node )
    case 'NewExpression':
      return this.printNewExpression( node )
    case 'MemberExpression':
    case 'OptionalMemberExpression':
      return this.printMemberExpression( node )
    case 'ArrowFunctionExpression':
      return this.printArrowFunction( node )
    case 'FunctionExpression':
      return this.printFunctionExpression( node )
    case 'ObjectExpression':
      return this.printObjectExpression( node )
    case 'ArrayExpression':
      return this.printArrayExpression( node )
    case 'SpreadElement':
      return '...' + this.printExpression( node.argument )
    case 'SequenceExpression':
      return node.expressions.map( ( e ) => this.printExpression( e ) ).join( ', ' )
    case 'YieldExpression':
      if ( node.delegate ) {
        return 'yield* ' + this.printExpression( node.argument )
      }

      return node.argument ? 'yield ' + this.printExpression( node.argument ) : 'yield'
    case 'AwaitExpression':
      return 'await ' + this.printExpression( node.argument )
    case 'ThisExpression':
      return 'this'
    case 'Super':
      return 'super'
    case 'ClassExpression':
      return this.printClassExpression( node )
    case 'MetaProperty':
      return node.meta.name + '.' + node.property.name
    case 'ParenthesizedExpression':
      return '( ' + this.printExpression( node.expression ) + ' )'
    case 'ChainExpression':
      return this.printExpression( node.expression )
    case 'ImportExpression':
      return 'import ( ' + this.printExpression( node.source ) + ' )'
    case 'Directive':
      return ''
    case 'DirectiveLiteral':
      return ''
    case 'V8IntrinsicIdentifier':
      return '%' + node.name
    default:
      return '/* UNHANDLED: ' + node.type + ' */'
    }
  }

  printLiteral ( node ) {
    if ( node.type === 'StringLiteral' || node.type === 'Literal' && typeof node.value === 'string' ) {
      const val = node.value
      const escaped = val.replace( /\\/g, '\\\\' ).replace( /'/g, '\\\'' ).replace( /\n/g, '\\n' ).replace( /\r/g, '\\r' ).replace( /\t/g, '\\t' ).replace( /\0/g, '\\0' )

      return '\'' + escaped + '\''
    }

    if ( node.type === 'Literal' ) {
      if ( node.regex ) {
        return '/' + node.regex.pattern + '/' + node.regex.flags
      }

      if ( node.bigint ) {
        return node.bigint + 'n'
      }

      return String( node.value )
    }

    if ( node.value !== undefined ) {
      return String( node.value )
    }

    return String( node.extra ? node.extra.raw : node.raw || '' )
  }

  printTemplateLiteral ( node ) {
    let result = '`'
    for ( let i = 0; i < node.quasis.length; i++ ) {
      result += node.quasis[i].value.raw
      if ( i < node.expressions.length ) {
        result += '${' + this.printExpression( node.expressions[i] ) + '}'
      }
    }
    result += '`'

    return result
  }

  printBinaryExpression ( node ) {
    const left = this.printExpression( node.left )
    const right = this.printExpression( node.right )
    let op = node.operator
    if ( op === '==' && this.isNullOrUndefined( node.right ) === false && this.isNullOrUndefined( node.left ) === false ) {
      op = '==='
    }

    if ( op === '!=' && this.isNullOrUndefined( node.right ) === false && this.isNullOrUndefined( node.left ) === false ) {
      op = '!=='
    }
    const left_str = this.needsParens( node.left, node, 'left' ) ? '( ' + left + ' )' : left
    const right_str = this.needsParens( node.right, node, 'right' ) ? '( ' + right + ' )' : right

    return left_str + ' ' + op + ' ' + right_str
  }

  isNullOrUndefined ( node ) {
    if ( node.type === 'NullLiteral' ) {
      return true
    }

    if ( node.type === 'Literal' && node.value === null ) {
      return true
    }

    if ( node.type === 'Identifier' && node.name === 'undefined' ) {
      return true
    }

    return false
  }

  needsParens ( child, parent, side ) {
    if ( child === false ) {
      return false
    }

    const child_prec = this.getPrecedence( child )
    const parent_prec = this.getPrecedence( parent )
    if ( child_prec === -1 || parent_prec === -1 ) {
      return false
    }

    if ( child_prec < parent_prec ) {
      return true
    }

    if ( child_prec === parent_prec && side === 'right' ) {
      return true
    }

    return false
  }

  getPrecedence ( node ) {
    if ( node.type === 'ConditionalExpression' ) {
      return 0
    }

    if ( node.type === 'BinaryExpression' || node.type === 'LogicalExpression' ) {
      const prec_map =
        { '||': 1
        , '??': 1
        , '&&': 2
        , '|': 3
        , '^': 4
        , '&': 5
        , '==': 6
        , '!=': 6
        , '===': 6
        , '!==': 6
        , '<': 7
        , '>': 7
        , '<=': 7
        , '>=': 7
        , 'in': 7
        , 'instanceof': 7
        , '<<': 8
        , '>>': 8
        , '>>>': 8
        , '+': 9
        , '-': 9
        , '*': 10
        , '/': 10
        , '%': 10
        , '**': 11
        }

      return prec_map[node.operator] || -1
    }

    return -1
  }

  printUnaryExpression ( node ) {
    const arg = this.printExpression( node.argument )
    const needs_parens = node.argument.type === 'BinaryExpression' || node.argument.type === 'LogicalExpression' || node.argument.type === 'ConditionalExpression' || node.argument.type === 'AssignmentExpression'
    const arg_str = needs_parens ? '( ' + arg + ' )' : arg
    if ( node.prefix ) {
      if ( node.operator === '!' ) {
        return arg_str + ' === false'
      }

      if ( node.operator === 'typeof' || node.operator === 'void' || node.operator === 'delete' ) {
        return node.operator + ' ' + arg_str
      }

      return node.operator + arg_str
    }

    return arg_str + node.operator
  }

  printUpdateExpression ( node ) {
    const arg = this.printExpression( node.argument )
    if ( node.prefix ) {
      return node.operator + arg
    }

    return arg + node.operator
  }

  printAssignmentExpression ( node ) {
    const left = this.printExpression( node.left )
    const right = this.printExpression( node.right )
    if ( this.isObjectOrArrayLiteral( node.right ) && this.isEmptyCollection( node.right ) === false ) {
      const val = this.printElmStyleValue( node.right )
      const inner_indent = this.indent() + INDENT

      return left + ' ' + node.operator + NL + inner_indent + val.split( NL ).join( NL + inner_indent )
    }

    return left + ' ' + node.operator + ' ' + right
  }

  printConditionalExpression ( node ) {
    const test = this.printExpression( node.test )
    const consequent = this.printExpression( node.consequent )
    const alternate = this.printExpression( node.alternate )
    const single_line = test + ' ? ' + consequent + ' : ' + alternate
    if ( single_line.length + this.depth * 2 <= MAX_LINE_LENGTH ) {
      return single_line
    }

    const inner_indent = this.indent() + INDENT

    return test + NL + inner_indent + '? ' + consequent + NL + inner_indent + ': ' + alternate
  }

  printCallExpression ( node ) {
    const optional = node.optional ? '?.' : ''
    const callee = this.printExpression( node.callee )
    const args = node.arguments.map( ( a ) => this.printExpression( a ) )
    const has_complex_args = node.arguments.some( ( a ) => this.isObjectOrArrayLiteral( a ) )
    if ( has_complex_args && node.arguments.length === 1 && this.isObjectOrArrayLiteral( node.arguments[0] ) ) {
      const elm_val = this.printElmStyleValue( node.arguments[0] )
      const inner_indent = this.indent() + INDENT

      return callee + optional + '(' + NL + inner_indent + elm_val.split( NL ).join( NL + inner_indent ) + NL + this.indent() + ')'
    }

    if ( node.arguments.length === 0 ) {
      return callee + optional + '()'
    }

    const args_str = args.join( ', ' )

    return callee + optional + '( ' + args_str + ' )'
  }

  printNewExpression ( node ) {
    const callee = this.printExpression( node.callee )
    if ( node.arguments.length === 0 ) {
      return 'new ' + callee + ' ()'
    }

    const args = node.arguments.map( ( a ) => this.printExpression( a ) ).join( ', ' )

    return 'new ' + callee + '( ' + args + ' )'
  }

  printMemberExpression ( node ) {
    const obj = this.printExpression( node.object )
    const needs_parens = node.object.type === 'NumericLiteral' || node.object.type === 'ConditionalExpression' || node.object.type === 'Literal' && typeof node.object.value === 'number'
    const obj_str = needs_parens ? '( ' + obj + ' )' : obj
    if ( node.computed ) {
      const prop = this.printExpression( node.property )
      const optional = node.optional ? '?.' : ''

      return obj_str + optional + '[' + prop + ']'
    }
    const prop = this.printExpression( node.property )
    const dot = node.optional ? '?.' : '.'

    return obj_str + dot + prop
  }

  printArrowFunction ( node ) {
    const async_str = node.async ? 'async ' : ''
    const params = this.printParams( node.params )
    const params_str = '( ' + params + ' )'
    if ( node.body.type === 'BlockStatement' ) {
      const saved_output = this.output
      this.output = ''
      this.depth++
      this.printBlockBody( node.body.body )
      this.depth--
      const body_str = this.output.replace( /\n$/, '' )
      this.output = saved_output

      return async_str + params_str + ' => {' + NL + body_str + NL + this.indent() + '}'
    }

    if ( this.isObjectOrArrayLiteral( node.body ) ) {
      const val = this.printElmStyleValue( node.body )
      const inner_indent = this.indent() + INDENT

      return async_str + params_str + ' =>' + NL + inner_indent + val.split( NL ).join( NL + inner_indent )
    }
    const body = this.printExpression( node.body )

    return async_str + params_str + ' => ' + body
  }

  printFunctionExpression ( node ) {
    const async_str = node.async ? 'async ' : ''
    const generator_str = node.generator ? '*' : ''
    const name = node.id ? ' ' + toCamelCase( node.id.name ) : ''
    const params = this.printParams( node.params )
    const saved_output = this.output
    this.output = ''
    this.depth++
    this.printBlockBody( node.body.body )
    this.depth--
    const body_str = this.output.replace( /\n$/, '' )
    this.output = saved_output
    const params_str = params === '' ? '()' : '( ' + params + ' )'

    return async_str + 'function' + generator_str + name + ' ' + params_str + ' {' + NL + body_str + NL + this.indent() + '}'
  }

  printObjectExpression ( node ) {
    if ( node.properties.length === 0 ) {
      return '{}'
    }

    const props = node.properties.map( ( p ) => this.printObjectProperty( p ) )
    const single_line = '{ ' + props.join( ', ' ) + ' }'
    if ( single_line.length + this.depth * 2 <= MAX_LINE_LENGTH && props.some( function ( p ) {
      return p.indexOf( NL ) >= 0
    } ) === false ) {
      return single_line
    }

    return this.printElmStyleObject( node )
  }

  printElmStyleValue ( node ) {
    if ( node.type === 'ObjectExpression' ) {
      return this.printElmStyleObject( node )
    }

    if ( node.type === 'ArrayExpression' ) {
      return this.printElmStyleArray( node )
    }

    return this.printExpression( node )
  }

  printElmStyleObject ( node ) {
    if ( node.properties.length === 0 ) {
      return '{}'
    }

    const lines = []
    for ( let i = 0; i < node.properties.length; i++ ) {
      const prop = node.properties[i]
      const prop_str = this.printObjectProperty( prop )
      const prefix = i === 0 ? '{ ' : ', '
      lines.push( prefix + prop_str )
    }
    lines.push( '}' )

    return lines.join( NL )
  }

  printElmStyleArray ( node ) {
    if ( node.elements.length === 0 ) {
      return '[]'
    }

    const all_simple = node.elements.every( function ( e ) {
      return e !== null && e.type !== 'ObjectExpression' && e.type !== 'ArrayExpression'
    } )
    if ( all_simple ) {
      const self = this
      const elems = node.elements.map( function ( e ) {
        return e === null ? '' : self.printExpression( e )
      } )
      const single_line = '[ ' + elems.join( ', ' ) + ' ]'
      if ( single_line.length + this.depth * 2 <= MAX_LINE_LENGTH ) {
        return single_line
      }
    }
    const lines = []
    for ( let i = 0; i < node.elements.length; i++ ) {
      const elem = node.elements[i]
      let elem_str
      if ( elem === null ) {
        elem_str = ''
      }
      else if ( this.isObjectOrArrayLiteral( elem ) ) {
        elem_str = this.printElmStyleValue( elem )
      }
      else {
        elem_str = this.printExpression( elem )
      }
      const prefix = i === 0 ? '[ ' : ', '
      if ( elem_str.indexOf( NL ) >= 0 ) {
        const sub_lines = elem_str.split( NL )
        lines.push( prefix + sub_lines[0] )
        for ( let j = 1; j < sub_lines.length; j++ ) {
          lines.push( '  ' + sub_lines[j] )
        }
      }
      else {
        lines.push( prefix + elem_str )
      }
    }
    lines.push( ']' )

    return lines.join( NL )
  }

  printObjectProperty ( prop ) {
    if ( prop.type === 'SpreadElement' || prop.type === 'RestElement' ) {
      return '...' + this.printExpression( prop.argument )
    }

    if ( prop.type === 'ObjectMethod' ) {
      return this.printObjectMethod( prop )
    }

    const key = this.printPropertyKey( prop )
    if ( prop.shorthand ) {
      return key
    }

    if ( this.isObjectOrArrayLiteral( prop.value ) ) {
      const nested = this.printElmStyleValue( prop.value )
      const sub_lines = nested.split( NL )
      const result_lines = [ key + ':' ]
      for ( const line of sub_lines ) {
        result_lines.push( '  ' + line )
      }

      return result_lines.join( NL )
    }
    const value = this.printExpression( prop.value )

    return key + ': ' + value
  }

  printObjectMethod ( prop ) {
    const async_str = prop.async ? 'async ' : ''
    const generator_str = prop.generator ? '*' : ''
    const key = this.printPropertyKeyRaw( prop.key )
    const params = this.printParams( prop.params )
    let method_prefix = ''
    if ( prop.kind === 'get' ) {
      method_prefix = 'get '
    }
    else if ( prop.kind === 'set' ) {
      method_prefix = 'set '
    }
    const saved_output = this.output
    this.output = ''
    this.depth++
    this.printBlockBody( prop.body.body )
    this.depth--
    const body_str = this.output.replace( /\n$/, '' )
    this.output = saved_output
    const params_str = params === '' ? '()' : '( ' + params + ' )'

    return async_str + method_prefix + generator_str + key + ' ' + params_str + ' {' + NL + body_str + NL + this.indent() + '}'
  }

  printPropertyKey ( prop ) {
    if ( prop.computed ) {
      return '[' + this.printExpression( prop.key ) + ']'
    }

    return this.printPropertyKeyRaw( prop.key )
  }

  printPropertyKeyRaw ( key ) {
    if ( key.type === 'Identifier' ) {
      return key.name
    }

    if ( key.type === 'StringLiteral' || key.type === 'Literal' && typeof key.value === 'string' ) {
      const val = key.value
      if ( this.needsQuoting( val ) ) {
        const escaped = val.replace( /\\/g, '\\\\' ).replace( /'/g, '\\\'' )

        return '\'' + escaped + '\''
      }

      return val
    }

    if ( key.type === 'NumericLiteral' || key.type === 'Literal' && typeof key.value === 'number' ) {
      return String( key.value )
    }

    return this.printExpression( key )
  }

  needsQuoting ( name ) {
    if ( /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test( name ) === false ) {
      return true
    }

    if ( RESERVED_WORDS.has( name ) ) {
      return true
    }

    return false
  }

  printArrayExpression ( node ) {
    if ( node.elements.length === 0 ) {
      return '[]'
    }

    const self = this
    const elems = node.elements.map( function ( e ) {
      if ( e === null ) {
        return ''
      }

      if ( e.type === 'SpreadElement' ) {
        return '...' + self.printExpression( e.argument )
      }

      return self.printExpression( e )
    } )
    const single_line = '[ ' + elems.join( ', ' ) + ' ]'
    if ( single_line.length + this.depth * 2 <= MAX_LINE_LENGTH && elems.some( function ( e ) {
      return e.indexOf( NL ) >= 0
    } ) === false ) {
      return single_line
    }

    return this.printElmStyleArray( node )
  }

  printClassExpression ( node ) {
    let head = 'class'
    if ( node.id ) {
      head += ' ' + toPascalCase( node.id.name )
    }

    if ( node.superClass ) {
      head += ' extends ' + this.printExpression( node.superClass )
    }
    head += ' {'
    const saved_output = this.output
    this.output = ''
    this.depth++
    this.emitLine()
    const body = node.body.body || []
    for ( let i = 0; i < body.length; i++ ) {
      if ( i > 0 ) {
        this.emitLine()
      }
      this.printClassMember( body[i] )
    }
    this.emitLine()
    this.depth--
    const body_str = this.output
    this.output = saved_output

    return head + NL + body_str + this.indent() + '}'
  }

}


function toSnakeCase ( name ) {
  if ( name === false ) {
    return name
  }

  if ( /^[a-z][a-z0-9_]*$/.test( name ) ) {
    return name
  }

  if ( /[^a-zA-Z0-9_$]/.test( name ) ) {
    return name
  }

  return name.replace( /([A-Z]+)([A-Z][a-z])/g, '$1_$2' ).replace( /([a-z0-9])([A-Z])/g, '$1_$2' ).toLowerCase()
}


function toCamelCase ( name ) {
  if ( name === false ) {
    return name
  }

  if ( /^[a-z][a-zA-Z0-9]*$/.test( name ) ) {
    return name
  }

  if ( /[^a-zA-Z0-9_$]/.test( name ) ) {
    return name
  }

  if ( name.indexOf( '_' ) >= 0 ) {
    return name.replace( /_([a-z0-9])/g, function ( _, c ) {
      return c.toUpperCase()
    } )
  }

  if ( /^[A-Z]/.test( name ) ) {
    return name[0].toLowerCase() + name.slice( 1 )
  }

  return name
}


function toPascalCase ( name ) {
  if ( name === false ) {
    return name
  }

  if ( /^[A-Z][a-zA-Z0-9]*$/.test( name ) ) {
    return name
  }

  if ( name.indexOf( '_' ) >= 0 ) {
    return name.split( '_' ).map( function ( w ) {
      return w.charAt( 0 ).toUpperCase() + w.slice( 1 ).toLowerCase()
    } ).join( '' )
  }

  return name[0].toUpperCase() + name.slice( 1 )
}
