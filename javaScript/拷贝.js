// number string boolean  undifined null NaN     function regex data
// object array set map

a ={
    arr:[1,2,3,4],
    obj:{
        age:33,
        nextObj:{
            name:'tt'
        },
        loop:''
    }
}
a.obj.loop = a

let dataMap = new Map()  //循环引用

function deep(obj) {
    let depObj
    let type  = typeS(obj)
    if(dataMap.get(obj)){
        return dataMap.get(obj)
    }else{
        dataMap.set(obj,true)
        switch (type) {
            case '[object Object]':
                depObj = deepObject(obj);
                break;
            case '[object Array]':
                depObj = deepAarray(obj);
                break;
            case '[object Map]':
                depObj = deepMap(obj);
                break;
            default:
                depObj = deepOther(obj); //string number null undefined boolean NaN
                break;
        }
    }
    return depObj;
}
function deepMap(obj) {
    let newObj = new Map()
    let size = obj.size
    let iterator = obj.entities()
    for(let i =0;i<size;i++){
        newObj[keys[i]] = deep(obj[keys[i]])
    }
    return newObj
}


function deepObject(obj) {
    let newObj = {}
    let keys = Object.keys(obj)
    for(let i =0,len = keys.length;i<len;i++){
        newObj[keys[i]] = deep(obj[keys[i]])
    }
    return newObj
}

function deepAarray(arr) {
    let newArr = []
    let keys = Object.keys(arr)
    for(let i =0,len = keys.length;i<len;i++){
        if(arr.hasOwnProperty(keys[i])){
            newArr[keys[i]] = deep(arr[keys[i]])
        }
    }
    return newArr
}
function deepOther(obj) {
    return obj
}


function typeS(obj) {
   return ({}).toString.call(obj)
}
