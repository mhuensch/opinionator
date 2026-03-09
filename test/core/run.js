import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { format } from '../../src/format.js'

const __filename = fileURLToPath ( import.meta.url )
const __dirname = dirname ( __filename )


async function runTests (  ) {
  const sample_path = join ( __dirname, 'sample.js' )
  const source = readFileSync ( sample_path, 'utf8' )
  const result = await format ( source )
  const result2 = await format ( result.code )
  if ( result2.code === result.code ) {
  }
  else {
    const lines1 = result.code.split ( '
' )
    const lines2 = result2.code.split ( '
' )
    for ( let i = 0; i < Math.max ( lines1.length, lines2.length ); i++ ) {
      if ( lines1[i] !== lines2[i] ) {
      }
    }
    process.exit ( 1 )
  }
  const ignore_file_source = '// opinionator-ignore-file
var x = 1;
var y = 2;
'
  const result3 = await format ( ignore_file_source )
  if ( result3.code === ignore_file_source && result3.changed === false ) {
  }
  else {
    process.exit ( 1 )
  }
  const ignore_next_source = 'const x = 1;
// opinionator-ignore-next
var   weird_format   =   "preserved";
const y = 2;
'
  const result4 = await format ( ignore_next_source )
  if ( result4.code.indexOf ( 'var   weird_format   =   "preserved";' ) >= 0 ) {
  }
  else {
    process.exit ( 1 )
  }
}


runTests (  ).catch ( function ( err ) {
  console.error ( 'Test failed with error:', err )
  process.exit ( 1 )
} )
