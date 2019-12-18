/*jshint -W030*/
/*jshint -W061*/
// import log from '../log'
import simple from './data-simple'
import target from './data-ref-target'
import source from './data-ref-source'

const DEFAULT_TYPE = 'simple'

export default async (data = {}, settings = {}) => {
  // const { debug } = settings || false

  let dataArray = !Array.isArray(data)
  ? Object.keys(data).map(val => {
    data[val].name = data[val].name || val
    data[val].type = data[val].type || DEFAULT_TYPE
    data[val].index = data[val].index || 'all_' + data[val].name
    data[val].params = data[val].params || {}
    data[val].params.name = data[val].params.name || val
    data[val].params.index = data[val].params.index || data[val].index
    return data[val]
  })
  : data.map(d => {
    d.type = d.type || DEFAULT_TYPE
    d.index = d.index || 'all_' + d.name
    d.params = d.params || {}
    d.params.name = d.params.name || d.name
    d.params.index = d.params.index || d.index
    return d
  })

  const dataTarget = dataArray.filter(f => {
    return f.type === 'ref-target'
  })

  return target(dataTarget, settings)

  .then(targets => {
    const dataSource = dataArray.filter(f => {
      return f.type === 'ref-source'
    })
    return source(dataSource, settings)
    .then(sources => {
      return {
        targets,
        sources
      }
    })
  })
  .then(result => {
    const dataSimple = dataArray.filter(f => {
      return f.type === 'simple'
    })
    return simple(dataSimple, settings)

    .then(simples => {
      result.simples = simples
      return result
    })

  })

}

