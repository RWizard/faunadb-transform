/*jshint -W030*/
import { Collections, collections } from './collections'
import { Fill, fill } from './fill'
import { Indexes, indexes } from './indexes'
import transform from './transform'
import fauna from './fauna'
import log from './log'

export default (json, settings = {}) => {
  const { debug } = settings || false

  const keys = Object.keys(json)
  fauna(settings, keys)

  .then(res => {
    Collections(json.collections, settings)
    .then(res => {
      // console.log('Collections res :', JSON.stringify(res));
      return Indexes(json.indexes, settings)
    })
    .then(res => {
      // console.log('Indexes res :', JSON.stringify(res));
      return Fill(json.fill, settings)
    })
    .then(res => {
      // console.log('Fill res :', JSON.stringify(res));
    })
    .catch(err => {
      // console.log('index err :', err);
      debug && JSON.parse(err.requestResult.responseRaw)

      .errors.map(error =>
          log(`${index.name}: ${error.description}`, null,
            { error: true })
      )
    })
  })

  .catch(err => {
    log(err, null, { error: true })
    debug && log('Init settings - stop')
    return err
  })
}

export {
  collections,
  indexes,
  transform,
  fill,
}