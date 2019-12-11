/*jshint -W030*/
/*jshint -W061*/
import log from '../log'
import { Roles } from '../roles'
import { parser } from '../parser'

export default (roles = {}, settings = {}) => {
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
    role.params.name = role.params.name || role.name
    return role
  })

  debug && log('Structure - roles')

  const promises = rolesArray.map(role => {
    debug && log(`Structure: ${role.name} - start`)
    const { Map, Role, Lambda, Let, If, Select, Var, Exists, Abort, Not, Get } = settings.q
    return settings.source.query(
      Map(
        [ role ],
        Lambda(
          'json',
          Let(
            {
              name:       Select(['name'], Var('json')),
              role:       Role(Var('name')),
              exist:      Exists(Var('role'))
            },
            If(
              Not(Var('exist')),
              Abort('No user-role in source DB'),
              Get(Var('role'))
            )
          )
        )
      )
    )

    .then(res => {
      res = res[0]

      res.privileges && res.privileges
      .map(priv => {
        priv.resource = eval(parser(`${priv.resource}`))
      })

      res.membership && res.membership
      .map(mem => {
        mem.resource = eval(parser(`${mem.resource}`))
      })

      debug && log(`Structure: ${ role.name } - transfer`)

      const targetRole = [{
        name:         role.name,
        create:       role.create,
        update:       role.update,
        params: {
          name:       role.params.name,
          privileges: role.params.privileges || res.privileges,
          membership: role.params.membership || res.membership,
        }
      }]
      return Roles(targetRole, settings)
    })

    .catch(err => {
      console.log('err :', err);
      debug && err.requestResult && JSON.parse(err.requestResult.responseRaw)

      .errors.map(error => {
        log(`${ role.name }: ${ error.description }`, '',
          { error: true })
      })

    })

  })

  return Promise.all(promises)

  .then(res => {
    debug && log(`Structure Roles - done`)
    return res
  })

  .catch(err => console.log('Promises all transfer Roles error:', err))
}

