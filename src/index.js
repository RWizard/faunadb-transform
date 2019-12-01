import faunadb from 'faunadb'

export default (json, settings) => {
    // console.log('json :', json);
    Object.keys(json).map(key => {
        switch (key) {
            case 'collections':
                collections(json[key])
                break
        }
    })
}

const collections = (json) => {
    Object.keys(json).map(collection => {
        console.log('collection :', collection);
    })
}

const indexes = (json) => {

}

const transform = (json) => {

}

export {
    collections,
    indexes,
    transform,
}