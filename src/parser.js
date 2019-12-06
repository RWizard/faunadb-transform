const esprima = require('esprima')
const escodegen = require('escodegen')

export const parser = (query) => {
    var parse = esprima.parseScript(query)
    const replacer = (obj) => {
        let {type, callee} = obj
        if (type) {
            switch(type){
                case  'CallExpression':
                    callee.name = 'settings.q.' + callee.name
                    break
                case 'Property':
                    if (obj.value && obj.value.callee) obj.value.callee.name = 'settings.q.' + obj.value.callee.name
                    if (obj.value && obj.value.properties) obj.value.properties = obj.value.properties.map(o => replacer(o))
                    if (obj.value && obj.value.arguments) obj.value.arguments = obj.value.arguments.map(o => replacer(o))
                    break
                case 'ObjectExpression':
                    if (obj.properties) obj.properties = obj.properties.map(o => replacer(o))
                break
            }
        }
        if (obj.arguments)
            obj.arguments = obj.arguments.map(o => replacer(o))
        return obj
    }

    parse.body[0].expression = replacer(parse.body[0].expression)
    return escodegen.generate(parse.body[0]).replace(/;/, '')
}

export const evalParser = async (query, client) => {
/* jshint ignore:start */
    return await client.query(eval(parser(query)));
/* jshint ignore:end */
}

export default {
    parser,
    evalParser
}