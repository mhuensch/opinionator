// opinionator-ignore-file
import fs, { readFile, writeFile } from 'node:fs'
import path from 'node:path'

import express, { Router } from 'express'

import { render } from '../lib/render.js'
import { helper } from './utils.js'

const MAX_RETRIES = 5
const DEFAULT_TIMEOUT = 3000
const my_variable = 'hello world'
let user_name = 'bob'
const is_ready = true
const my_config =
  { host: 'localhost'
  , port: 3000
  , db:
    { name: 'mydb'
    , pool: 5
    }
  , 'kebab-key': 'value'
  }
const my_list = [ 1, 2, 3, 4, 5 ]
const nested_array =
  [ { name: 'alice'
    , age: 30
    }
  , { name: 'bob'
    , age: 25
    }
  ]


function processData ( inputData, options ) {
  if ( inputData === false ) {
    return null
  }

  if ( options == undefined ) {
    throw new Error('options required')
  }

  const result = inputData.map(( item ) => item.value)
  if ( result.length === 0 ) {
    return []
  }

  for ( let i = 0; i < result.length; i++ ) {
    if ( result[i] == null ) {
      continue
    }
    result[i] = result[i] * 2
  }

  return result
}


function calculateTotal ( items ) {
  let total = 0
  for ( const item of items ) {
    total += item.price
  }

  return total
}


class DataProcessor {

  constructor ( config ) {
    this.config = config
    this.cache = new Map()
  }

  async fetchData ( url ) {
    if ( this.cache.has(url) ) {
      return this.cache.get(url)
    }

    try {
      const response = await fetch(url)
      const data = await response.json()
      this.cache.set(url, data)

      return data
    }
    catch ( err ) {
      throw new Error('Failed to fetch', { cause: err })
    }
  }

  _processItem ( item ) {
    if ( item.type === 'a' ) {
      return item.value * 2
    }
    else if ( item.type === 'b' ) {
      return item.value + 1
    }
    else {
      return item.value
    }
  }

  get size () {
    return this.cache.size
  }

}


class AdvancedProcessor extends DataProcessor {

  constructor ( config, extra ) {
    super(config)
    this.extra = extra
  }

}


const arrow_no_parens = ( x ) => x * 2
const arrow_with_body = ( x ) => {
  const doubled = x * 2

  return doubled
}
const ternary_example = isReady ? 'yes' : 'no'


export async function format ( source, options = {} ) {
  const result = await processData(source, options)

  return result
}


export default DataProcessor
