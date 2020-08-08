## Promise

1. new Promise( executer ) 产生一个 promise 实例
2. executer（resolve,reject）函数有resolve 和 reject 两个函数参数
3. resolve / reject 用于将 promise 实例 的 pendding状态 修改为  resolved / rejected 
4. then（）返回一个 promise 
5. promise 中的链式回调 都是每次返回一个promise

**大致思路**（同步情况下）：

​    在new Promise时 resolve / reject 改变状态，then函数的回调中 根据 new Promise 的状态执行onFulfilled / onRejected ，then（）返回的 promise 状态 由 前一个 promise 决定 

```javascript
function myPromise(executor){                    //同步代码
    let that = this                     
    this.status = 'pending'            
	this.value = ''
	this.reason = ''
    let resolve=function (value){
      if(that.status === 'pending'){
         that.status = 'resolved'
         that.value = value
    }
    }

    let reject=function (value){
      if(that.status === 'pending'){
         that.status = 'reject'
         that.reason = params
    }
    }
    try{	
       executor(resolve,reject)
    }catch(err){
       console.log(err)
    }
}
```

```javascript
myPromise.prototype.then=function (onFulfilled,onRejected){  //同步代码
  return new myPromise((resolve,reject)=>{
      if(this.status === 'resolved'){
          let x =onFulfilledd(this.value)
          resolve(x)
      }
      if(this.status === 'rejected'){
          let x = onRejected(this.value)
          reject(x)
      }
})
}
```

但是在 **异步情况** 下，我们的 then 函数在返回新的promise时 status 是 pending 状态 所以onFulfilled / onRejected 函数 是不会执行的  一段时间后我们的new Promise 改变状态时，已经不会影响 then 返回的promise的状态了。因此我们上面写的代码是对 下面这种 异步promise无效的

```
new myPromise((resolve,reject)=>{
    setTimeout(()=>resolve(1),2000)
}).then((value)=>console.log(value))
```

**大致思路**（异步情况下）：

new Promise( )时 建立两个（收集区【‘onFulfilled’】【‘onReject’】），执行then函数 将 onFulfilled / onReject 放入new Promise 建立的（收集区）内，当new Promise( )内的异步resolve / reject 执行后改变状态 ,调用（收集区）内的函数

```javascript
function myPromise(executor){
    let that = this                     
    this.status = 'pending'            
	this.value = ''
	this.reason = ''
    this.onFulfilledArr = []    //onFulfilled收集区
    this.onRejectedArr = []     //onRejected收集区

    let resolve=function (value){
      if(that.status === 'pending'){
         that.status = 'resolved'
         that.value = value
         that.onFulfilledArr.forEach(fn=>fn(value))   //状态改变执行onFulfilled
    }
    }

    let reject=function (value){
      if(that.status === 'pending'){
         that.status = 'rejected'
         that.reason = value
         that.onRejectedArr.forEach(fn=>fn(value))  //状态改变执行onRejected
    }
    }
    try{	
       executor(resolve,reject)
    }catch(err){
       reject(err)
    }
}
```

```javascript
myPromise.prototype.then=function (onFulfilled,onRejected){
   //当then()中的 onFulfilled / onRejected 为空时 忽略 将 value 传递
  onFulfilled  =  typeof onFulfilled !== 'function' ? value => value : 		                                                       onFulfilled
  onRejected  =  typeof onRejected !== 'function' ? reason=>{throw reason) } :                                                                onRejected

  return new myPromise((resolve,reject)=>{
      if(this.status === 'resolved'){
          let x =onFulfilled(this.value)
          resolve(x)
      }
      if(this.status === 'rejected'){
          let x = onRejected(this.reason)
          reject(x)
      }
      if(this.status === 'pending'){
          this.onFulfilledArr.push(onFulfilled(this.value))    //收集onFulfilled
          this.onRejectedArr.push(onRejected(this.reason))     //收集onRejected
      }
})
}
```

这样 我们的myPromise 函数可以处理同步也可以处理new Promise异步了，但是无法处理异步的链式调用，比如

onFulfilled / onRejected 返回的是 promise

```javascript
new Promise((resolve,reject)=>{setTimeout(()=>{resolve(9)},2000)})
      .then(value=>{return new Promise((resolve,reject)=>{
             setTimeout(()=>{resolve(9)},2000)})})
       .then(value=>console.log('resolve' +value))
```

因此我们还需修改我们的 then（onFulfilled , onRejected） ，考虑onFulfilled / onRejected 返回promise 的情况。

**onFulfilled / onRejected 返回值为 Promise 情况** 

/*****  假设当我们new Promise 的时候产生的是  promise 1 ，  

​     new Promise (  ....  ).then(  ...  )   then 产生的是 promise 2  ，

​     new Promise(  ...  ).then( (value)=>{return new Promise(.....)} ) : then 中 onFulfilled 产生的是 promise3

​     new Promise(  ...  ).then( (value)=>{return new Promise(.....)} )

​                                      .then((value=>console.log(value))) : 第二个then 产生的是 promise4

​     **我们想要的情况是**：promise2 的状态由 promise3 决定 ； 这样的话上面异步代码整个执行过程就是，

​        1 - new Promise（）执行，

​                   将第一个 then 的 onFulfilled / onRejected 函数放到 promise1 中的（收集区）

​                   将第二个 then 的 onFulfilled / onRejected 函数放到 promise2 中的（收集区）

​        2 - promise1 的状态确认

​                   调用（收集区）的函数（promise2 的  onFulfilled / onRejected）,生成 x  也就是我们假设的promise3   

```javascript
             x  = onFulfilled (value)      //生成我们假设的 promise3
```

​        3 - 让 promise3 决定 promise2 状态 

​                    让 promise3 决定 promise2 状态的方法就是将 promise2 的resolve / reject 函数 传递给 promise3 ，作为promise3 的 onFulfilled / onRejected 。当promise3 状态改变时，会执行 onFulfilled / onRejected，这时执行的是promise2 的 resolve/ reject，执行之后promise2 的状态改变，执行promise2 收集的第二个then 的 onFulfilled / onRejected。

​         4 - x.then(resolve,reject)

​                    x.then(resolve,reject)  中 x 是promise3 ，resolve / reject 是promise2 的 resolve / reject,

​      x.then(resolve,reject) 就相当于 我们前面的 **异步情况下的大致思路**

​                    将promise2 中的resolve  / reject 当作回调函数 放到promise3 的（收集区），当promise3 状态改变时，修改promise2 的状态，promise2 状态改变 调用promise2中（收集区）的函数         

**这样的话，我们的then函数需要改变下逻辑**

让then 可以处理 onFulfilled / onRejected 返回promise 的状态

```javascript
myPromise.prototype.then=function (onFulfilled,onRejected){
   //当then()中的 onFulfilled / onRejected 为空时 忽略 将 value 传递
  onFulfilled  =  typeof onFulfilled !== 'function' ? value => value : onFulfilled		                                                                                   
  onRejected  =  typeof onRejected !== 'function' ? reason=>{throw reason) } : onRejected                                                               
  return new myPromise((resolve,reject)=>{
      if(this.status === 'resolved'){
          let x =onFulfilled(this.value)
          x instanceof myPromise ?  x.then(resolve,reject) : resolve(x)  //加入返回promise的处理
      }
      if(this.status === 'rejected'){
          let x = onRejected(this.value)
          x instanceof myPromise ?  x.then(resolve,reject) : reject(x)
      }
      if(this.status === 'pending'){
          this.onFulfilledArr.push(()=>{
              let x = onFulfilled(this.value)
              x instanceof myPromise ?  x.then(resolve,reject) : resolve(x)
          })    //收集onFulfilled
          
          this.onRejectedArr.push(()=>{
              let x = onRejected(this.reson)
              x instanceof myPromise ?  x.then(resolve,reject) : reject(x)
          })                      
      }
})
}
```

 但是上面的then函数只能处理一层返回 promise 如果 promise 中又返回promise 像下面这样就会出错，错误的原因是我们只是单纯的判断 x 是否 是 promise的实例是不够的。像下面这样会直接把 第二层的promise resolve（promise5）![image-20200514134134467](../AppData/Roaming/Typora/typora-user-images/image-20200514134134467.png)

```javascript
new Promise((resolve,reject)=>{setTimeout(()=>{resolve(9)},2000)})
     .then(value=>{return new Promise((resolve,reject)=>{
          setTimeout(()=>{resolve( new Promise((resolve,reject)=>{                                      reject(5)}))},2000)})})
    .then(value=>console.log( 'resolve'+value),value=>console.log('reject' +value))                           
```

既然我们的判断条件：

```javascript
x instanceof myPromise ?  x.then(resolve,reject) : resolve(x)
```

还不够，我们就继续增加判断条件，这次我们依据**Promise A+** 的规范进行修改我们的多层promise，因为我们的返回值还要支持thenable。直接把判断的过程写成resolvePromise（）

**resolvePromise（）**      

resolvePromise（）用来代替我们的：   x instanceof myPromise ?  x.then(resolve,reject) : resolve(x)  ；并且还要加入更多的判断

```javascript
function resolvePromise(returnPromise,x,resolve,reject){   //根据Promise A+ 规范 增加判断条件
    if(x === returnPromise){  //
        reject(new TypeError())
    }
    if((x && typeof x === 'function') || (x && typeof x === 'object')){
        let then =x.then
        if(typeof then === 'function'){
            then.call(x,(y)=>{resolvePromise(returnPromise,y,resolve,reject)},
                        (r)=>{reject(r)})
        }else{
        resolve(x)
    }
    }
    else{
        resolve(x)
    }
}
```

 这样改的话就生成新的then函数了

```javascript
myPromise.prototype.then=function (onFulfilled,onRejected){
   //当then()中的 onFulfilled / onRejected 为空时 忽略 将 value 传递
  onFulfilled  =  typeof onFulfilled !== 'function' ? value => value : onFulfilled		                                                                                   
  onRejected  =  typeof onRejected !== 'function' ? reason=>{throw reason) } : onRejected 
    
  let returnPromise = new myPromise((resolve,reject)=>{
      if(this.status === 'resolved'){
          let x =onFulfilled(this.value)
          resolvePromise(returnPromise,x,resolve,reject)
      }
      if(this.status === 'rejected'){
          let x = onRejected(this.value)
          resolvePromise(returnPromise,x,resolve,reject)
      }
      if(this.status === 'pending'){
          this.onFulfilledArr.push(()=>{
              let x = onFulfilled(this.value)
              resolvePromise(returnPromise,x,resolve,reject)
          })    //收集onFulfilled
          
          this.onRejectedArr.push(()=>{
              let x = onRejected(this.value)
              resolvePromise(returnPromise,x,resolve,reject)
          })     
      }
})
  return returnPromise
}
```

在新的 then 函数中 我们用resolvePromise代替我们的

```javascript
 x instanceof myPromise ?  x.then(resolve,reject) : resolve(x)    
```

增强对多层返回promise 的处理，

我们的 resolvePromise 对于多层promise是这样处理的：

1 - 跟随我们前一段的处理，将手动返回的第二个promise 定为 promise5 ，

```javascript
 new Promise((resolve,reject)=>{setTimeout(()=>{resolve(9)},2000)})
     .then(value=>{return new Promise((resolve,reject)=>{
          setTimeout(()=>{resolve( new Promise((resolve,reject)=>{                                      reject(5)}))},2000)})})
    .then(value=>console.log( 'resolve'+value),value=>console.log('reject' +value)) 
//也就是
 promise5 =  new Promise((resolve,reject)=>{reject(5)}))},2000)}
 
 当我们执行完promise5 之后的步骤是 ： resolve( promise5 )
 相当于：Promise.resolve(new Promise((resolve,reject)=>{reject(9)}))
 返回的promise 的状态会由 内部的 promise 决定，在上面的分析流程中，我们的promise2 的状态是由promise3决定的，promise3 又是由我们手动返回的promise5决定的。因此我们第二个then的返回的promise的状态是rejected;
会执行 value=>console.log('reject' +value) ：reject5
```

