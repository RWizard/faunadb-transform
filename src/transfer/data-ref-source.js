/*jshint -W030*/
/*jshint -W061*/
import log from '../log'

export default async (data = [], settings = {}) => {
  const { debug } = settings || false

  debug && log('Data - Ref-source')
  const { Map, Paginate, Lambda, Var, Delete, Match, Index, Let, Exists, If, Abort, Query, CreateFunction, Update, ToArray, ToObject, Get, Ref, Concat, Select, IsRef, IsArray, Collection, Function, IsObject, Call, Or } = settings.q
  const { name, role, create, remove } = settings.ref
  const fnc = {
    name,
    role,
    create,
    remove,
    body: Query(
      Lambda('obj',
        Let(
          {
            data: Select(['data'], Var('obj')),
            fnc_name: Select(['name'], Var('obj')),
            isRef: IsRef(Var('data')),
            isArr: IsArray(Var('data')),
            isObj: IsObject(Var('data'))
          },
          If(
            Var('isObj'),
            ToObject(
              Map(
                ToArray(Var('data')),
                Lambda('field',
                  Let(
                    {
                      key: Select([0], Var('field')),
                      value: Select([1], Var('field')),
                    },
                    [ Var('key'), Call(Function(Var('fnc_name')), { data: Var('value'), name: Var('fnc_name') })]
                  )
                )
              )
            ),
            If(
              Var('isRef'),
              Let(
                {
                  collection: Select(['collection'], Var('data')),
                  id: Select(['id'], Var('data')),
                  name: Select(['name'], Get(Var('collection'))),
                  index_name: Concat([Var('name'), 'old', 'id', 'idx'], '_'),
                  find: Match(Index(Var('index_name')), Var('id')),
                  existRef: Exists(Var('find'))
                },
                If(
                  Var('existRef'),
                  Let(
                    {
                      get: Get(Var('find')),
                      new_id: Select(['ref', 'id'], Var('get'))
                    },
                    Ref(Collection(Var('name')), Var('new_id'))
                  ),
                  Abort(Concat(['Target ref not found in index: ', Var('index_name'), ', id: ', Var('id')]))
                )
              ),
              If(
                Var('isArr'),
                Map(
                  Var('data'),
                  Lambda('v',
                    Call(Function(Var('fnc_name')), { data: Var('v'), name: Var('fnc_name') })
                  )
                ),
                Var('data')
              )
            )
          )
        )
      )
    )
  }

  return await settings.target.query(
    Map(
      [fnc],
      Lambda('obj',
        Let(
          {
            create: Select(['create'], Var('obj')),
            name: Select(['name'], Var('obj')),
            body: Select(['body'], Var('obj')),
            role: Select(['role'], Var('obj')),
            fnc: Function(Var('name')),
            exist: Exists(Var('fnc'))
          },
          If(
            Var('create'),
            If(
              Var('exist'),
              Update(Var('fnc'), {
                body: Var('body'),
                role: Var('role')
              }),
              CreateFunction({
                name: Var('name'),
                body: Var('body'),
                role: Var('role')
              })
            ),
            If(
              Var('exist'),
              Get(Var('fnc')),
              Abort(Concat(['No found user-function: ', Var('name')])),
            )
          )
        )
      )
    )
  )

  .then(fnc => {
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
      debug && log(`Transfer ref-source data - done`)
      return res
    })

    .catch(err => console.log('Promises all transfer data ref-source :', err))
  })

  .catch(err => {
    debug && err.requestResult && JSON.parse(err.requestResult.responseRaw)

    .errors.map(error =>
        log(`${error.description}`, null,
          { error: true })
    )

  })

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

  const { Map, Lambda, Var, Select, Let, Abort, Collection, If, Exists, Call, Function, Create } = settings.q

  return await settings.target.query(
    Map(
      [{
        fnc_name: settings.ref.name,
        source: source,
        data: data
      }],
      Lambda(
        'obj',
        Let(
          {
            fnc_name: Select(['fnc_name'], Var('obj')),
            collection: Collection(Select(['source', 'name'], Var('obj'))),
            data: Select(['data'], Var('obj')),
            exist: Exists(Var('collection'))
          },
          If(
            Var('exist'),
            Map(
              Var('data'),
              Lambda('record',
                Let(
                  {
                    source: Call(Function(Var('fnc_name')), { name: Var('fnc_name'), data: Var('record')})
                  }, Create(Var('collection'), { data: Var('source') })
                )
              )
            ),
            Abort('No found collection in target DB')
          )
        )
      )
    )
  )

  // .then(rec => {
  //   console.log('rec :', rec);
  //   return rec
  // })

  .catch(err => {
    debug && err.requestResult && JSON.parse(err.requestResult.responseRaw)

    .errors.map(error =>
        log(`${source.name}: ${error.description}`, null,
          { error: true })
    )

  })
}