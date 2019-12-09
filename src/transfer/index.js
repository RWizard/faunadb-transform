/*jshint -W030*/
/*jshint -W061*/
import log from '../log'
import fauna from '../fauna'
import structure from './structure'

export const Transfer = async (transfer = {}, settings = {}) => {
  const { debug } = settings || false
  return structure(transfer.structure, settings)
}

export const transfer = (json = {}, settings = {}) => {
  const { debug } = settings || false

  return fauna(settings, ['transfer'])
  .then(res => {
    return Transfer(json, res)
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