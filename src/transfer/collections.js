/*jshint -W030*/
/*jshint -W061*/
import log from '../log'
import { Collections } from '../collections'
import { Indexes as indexes } from '../indexes'

export default (collections = {}, settings = {}) => {
  const { debug } = settings || false

  let collectionsArray = !Array.isArray(collections)
  ? Object.keys(collections).map(val => {
    collections[val].name = collections[val].name || val
    collections[val].params = collections[val].params || {}
    collections[val].params.name = collections[val].params.name || val
    return collections[val]
  })
  : collections.map(str => {
    str.params = str.params || {}
    str.params.name = str.params.name || str.name
    return src
  })

  debug && log('Structure - Collections')

  const promises = collectionsArray.map(async collection => {
    debug && log(`Structure: ${collection.name} - start`)

    const { Map, Paginate, Indexes, Get, Lambda, Let, If, Select, Var, Exists, Abort, Not, Equals, Collection, IsNull, Filter } = settings.q

    return await settings.source.query(
      Map(
        [collection],
        Lambda(
          'json',
          Let(
            {
              indexes:    Select(['indexes'], Var('json'), true),
              name:       Select(['name'], Var('json')),
              collection: Collection(Var('name')),
              exist:      Exists(Var('collection'))
            },
            If(
              Not(Var('exist')),
              Abort('No collection in source DB'),
              Let({
                collection: Var('collection'),
                indexes: If(
                  Var('indexes'),
                  Map(Paginate(Indexes()),
                    Lambda('index',
                      Let({
                        source: Select(['source'], Get(Var('index')))
                      },
                        If(
                          Equals(Var('source'), Collection(Var('name'))),
                          Get(Var('index')),
                          null
                        )
                      )
                    )
                  ),
                  []
                )
              }, {
                collection: Get(Var('collection')),
                indexes: Filter(Var('indexes'),
                  Lambda('index', Not(IsNull(Var('index'))))
                )
              })
            )
          )
        )
      )
    )

    .then(async res => {
      debug && log(`Structure: ${collection.name} - transfer`)
      res = res[0]
      const targetCollection = [{
        name: res.collection.name,
        create: collection.create,
        update: collection.update,
        params: {
          name: res.collection.name,
          permissions: collection.permissions
            ? res.collection.permissions || {}
            : {},
          data: collection.params.data || res.collection.data,
          history_days: res.collection.history_days
        }
      }]

      return await Collections(targetCollection, settings)

      .then(result => {
        // console.log('res.indexes :', res.indexes);
        const indexesArray = res.indexes && res.indexes.data
          ? res.indexes.data.map(index => {
            const { name , terms = [], serialized, data, unique , values = [] } = index
            return {
              create: collection.create,
              update: collection.update,
              name,
              params: {
                name,
                terms,
                serialized,
                source: res.collection.params.name,
                data,
                unique,
                values
              }
            }
          })
          : []

        return {
          indexes: indexesArray,
          collection: result
        }
      })
      .catch(err => {
        // console.log('err :', err);
      })
    })

    .then(res => {

      return indexes(res.indexes, settings)
      .then(result => {
        debug && log(`Structure: ${collection.name} - done`)
        return {
          [collection.name]: {
            collection: res.collection,
            indexes: result
          }
        }
      })
    })

    .then(result => {
      return result
    })

    .catch(err => {
      debug && err.requestResult && JSON.parse(err.requestResult.responseRaw)

      .errors.map(error =>
          log(`${collection.name}: ${error.description}`, null,
            { error: true })
      )

    })
  })

  return Promise.all(promises)

  .then(res => {

    debug && log(`Collections - done`)
    return res
  })

  .catch(err => console.log('Promises all transfer Collections :', err))
}

