## call

```javascript
var foo ={
    value:'call'
}
function bar(name,age){
    console.log(this.value)
    console.log(name,age)
}
bar.call(foo,'Ace',12)
```

用法：function.call（context , params1 , params2 , ....）

解释：call() 方法在使用一个指定的 this 值（foo）和若干个指定的参数值（‘Ace’,12）的前提下调用某个函数或方法

步骤：1 - 改变bar的执行上下文（context）为 foo 

​						foo.bar = bar

​            2 - 传入参数（参数数量不定）

​						foo.bar('Ace',12)			

​			3 - 删除foo 中的 bar 函数

​						delete foo.bar			

核心：改变bar函数的执行上下文（也就是改变 this 指向）为foo，然后传入后续参数 ( ‘Ace’,12 )

关键点：javaScript 中 的 this的指向；参数长度不定；

```javascript
Function.prototype.call2=function(context){
    context.fun = this || window               //foo.fun = bar 为null则指向window
    let arg = []              
    for(var i = 1;i<arguments.length ; i++){
        arg.push('arguments['+i + ']')
    }                                             //['arguments[1]',['arguments[2]'...]
    var result = eval('context.fun(' + arg + ')') //context.fun( arguments[1] ...)
    delete context.fun
    return result                                 //bar可返回
}
```

## apply

apply和call相似 只是 传入参数不同，apply（context , [ params1 , params2 , ....]）

```javascript
Function.prototype.apply2 = function(context,arr){
    context.fun = this
    let arg = []
    let result
    if(arr && arr.length>0){
        for(var i = 0;i<arr.length ; i++){
            arg.push('arr['+i + ']')
        }
        result = eval('context.fun(' + arg + ')')
    }else {
        result = context.fn()
    }
    delete context.fun
    return result
}
```

------

@知微 2020/6/1