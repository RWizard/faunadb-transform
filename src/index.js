/*jshint -W030*/
import { Collections, collections } from './collections'
import { Fill, fill } from './fill'
import { Indexes, indexes } from './indexes'
import { Functions, functions } from './functions'
import { Transfer, transfer } from './transfer'
import { Roles, roles } from './roles'
// import transform from './transform'
import fauna from './fauna'
import log from './log'

export default async (json, settings = {}) => {
  const { debug } = settings || false

  const keys = Object.keys(json)
  return await fauna(settings, keys)

  .then(settings => {
    // console.log('settings :', settings);
    return Collections(json.collections, settings)
  })

  .then(collections => {
    // console.log('Collections res :', JSON.stringify(collections));
    return Indexes(json.indexes, settings)
    .then(indexes => {
      return {
        collections,
        indexes
      }
    })
  })

  .then(res => {
    // console.log('Indexes res :', JSON.stringify(res));
    return Fill(json.fill, settings)
    .then(fill => {
      res.fill = fill
      return res
    })
  })

  .then(res => {
    // console.log('Fill res :', JSON.stringify(res));
    return Functions(json.functions, settings)
    .then(functions => {
      res.functions = functions
      return res
    })
  })

  .then(res => {
    // console.log('Functions res :', JSON.stringify(res));
    return Transfer(json.transfer, settings)
    .then(transfer => {
      res.transfer = transfer
      return res
    })
  })

  .then(res => {
    // console.log('Transfer res :', JSON.stringify(res));
    return Roles(json.roles, settings)
    .then(roles => {
      res.roles = roles
      return res
    })
  })

  .catch(err => {
    if (err.requestResult) {
      JSON.parse(err.requestResult.responseRaw)
      .errors.map(error =>
          log(`${index.name}: ${error.description}`, null,
            { error: true })
      )
    }
    else {
      log(err, null, { error: true })
      debug && log('Init settings - stop')
    }
    return err
  })
}

export {
  collections,
  indexes,
  fill,
  functions,
  transfer,
  roles,
}