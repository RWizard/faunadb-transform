/*jshint -W030*/
/*jshint -W061*/
import log from '../log'
import { Functions } from '../functions'

export default (functions = {}, settings = {}) => {
  const { debug } = settings || false

  let functionsArray = !Array.isArray(functions)
  ? Object.keys(functions).map(val => {
    functions[val].name = functions[val].name || val
    functions[val].params = functions[val].params || {}
    functions[val].params.name = functions[val].params.name || val
    return functions[val]
  })
  : functions.map(fnc => {
    fnc.params = fnc.params || {}
    fnc.params.name = fnc.params.name || fnc.name
    return fnc
  })

  debug && log('Structure - functions')

  const promises = functionsArray.map(fnc => {
    debug && log(`Structure: ${fnc.name} - start`)
    const { Map, Function, Lambda, Let, If, Select, Var, Exists, Abort, Not, Get } = settings.q
    return settings.source.query(
      Map(
        [ fnc ],
        Lambda(
          'json',
          Let(
            {
              name:       Select(['name'], Var('json')),
              function:   Function(Var('name')),
              exist:      Exists(Var('function'))
            },
            If(
              Not(Var('exist')),
              Abort('No function in source DB'),
              Get(Var('function'))
            )
          )
        )
      )
    )

    .then(res => {
      debug && log(`Structure: ${ fnc.name } - transfer`)
      res = res[0]

      const { data, role, body } = res

      const targetFunction = [{
        name: fnc.name,
        create: fnc.create,
        update: fnc.update,
        params: {
          name: fnc.params.name,
          data: fnc.params.data || data,
          role: fnc.params.role || role,
          body: `${body}`
        }
      }]

      return Functions(targetFunction, settings)

    })

    .catch(err => {
      debug && err.requestResult && JSON.parse(err.requestResult.responseRaw)

      .errors.map(error => {
        log(`${ fnc.name }: ${ error.description }`, '',
          { error: true })
      })

    })

  })

  return Promise.all(promises)

  .then(res => {
    debug && log(`Structure functions - done`)
    return res
  })

  .catch(err => console.log('Promises all transfer Roles error:', err))
}

