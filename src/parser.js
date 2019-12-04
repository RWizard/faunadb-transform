const esprima = require('esprima')
export const parser = (query) => {
    if (!process.browser) return
    var parse = esprima.parseScript(query)
    const replacer = (obj) => {
        let {type, callee} = obj
        if (type) {
            switch(type){
                case  'CallExpression':
                    callee.name = 'faunadb.query.' + callee.name
                    break
                case 'Property':
                    if (obj.value && obj.value.callee) obj.value.callee.name = 'faunadb.query.' + obj.value.callee.name
                    if (obj.value && obj.value.properties) obj.value.properties = window._.map(obj.value.properties, o => replacer(o))
                    if (obj.value && obj.value.arguments) obj.value.arguments = window._.map(obj.value.arguments, o => replacer(o))
                    break
                case 'ObjectExpression':
                    if (obj.properties) obj.properties = window._.map(obj.properties, o => replacer(o))
                break
            }
        }
        if (obj.arguments)
            obj.arguments = window._.map(obj.arguments, o => replacer(o))
        return obj
    }

    parse.body[0].expression = replacer(parse.body[0].expression)
    return window.escodegen.generate(parse.body[0]).replace(/;/, '')
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