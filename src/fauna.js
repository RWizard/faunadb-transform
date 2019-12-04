/*jshint -W030*/
import faunadb from 'faunadb'
import log from './log'

export default async (settings = {}, types = []) => {
  const { debug } = settings || false
  debug && log('Init settings - start')

  if (settings.q) {
    debug && log('Init settings - done')
    return settings
  }

  if (types.includes('transfer') && !settings.source)
    throw new Error('Require "source" secret key or faunadb.Client in settings params for transfer task')

  if (!settings.target)
    throw new Error('Require "target" secret key or faunadb.Client in settings params')

  settings.target = await new faunadb.Client({
    secret: settings.target
  })

  settings.source = await new faunadb.Client({
    secret: settings.source
  })

  settings.q = faunadb.query
  debug && log('Init settings - done')

  return await settings
}