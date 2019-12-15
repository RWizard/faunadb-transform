/*jshint -W030*/
/*jshint -W061*/
import log from '../log'

export default async (data = [], settings = {}) => {
  const { debug } = settings || false
  debug && log('Data - Simple')
  const { Map, Paginate, Lambda, Var, Delete, Match, Index, Let, Exists, If, Abort } = settings.q
  const promises = data.map(async d => {
    debug && log('Transfer data -', d.name)

    if (d.clear) {
      return await settings.target.query(
        Map(
          [d.params.index],
          Lambda('name',
            Let(
              {
                index: Index(Var('name')),
                exist: Exists(Var('index'))
              },
              If(
                Var('exist'),
                Map(Paginate(Match(Var('index'))),Lambda('ref', Delete(Var('ref')))),
                Abort('Not found index for clear in target DB')
              )
            )
          )
        )
      )
      .then(result => {
        return transferFromSource(d, settings)
      })
      .catch(err => {
        debug && err.requestResult && JSON.parse(err.requestResult.responseRaw)

        .errors.map(error =>
            log(`${d.params.index}: ${error.description}`, null,
              { error: true })
        )

      })
    } else {
      return transferFromSource(d, settings)
    }

  })

  return Promise.all(promises)

  .then(res => {
    debug && log(`Transfer simple data - done`)
    return res
  })

  .catch(err => console.log('Promises all transfer data simple :', err))
}

const transferFromSource = async (data, settings) => {
  const { debug } = settings || false
  const source = data.params
  const { Map, Paginate, Lambda, Var, Match, Index, Select, Exists, Let, Not, Abort, Ref, Collection, If, Get, Or } = settings.q
  return await settings.source.query(
    Map(
      [data],
      Lambda(
        'json',
        Let(
          {
            name:       Select(['name'], Var('json')),
            index:      Index(Select(['index'], Var('json'))),
            collection: Collection(Select(['name'], Var('json'))),
            after:      Select(['after'], Var('json'), 0),
            size:       Select(['size'], Var('json'), 100),
            exist:      Exists(Var('index')),
            existCollection: Exists(Var('collection'))
          },
          If(
            Or(Not(Var('exist')), Not(Var('existCollection'))),
            Abort('No found collection or index in source DB'),
            Let(
              {
                page: Paginate(Match(Var('index')),
                        {
                          after: [Ref(Collection(Var('name')),Var('after'))],
                          size: Var('size')
                        }
                      ),
                after: Select(['after', 0], Var('page'), null),
                data: Select(['data'], Var('page'))
              },
              {
                after: Select(['id'],Var('after'), null),
                data: Map(Var('data'),
                  Lambda('ref',
                    Select(['data'], Get(Var('ref')))
                  )
                )
              }
            )
          )
        )
      )
    )
  )

  .then(async page => {
    page = page[0]
    return await transferToTarget(source, page.data, settings)

    .then(async result => {
      if (page.after) {
        data.after = page.after
        return await transferFromSource(data, settings)
        .then(transfer => {
          return transfer
        })
      } else {
        return result
      }
    })
  })

  .catch(err => {
    debug && err.requestResult && JSON.parse(err.requestResult.responseRaw)

    .errors.map(error =>
        log(`${data.name}: ${error.description}`, null,
          { error: true })
    )

  })
}

const transferToTarget = async (source, data, settings) => {
  const { debug } = settings || false

  const { Map, Lambda, Var, Create, Select, Let, Abort, Collection, If, Exists } = settings.q
  return await settings.target.query(
    Map(
      [{
        source: source,
        data: data
      }],
      Lambda(
        'obj',
        Let(
          {
            collection: Collection(Select(['source', 'name'], Var('obj'))),
            data: Select(['data'], Var('obj')),
            exist: Exists(Var('collection'))
          },
          If(
            Var('exist'),
            Map(
              Var('data'),
              Lambda('record',
                Create(Var('collection'), { data: Var('record') })
              )
            ),
            Abort('No found collection in target DB')
          )
        )
      )
    )
  )
  .catch(err => {
    debug && err.requestResult && JSON.parse(err.requestResult.responseRaw)

    .errors.map(error =>
        log(`${source.name}: ${error.description}`, null,
          { error: true })
    )

  })
}