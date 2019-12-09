/*jshint -W030*/
/*jshint -W061*/
import log from '../log'
import { Indexes } from '../indexes'

export default (indexes = {}, settings = {}) => {
  const { debug } = settings || false

  let indexesArray = !Array.isArray(indexes)
  ? Object.keys(indexes).map(val => {
    indexes[val].name = indexes[val].name || val
    indexes[val].params = indexes[val].params || {}
    indexes[val].params.name = indexes[val].params.name || val
    return indexes[val]
  })
  : indexes.map(str => {
    str.params = str.params || {}
    str.params.name = str.params.name || str.name
    return src
  })

  debug && log('Structure - indexes')

  const promises = indexesArray.map(async index => {
    debug && log(`Structure: ${index.name} - start`)
    const { Map, Index, Lambda, Let, If, Select, Var, Exists, Abort, Not, Get } = settings.q
    return await settings.source.query(
      Map(
        [ index ],
        Lambda(
          'json',
          Let(
            {
              name:       Select(['name'], Var('json')),
              indexRef:   Index(Var('name')),
              exist:      Exists(Var('indexRef')),
              index:      Get(Var('indexRef')),
              sourceRef:  Get(Select(['source'], Var('index'))),
              source:     Select(['name'], Var('sourceRef'))
            },
            If(
              Not(Var('exist')),
              Abort('No index in source DB'),
              {
                source:Var('source'),
                index: Var('index')
              }
            )
          )
        )
      )
    )

    .then(async res => {
      debug && log(`Structure: ${index.name} - transfer`)
      res = res[0]
      const { terms, values, data, unique, serialized } = res.index
      const targetIndex = [{
        name: res.index.name,
        create: index.create,
        update: index.update,
        params: {
          name: res.index.name,
          source: res.source,
          data: index.params.data || data,
          terms,
          values,
          unique,
          serialized
        }
      }]
      return await Indexes(targetIndex, settings)

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
    debug && log(`Indexes - done`)
    return res
  })

  .catch(err => console.log('Promises all transfer indexes :', err))
}

