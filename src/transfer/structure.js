/*jshint -W030*/
/*jshint -W061*/
import log from '../log'
import collections from './collections'
import indexes from './indexes'
import functions from './functions'
import roles from './roles'

export default async (structure = {}, settings = {}) => {
  const { debug } = settings || false

  debug && log('Structure')

  return collections(structure.collections, settings)

  .then(collections => {

    return indexes(structure.indexes, settings)

    .then(indexes => {

      return {
        collections,
        indexes
      }

    })

  })

  .then(res => {
    return functions(structure.functions, settings)

    .then(functions => {
      res.functions = functions
      return res
    })

  })

  .then(res => {
    return roles(structure.roles, settings)

    .then(roles => {
      res.roles = roles
      return res
    })

  })
}