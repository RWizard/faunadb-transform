/*jshint -W030*/
/*jshint -W061*/
import log from './log'
import fauna from './fauna'

export const Indexes = async (indexes, settings = {}) => {
  const { debug } = settings || false
  let indexesArray = !Array.isArray(indexes)
  ? Object.keys(indexes).map(val => {
    indexes[val].name = indexes[val].name || val
    indexes[val].params = indexes[val].params || {}
    indexes[val].params.name = indexes[val].params.name || val
    return indexes[val]
  })
  : indexes.map(index => {
    index.params = index.params || {}
    index.params.name = index.params.name || index.name
    return index
  })

  debug && log('Indexes')

  const promises = indexesArray.map(async index => {
    debug && log("Index " + index.name + " - start")
    const { Map, Lambda, Var, CreateIndex, Collection, Let, If, And, Not, Or, Exists, Index, Do, Abort, Delete, Select, Update, Concat } = settings.q

    return await settings.target.query(
      Map(
        [index],
        Lambda(
          'index',
          Let(
            {
              update: Select(['update'], Var('index'), true),
              remove: Select(['remove'], Var('index'), false),
              params_update: {
                unique: Select(['params', 'unique'], Var('index'), false),
                name: Select(['params', 'name'], Var('index')),
                data: Select(['params', 'data'], Var('index'), {}),
                permissions: Select(['params', 'permissions'], Var('index'), {}),
                serialized: Select(['params', 'serialized'], Var('index'), false)
              },
              params: {
                source: Collection(Select(['params', 'source'], Var('index'), null)),
                unique: Select(['params', 'unique'], Var('index'), false),
                serialized: Select(['params', 'serialized'], Var('index'), false),
                permissions: Select(['params', 'permissions'], Var('index'), {}),
                data: Select(['params', 'data'], Var('index'), {}),
                name: Select(['params', 'name'], Var('index')),
                terms: Select(['params', 'terms'], Var('index'), null),
                values: Select(['params', 'values'], Var('index'), null)
              },
              name: Select(['name'], Var('index')),
              exist: Exists(Index(Var('name'))),
              recreate: If(
                  And(Select(['recreate'], Var('index'), false), Var('exist')),
                  Do(
                    Update(Index(Var('name')), {name: Concat([Var('name'), '_old'], '')}),
                    true),
                  false
                  ),
              create: If(Var('recreate'), true, Select(['create'], Var('index'), true))
            },
            If(
              Var('remove'),
              If(
                Var('exist'),
                Delete(Index(Var('name'))),
                Abort('No index for remove')
              ),
              If(
                And(Var('create'), Or(Not(Var('exist')), Var('recreate'))),
                CreateIndex(Var('params')),
                If(
                  And(Var('update'), Var('exist')),
                  Update(Index(Var('name')), Var('params_update')),
                  Abort('No actions for index')
                )
              )
            )
          )
        )
      )
    )
    .then(res => {
      debug && log('Index', index.name, ' - done')
      return res
    })
    .catch(err => {
      debug && JSON.parse(err.requestResult.responseRaw)

      .errors.map(error =>
          log(`${index.name}: ${error.description}`, null,
            { error: true })
      )
    })
  })
  return Promise.all(promises)
  .then(res => {
    debug && log(`Indexes - done`)
    return {'indexes': res}
  })
  .catch(err => console.log('Promises all Indexes :', err))
}

export const indexes = (json, settings = {}) => {
  const { debug } = settings || false

  return fauna(settings, ['indexes'])
  .then(res => {
    return Indexes(json, res)
    .then(res => {
      return res
    })
  })
  .catch(err => {
    log(err, null, { error: true })
    debug && log('Init settings - stop')
    return err
  })
}