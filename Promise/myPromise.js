function myPromise(excutor){
    this.status = 'pending'
    this.value  = ''
    this.reason = ''
    this.fulfiledArray = []
    this.rejectArray = []
    let that = this
    let  resolve = function (){
        if(that.status === 'pending'){
            that.status = 'fulfilled'
            that.fulfiledArray.forEach(fun=>fun())
        }
    }
    let  reject = function (){
        if(that.status === 'pending'){
            that.status = 'rejected'
            that.rejectArray.forEach(fun=>fun())
        }
    }
    try{
        excutor(resolve,reject)
    }catch (e) {
        throw(e)
    }
}

myPromise.prototype.then = function (onFulfilled, onRejected) {
    let pro2 = new myPromise((resolve,reject)=>{
                        typeof onFulfilled !== 'function' onFulfilled = value=>{} : null
                        typeof onRejected !== 'function' onRejected = value=>{} : null
                        if(this.status === 'pending'){
                            this.fulfiledArray.push(onFulfilled)
                            this.rejectArray.push(onRejected)
                        }
                        if(this.status === 'fulfilled'){
                            let x = onFulfilled(this.value)
                            resolvePromise(pro2,x,resolve,reject)
                        }
                        else{
                            let x = onRejected(this.reason)
                            resolvePromise(pro2,x,resolve,reject)
                        }
    })
    return pro2
}

function resolvePromise(pro2,x,resolve,reject){
    if(pro2 === x){
        reject(new TypeError('Chaing cycle'))
    }
    if(typeof x === myPromise){

    }
    try{
        if(typeof x === 'object' || typeof x === 'function') {
            let used
            let then = x.then
            if(typeof then === 'function'){
                then.call(x,
                    (y)=>{if(used) return ;used = true ;resolvePromise(pro2,y,resolve,reject)} ,
                            (r)=>{if(used) return ;used = true ;reject(y)})
            }else{
                if(used) return
                used = true
                resolve(x)
            }
        }
    }catch (e) {
        if (used) return
        reject(e)
    }

}
