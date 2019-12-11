/*jshint -W030*/
/*jshint -W061*/
import log from './log'
import fauna from './fauna'
import { parser } from './parser'

export const Roles = async (roles = {}, settings = {}) => {
  const { debug } = settings || false
  let rolesArray = !Array.isArray(roles)
  ? Object.keys(roles).map(val => {
    roles[val].name = roles[val].name || val
    roles[val].params = roles[val].params || {}
    roles[val].params.name = roles[val].params.name || val
    return roles[val]
  })
  : roles.map(role => {
    role.params = role.params || {}
    role.params.name = role.params.name || fnc.name
    return role
  })

  debug && log('Roles')
  const promises = rolesArray.map(async role => {
    debug && log("Role " + role.name + " - start")
    const { Collection, Index, Ref, Map, Lambda, Var, CreateRole, Role, Let, If, And, Not, Exists, Abort, Delete, Select, Update } = settings.q

    role.params.privileges && role.params.privileges

    .map(priv => {
      if (typeof priv.resource === 'object' && priv.resource.type) {
        switch(priv.resource.type) {
          case 'collection':
            priv.resource = Collection(priv.resource.name)
            break
          case 'index':
            priv.resource = Index(priv.resource.name)
            break
          case 'function':
            priv.resource = Ref(Ref('functions'), priv.resource.name)
            break
        }
      }

      priv.actions && Object.keys(priv.actions)

      .map(action => {
        if (typeof priv.actions[action] === 'string') {
          priv.actions[action] = eval(parser(priv.actions[action]))
        }
      })

    })

    role.params.membership && role.params.membership

    .map(mem => {
      if (typeof mem.resource === 'string') mem.resource = Collection(mem.resource)
      if (mem.predicate && typeof mem.predicate === 'string') {
        mem.predicate = eval(parser(mem.predicate))
      }
    })

    return await settings.target.query(
      Map(
        [role],
        Lambda(
          'role',
          Let(
            {
              create: Select(['create'], Var('role'), true),
              update: Select(['update'], Var('role'), true),
              remove: Select(['remove'], Var('role'), false),
              params: Select(['params'], Var('role')),
              name: Select(['name'], Var('role')),
              exist: Exists(Role(Var('name')))
            },
            If(
              Var('remove'),
              If(
                Var('exist'),
                Delete(Role(Var('name'))),
                Abort('No user-role for remove')
              ),
              If(
                And(Var('create'), Not(Var('exist'))),
                CreateRole(Var('params')),
                If(
                  And(Var('update'), Var('exist')),
                  Update(Role(Var('name')), Var('params')),
                  Abort('No actions for user-role')
                )
              )
            )
          )
        )
      )
    )
    .then(res => {
      debug && log('Role', role.name + ' - done')
      return res
    })
    .catch(err => {
      debug && JSON.parse(err.requestResult.responseRaw)

      .errors.map(error =>
          log(`${role.name}: ${error.description}`, null,
            { error: true })
      )
    })
  })

  return Promise.all(promises)
  .then(res => {
    debug && log(`Roles - done`)
    return res
  })
  .catch(err => console.log('Promises all Roles error :', err))
}

export const roles = (json = {}, settings = {}) => {
  const { debug } = settings || false

  return fauna(settings, ['roles'])
  .then(res => {
    return Roles(json, res)
  })
  .catch(err => {
    log(err, null, { error: true })
    debug && log('Init settings - stop')
    return err
  })
}