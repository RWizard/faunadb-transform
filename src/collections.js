/*jshint -W030*/
/*jshint -W061*/
import log from './log'
import fauna from './fauna'
import faunadb from 'faunadb'

export const Collections = async (collections, settings = {}) => {
  const { debug } = settings || false
  let collectionsArray = !Array.isArray(collections)
  ? Object.keys(collections).map(val => {
    collections[val].name = collections[val].name || val
    collections[val].params = collections[val].params || {}
    collections[val].params.name = collections[val].params.name || val
    return collections[val]
  })
  : collections.map(collection => {
    collection.params = collection.params || {}
    collection.params.name = collection.params.name || collection.name
    return collection
  })
  debug && log('Collections')
  const { Map, CreateCollection, Lambda, Let, If, Select, Var, Exists, Delete, Update, Abort, Not, And, Collection } = settings.q
  collectionsArray.map(async collection => {
    debug && await log(`Collection: ${collection.name} - start`)
    return await settings.target.query(
      Map(
          [collection],
          Lambda(
            'collection',
            Let(
              {
                create: Select(['create'], Var('collection'), true),
                update: Select(['update'], Var('collection'), true),
                remove: Select(['remove'], Var('collection'), false),
                params: Select(['params'], Var('collection')),
                name: Select(['name'], Var('collection')),
                exist: Exists(Collection(Var('name')))
              },
              If(Var('remove'),
                If(Var('exist'),
                  Delete(Collection(Var('name'))),
                  Abort('No collection for remove')
                ),
                If(And(Var('create'), Not(Var('exist'))),
                  CreateCollection(Var('params')),
                  If(And(Var('update'), Var('exist')),
                    Update(Collection(Var('name')), Var('params')),
                    Abort('No actions for collection')
                  )
                )
              )
            )
          )
        )
      )

      .then(result =>
        debug && log(`Collection: ${collection.name} - done`)
      )

      .catch(err => {
        debug && JSON.parse(err.requestResult.responseRaw)

        .errors.map(error =>
            log(`${collection.name}: ${error.description}`, null,
              { error: true })
        )

      })
  })


}

export const collections = (json, settings = {}) => {
  const { debug } = settings || false

  const keys = Object.keys(json)
    fauna(settings, keys)
    .then(res => Collections(json, res))
    .catch(err => {
      log(err, null, { error: true })
      debug && log('Init settings - stop')
      return err
    })
}