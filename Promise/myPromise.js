1- 三种状态,pending/rejected/resolved,只能pending转为 rejected和resolved
2- 两个支路(成功/失败),由前一个promise确定.只有前一个状态确定才会执行后续的程序
3- thenable,兼容其他的有then的类promise
4- 控制反转,内层返回的promise可控制外层的promise

function myPromise(fn) {
    this.state = 'pending';
    this.resolvedCall = [];
    this.rejectedCall = [];
    this.value = '';
    this.reason = '';
    let that = this;
    function resolve(val) {
        if(that.state == 'pending'){
            that.state = 'resolved';
            that.value = val
            that.resolvedCall.forEach(fun=>{
                fun()
            })
        }
    }
    function reject(reason) {
        if(that.state == 'pending'){
            that.state = 'rejected'
            that.reason = reason;
            that.rejectedCall.forEach(fun=>{
                fun()
            })
        }
    }
    try{
        fn(resolve, reject)
    }catch (e) {
        reject(e)
    }
}

myPromise.prototype.then = function (resolveFn, rejectFn) {
    resolveFn = typeof resolveFn !== 'function' ? (value)=>value : resolveFn;
    rejectFn  = typeof rejectFn !== 'function' ? (reason)=>reason : rejectFn;
    let that = this;
    let pro2 = new myPromise((resolve,reject)=>{
        if(that.state == 'pending'){
            that.resolvedCall.push(
                ()=>{
                    try{
                        setTimeout(()=>{
                            let x = resolveFn(that.value)
                            resolvePro(pro2, x, resolve, reject)
                        })
                    }catch (e) {
                        reject(e)
                    }
                }
            )
            that.rejectedCall.push(
                ()=>{
                    try{
                        setTimeout(()=>{
                            let x = rejectFn(that.reason)
                            resolvePro(pro2, x, resolve, reject)
                        })
                    }catch (e) {
                        reject(e)
                    }
                }
            )
        }
        if(that.state == 'resolved'){
                try{
                    setTimeout(()=>{
                        let x = resolveFn(that.value)
                        resolvePro(pro2, x, resolve, reject)
                    })
                }catch (e) {
                    reject(e)
                }
        }
        if(that.state == 'rejeced'){
                try{
                    setTimeout(()=>{
                        let x = rejectFn(that.value)
                        resolvePro(pro2, x, resolve, reject)
                    })
                }catch (e) {
                    reject(e)
                }
        }
    })
    return pro2;
}

function resolvePro(pro2, x, resolve, reject) {
    let used = false;
    if(pro2 === x){
        reject(new TypeError('循环'))
    }
    if(typeof x == 'object' || 'function'){
        try{
            let then = x.then;
            if(typeof x == 'function'){
                then.call(x,
                    function resolvePromise(y) {
                        if(!used){
                            used = true;
                            resolvePro(pro2, y, resolve, reject)
                        }
                    },
                    function rejectPromise(r) {
                        if(!used){
                            used = true;
                            reject(r)
                        }
                    })
            }else{
                resolve(x)
            }
        }catch (e) {
            if(!used){
                used = true;
                reject(e)
            }
        }
    }else{
        resolve(x)
    }
}

myPromise.resolve = function resolve(value) {
    if(value instanceof myPromise){
        return value
    }
     let pro3 = new myPromise((resolve, reject)=>{
         if(value && typeof value === 'object' && typeof value.then === 'function'){
             try{
                 setTimeout(()=>{
                     value.then(resolve, reject)
                 })
             }catch (e) {
                 reject(e)
             }
         }else{
             resolve(value)
         }
     })
    return pro3
}
myPromise.reject = function rehject(reson) {
    return new myPromise((resolve,reject)=>{
        reject(reason)
    })
}
myPromise.prototype.catch = function (e) {
    this.then(null,e)
}
myPromise.prototype.finally = function (callBack) {
    return this.then(
        (value)=>{
            return myPromise.resolve(callBack()).then(()=>return value)
        },
        (reason)=>{
            return myPromise.reject(callBack()).then(()=>throw reason)
        }
    )
}
myPromise.all = function (promises) {
    let promises = Array.from(promises);
    return new myPromise((resolve, reject)=>{
        let result = new Array(promises.length);
        let index= 0;
        if(result.length == 0){
            resolve(result)
        }else{
            for(let i =0 ; i<result.length ; i++){
                myPromise.resolve(promises[i]).then(data=>{
                    if(inedx < promises.length){
                        result[i] = data
                        index ++
                    }else{
                        resolve(result)
                    }
                },
                    (reason)=>{
                    reject(reason)
                        return
                    }   )
            }
        }
    })
}
myPromise.race = function (promises) {
    let promises = Array.from(promises)
    return new myPromise((resolve,reject)=>{
        if(promises.length === 0){
            return
        }
        for(let i = 0; i<promises.length ;i++){
            myPromise.resolve(promises[i]).then((data)=>{
                resolve(data);
                return
            },(reason)=>{
                reject(reason)
            })
        }
    })
}
