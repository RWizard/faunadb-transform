/*jshint -W030*/
/*jshint -W061*/
import log from './log'
import fauna from './fauna'

const f = require('faker');

export const Fill = async (json = {}, settings = {}) => {
  const { debug } = settings || false
  let fakerArray = !Array.isArray(json)
  ? Object.keys(json).map(val => {
    json[val].name = json[val].name || val
    json[val].params = json[val].params || {}
    return json[val]
  })
  : json
  var promises

  return await fillCollection(fakerArray)

  .then(res => {
    debug && log('Fill')

    const { Map, Lambda, Var, Create, Collection, Let, If, And, Not, IsNull, Exists, Index, Do, Abort, Paginate, Match, Delete, Select } = settings.q
    promises = res.map(async collection => {
      debug && log('Fill collection', collection.name)

      return await settings.target.query(
        Map([collection],
          Lambda('fill',
            Let({
              collection: Select(['name'], Var('fill'), null),
              records: Select(['params'], Var('fill'), []),
              clear: Select(['clear'], Var('fill'), false),
              index: Select(['index'], Var('fill'), null),
              exist: If(Not(IsNull(Var('index'))), Exists(Index(Var('index'))), false)
              },
              Do(
                If(
                  And(Var('clear'), Var('exist')),
                  Map(Paginate(Match(Index(Var('index')))),
                    Lambda('record', Delete(Var('record')))
                  ),
                  If(
                    Var('clear'),
                    Abort('No index for clear'),
                    null
                  )
                ),
                Map(Var('records'),
                  Lambda('record',
                    Create(
                      Collection(Var('collection')),
                      Var('record')
                    )
                  )
                )
              )
            )
          )
        )
      )
      .then(res => {
        debug && log('Fill collection', collection.name, ' - done')
        return {[collection.name]: res}
      })
      .catch(err => {
        debug && JSON.parse(err.requestResult.responseRaw)

        .errors.map(error =>
          log(`${collection.name}: ${error.description}`, null,
            { error: true })
        )
      })
    })
    return Promise.all(promises).then(res => {
      debug && log(`Fill - done`)
      return {'fill': res}
    })
    .catch(err => console.log('Promises all Fill :', err))
  })
}

const fillCollection = async (collections) => {
  return await collections.map(collection => {
    if (collection.locale) f.locale = collection.locale
    collection.count = collection.count || 1
      fillParams(collection.params, collection.count)
      .then(result => {
        collection.params = result
      })
    return collection
  })
}

const fillParams = async (obj, count) => {
  let fillArray = []
  obj = JSON.stringify(obj)
  for (let i = 0; i < count; i++) {
    const fakers = Array.from(obj.matchAll(/"f\./g))
    let lastIndex = 0
    let newObj = ''
    for (let i = 0; i < fakers.length; i++) {
      let point = obj.indexOf('"', fakers[i].index+1)
      const replace = obj.substring(fakers[i].index+1, point)
      newObj = newObj +
        obj.substring(lastIndex, fakers[i].index+1) +
        eval(replace)

      lastIndex = point
    }
    newObj = newObj + obj.substring(lastIndex, obj.length)
    fillArray.push(JSON.parse(newObj))
  }
  return await fillArray
}

export const fill = (json, settings = {}) => {
  const { debug } = settings || false

  return fauna(settings, ['fill'])
  .then(res => {
    return Fill(json, res)
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