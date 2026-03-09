// opinionator-ignore-file
import { parse as babelParse } from '@babel/parser'

export function parse ( source ) {
  const options =
    { sourceType: 'module'
    , plugins:
      [ 'jsx'
      , 'classProperties'
      , 'optionalChaining'
      , 'nullishCoalescingOperator'
      , 'objectRestSpread'
      , 'dynamicImport'
      , 'topLevelAwait'
      ]
    , allowReturnOutsideFunction: true
    , allowImportExportEverywhere: true
    , errorRecovery: false
    }

  return babelParse(source, options)
}
