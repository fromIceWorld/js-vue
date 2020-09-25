a = {
    obj:{
        name:'li',
        age:12
    },
    arr:[1,2,3]
}

let Target = 0;

// observe(a)

function observe(obj) {
    var ob
    if(obj.__ob__ instanceof Observer){
        ob = obj.__ob__
    }
    if(isObj(obj) || isArr(obj)){
        ob = new Observer(obj)
    }
    return ob
}

function Observer(obj){
    this.value = obj;
    this.dep = new Dep();
    def(obj, '__ob__', this)
    if(isObj(obj)){
        walk(obj)
    }else if(isArr(obj)){
        array(obj)
    }
}

function walk(obj) {
    let keys = Object.keys(obj)
    keys.forEach(key=>{
        let value = obj[key]
        var childOb = observe(value)
        var dep = new Dep()
        Object.defineProperty(obj, key, {
            get: function () {
                if(Target){
                    console.log('收集依赖------')
                    dep.depend()
                    if(childOb){
                        console.log('子收集依赖。','childOb.dep.depend()')
                        childOb.dep.depend()
                    }
                }
                console.log('获取：',value)
                return value
            },
            set(v) {
                console.log('设置:')
                value = v
                console.log(dep)
            }
        })
    })
}
function array(arr){
    arr.__proto__ = arrayMethods
}

let methods = ['push','pop','shift','unshift','splice','reverse','sort']
let arrayMethods = Object.create(Array.prototype)
    methods.forEach(method=>{
        let original = arrayMethods[method]
        def(arrayMethods,method,function () {
            let arg = Array.from(arguments)
            original.apply(this, arg)
            var inserted
            switch (method) {
                case 'push':
                case 'unshift':
                    inserted = arg;
                    break
                case 'splice':
                    inserted = arg.slice(2)
                    break;
            }
            if(inserted){
                console.log('有新增')
                observe(inserted)
            }
            console.log(this.__ob__.dep)
        })
    })

var uid = 0
function Dep() {
    this.id = uid++
    this.subs = []
}
Dep.prototype.addSub = function (sub) {
    this.subs.push(sub)
}
Dep.prototype.removeSub = function (sub) {

}
Dep.prototype.removeSub = function (sub) {

}
Dep.prototype.depend = function () {
    if(Target){
        this.subs.push(Target++)
    }
}


function isObj(obj){
   return ({}).toString.call(obj) === '[object Object]'
}
function isArr(arr){
    return ({}).toString.call(arr) === '[object Array]'
}
function def (obj, key, val, enumerable) {
    Object.defineProperty(obj, key, {
        value: val,
        enumerable: !!enumerable,
        writable: true,
        configurable: true
    });
}

