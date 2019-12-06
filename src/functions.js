/*jshint -W030*/
/*jshint -W061*/
import log from './log'
import fauna from './fauna'
import { parser } from './parser'

export const Functions = async (functions, settings = {}) => {
  const { debug } = settings || false

  let functionsArray = !Array.isArray(functions)
  ? Object.keys(functions).map(val => {
    functions[val].name = functions[val].name || val
    functions[val].params = functions[val].params || {}
    functions[val].params.name = functions[val].params.name || val
    functions[val].params.body = parser(functions[val].params.body)
    return functions[val]
  })
  : functions.map(fnc => {
    fnc.params = fnc.params || {}
    fnc.params.name = fnc.params.name || fnc.name
    fnc.params.body = parser(fnc.params.body)
    return fnc
  })

  debug && log('Functions')
  const promises = functionsArray.map(async fnc => {
    debug && log("Function " + fnc.name + " - start")
    const { Map, Lambda, Var, CreateFunction, Function, Let, If, And, Not, Exists, Abort, Delete, Select, Update } = settings.q

    fnc.params.body = eval(fnc.params.body)
    return await settings.target.query(
      Map(
        [fnc],
        Lambda(
          'fnc',
          Let(
            {
              create: Select(['create'], Var('fnc'), true),
              update: Select(['update'], Var('fnc'), true),
              remove: Select(['remove'], Var('fnc'), false),
              params: Select(['params'], Var('fnc')),
              role: Select(['role'], Var('params')),
              body: Select(['body'], Var('params')),
              data: Select(['data'], Var('params')),
              name: Select(['name'], Var('fnc')),
              exist: Exists(Function(Var('name')))
            },
            If(
              Var('remove'),
              If(
                Var('exist'),
                Delete(Function(Var('name'))),
                Abort('No user-function for remove')
              ),
              If(
                And(Var('create'), Not(Var('exist'))),
                CreateFunction(Var('params')),
                If(
                  And(Var('update'), Var('exist')),
                  Update(Function(Var('name')), Var('params')),
                  Abort('No actions for function')
                )
              )
            )
          )
        )
      )
    )
    .then(res => {
      debug && log('Function', fnc.name + ' - done')
      return res
    })
    .catch(err => {
      debug && JSON.parse(err.requestResult.responseRaw)

      .errors.map(error =>
          log(`${fnc.name}: ${error.description}`, null,
            { error: true })
      )
    })
  })

  return Promise.all(promises)
  .then(res => {
    debug && log(`Functions - done`)
    return {'functions': [...res]}
  })
  .catch(err => console.log('Promises all Functions :', err))
}

export const functions = (json, settings = {}) => {
  const { debug } = settings || false

  return fauna(settings, ['functions'])
  .then(res => {
    return Functions(json, res)
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