/*jshint -W030*/
import { Collections, collections } from './collections'
import indexes from './indexes'
import transform from './transform'
import fauna from './fauna'
import log from './log'

export default (json, settings = {}) => {
  const { debug } = settings || false

  const keys = Object.keys(json)
    fauna(settings, keys)

    .then(res => {
      keys.map(async key => {
        switch (key) {
        case 'collections':
          await Collections(json[key], settings)
          break
        }
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
}