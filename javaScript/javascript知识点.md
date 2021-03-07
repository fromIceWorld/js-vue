### javascript

------

##### 函数

```
function a(name,age){}
a.length:第一个【函数参数默认值】之前的参数的个数。 a.length == 2
function a(name,age = 9){}: a.length == 1
function a(name=2,age = 9){}: a.length == 0
a.length 无法通过赋值修改。
```



##### 原型，原型链，构造函数，实例

```javascript
function Mothor(name){
    this.name = name
}
Mothor.prototype.color = 'yellow';
var son1 = new Mothor('first');
var son2 = new Mothor('second');
 
Mothor.prototype = {
    constructor:Mothor,
    __proto__:Object.prototype
}

son1.__proto__ = Mothor.prototype;
son1.__proto__ = Mothor.prototype;

构造函数:
	构造函数是一个母体，通过 new 来生下实例，母子之间通过__proto__保持(子对母的)单向连接,母体还有自己的     原型，保存constructor（指向自身），和__proto__（指向原型的构造函数的原型Object.prototype）
原型:
	原型是构造函数的数据库，多个实例都通过__proto__共享同一个数据库。
原型链:原型与实例之间的关联(__proto__).
实例:是构造函数生下的产物(对象)，通过__proto__与母连接。

取值规则是:当在实例上找不到对应的数据，就根据__proto__去构造函数的原型(prototype)上找，如果还找不到，继          续根据构造函数的原型的__proto__向上找，找到Object.prototype，如果还找不到再继续找，                Object.prototype.__proto__ 是 null，取值结束。
```

##### 继承



##### 作用域

```javascript
作用域是代码执行过程中取值的区域，分为全局作用域和函数作用域，在一段代码中，会有一个全局作用域和n个函数作用域层层嵌套，在代码执行过程中作用域会不断的入栈和出栈，维持全局作用域与函数作用域之间的关系,就是执行上下文。

在执行代码的过程中，变量对象 / 作用域链 / this 保证我们的取值，
var scope = "global scope";
function checkscope(){
    var scope2 = 'local scope';
    return scope2;
}
checkscope();

1- 代码执行，进入全局执行上下文(globalContext),globalContext入栈,stack  = [globalContext]
2- 执行代码，创建globalContext.vo = {
    scope："global scope"，
    checkscope：checkscope
   }，checkscope函数的作用域在创建时已经存在checkscope.[[Scope]] = [globalContext.vo]
3- 执行checkscope函数，进入checkscope的执行上下文，checkscope入栈
	stack  = [globalContext，checkscopeContext]
4- 初始化checkscopeContext = {
    AO:{
        arguments:{
            length:0
        },
        scope2:undefined
    },
    Scope:checkscope.[AO, [Scope]],
}
5- 执行checkscope函数，赋值AO
    checkscopeContext = {
        AO:{
            arguments:{
                length:0
            },
            scope2:'local scope'
        },
        Scope:checkscope.[AO, [Scope]],
}
6- 在retrun时，返回scope2，函数执行完毕，checkscopeContect出栈
	stack  = [globalContext]
```

##### **this指向**

```javascript
this的指向是在运行时确定的，按照最基础的理解，谁调用函数，this就指向谁，但是这样的理解是片面的，只是根据this的表现去总结this，最根本上，JavaScript对于this的处理是:
    判断MemberExpression是不是Reference，如果是Reference，用GetValue获取base值，如果base是对象，     this指向base，如果base是EnvironmentRecord，返回undefined，如果不是Reference返回undefined。
    if(MemberExpression === Reference){
    	if(typeOf base === Object){
    		this = base
    	}else if(base === EnvironmentRecord){
    		this = undefined
    	}
    } else{
        this = undefined
    }

0- Reference
	是对语言底层行为的一种描述，Reference 定义为“被解析的命名绑定，
    (由标识符解析和属性访问创建）；
     标识符:数据被命名之后，名字就是标识符；
     标识符解析：一层层的寻找数据，foo(寻找foo函数)
     属性访问：foo.bar
	Reference = {
		base:, 属性所在的对象或者是EnvironmentRecord，
				值为[ undefined, an Object, a Boolean, a String, a Number, 
				     or an environment record ]
		name:,属性的名称
		strict:是否是严格模式
	}
    GetBase：是获取Reference的base值的一种方法；
    IsPropertyReference：判断base是否是一个对象，是就返回true;
	GetValue:直接获取对应的name的值，返回的是真正的值，而不是Reference；
1- 确定函数的调用表达式
	var foo = {
    bar: function () {
        return this;
    }
	};

    foo.bar(); // foo

    // bar对应的Reference是：
    var BarReference = {
        base: foo,
        propertyName: 'bar',
        strict: false
    };


2- 在调用时，确认属性访问表达式(MemberExpression)，如果MemberExpression是Reference，GetValue返回     base，
	2.1 通过IsPropertyReference(v)来判断，当v是对象，this = base;
3-当遇到MemberExpression被包裹，GetValue获取被包裹的结果  (=  || ，)
	1.(foo.bar = foo.bar)()；返回的是foo.bar的值是一个函数，不是Reference
	2.(false || foo.bar)()；返回的是foo.bar的值是一个函数，不是Reference
	3.(foo.bar, foo.bar)()；返回的是foo.bar的值是一个函数，不是Reference
	因此在严格模式下this指向undefined，非严格模式下指向window。
   	
```

##### toString / valueOf  -> 隐式 / 显示转换

```javascript
出现背景:带有 +,-,==,++,--,*,!,/。      /等关系运算符/拼接符等情况；
参与数据：基本数据类型(null,undefined,Boolean,number,string,Symbol)
        复杂数据类型(object,array,function,regExp...)
难点1：字符串拼接符(+)和关系运算符(+)的区分，
	 - 当+两边有一边是字符串时，+就是字符串拼接符。将另一种类型转换为基本类型，再转换为            string类型
     - 不满足第一点 就是运算符。将两边最终转换为number运算。
难点2：复杂数据类型的转换。
	 - 当遇到拼接符时会先运行valueOf，如果返回值是基本类型直接返回，不是基本类型，运行            toString(),返回的是基本数据类型就返回，如果不是就报错。
难点3：当两边都是字符串时，比较unicode码
难点4：数组的toString会返回字符串拼接，对象的toString会返回[object,Object]
难点5：!运算符 会将(0,NaN,undefined,null,'',false)认为是false，转换为true，
       其他情况都认为是true,转换为false。而且!优先级高于 ==

坑：
	[] == 0 true
	![] == 0 true

	[] == ![] true
	[] == [] false    //比较的是地址

	{} == !{} false
	{} == {}  false   //比较的是地址

注：valueOf 和 toString都是Object.prototype上的函数，可在对象内定义遮蔽。

```

##### 三种事件模型

```javascript
1-DOM0级模型：触发绑定事件，没有传播
2-IE事件模型：触发绑定事件，向上传播
1-DOM2级事件模型：捕获->事件处理->冒泡
```

##### 事件委托

```javascript
依托于事件冒泡的，统一管理机制，在事件冒泡时，冒泡到父级，父级根据event.target识别事件目标，做出相应操作。
```

##### 捕获 / 冒泡

```javascript
事件传播：
	事件发生在某个DOM元素时，并不局限在此DOM元素上，会向上/向下传播。
事件捕获：
	从window ->document ->body，向下寻找元素，直到目标元素，
事件冒泡：
	从目标元素开始，向上传播，直到window
    isCapture:默认为false，在冒泡阶段发生，为true在捕获阶段发生。
    el.addEventListener(event, callback, isCapture);
    在callback里可用event.stopPropagation() / event.cancelBubble = true             取消继续传播
取消默认事件:
	e.preventDefault() / e.returnValue = false
```

##### DOM操作

```javascript
document.createDocumentFragment()  //创建DOM片段
        .createElement()           //创建具体节点
        .createTextNode()          //创建文本节点
el.appendChild(node)               //添加子节点
  .removeChild(node)               //移除子节点
  .replaceChild(new, old)          //替换子节点
  .insertBefore(new, old)          //在某一个节点前添加节点
document.getElementById();
         getElementsByName();
         getElementsByTagName();
         getElementsByClassName();
         querySelector();
         querySelectorAll();
el.getAttribute(key);
   setAttribute(key, value);
   hasAttribute(key);
   removeAttribute(key);

```

##### **垃圾回收机制**

```javascript
1- 引用计数法:
	定义：计算对对象的引用次数，当为0时，说明已经不需要了，可被回收。
    缺点：【循环引用】。
2- 标记清除法
	定义：将'不再使用的对象'定义为'无法到达的对象'，从根部(全局对象)走，能到达的对象，是还需要的，无法到达          的对象被标记为不再使用，进行回收
```

##### 哪些操作会造成内存泄漏？

```javascript
1.意外的全局变量
2.被遗忘的计时器或回调函数
3.脱离 DOM 的引用
4.闭包
```

##### **防抖 / 节流**

##### **call / apply / bind**



##### 模块化

```javascript
commonJS:
	0- 每一个文件就是一个模块，拥有自己独立的作用域，变量，以及方法.对其他的模块都不可见
	1- module代表当前模块,它的exports是对外的接口。require加载的就是module.exports
	2- 同步加载(缺点:浏览器等待);
	3- 输出的是值的拷贝，后续模块内的变化就不会影响输出的值。
	3- 模块可多次加载，但是只会在加载时运行一次，结果被缓存，后续加载会读取缓存结果，如果想再次加载，需清空缓存
AMD:
	输出：
		 define(id?, dependencies?,factory)
    引入：
         require([dependencies], function(dependencies){})           
           
	0- 主要是requireJS 
	1- 【依赖前置】，在需要的依赖加载完成后，运行回调函数。[解决依赖顺序问题]
	2- 异步[解决了js同步加载浏览器等待问题]
CMD:
	输出：
    	define(id?, deps?, factory)
        /**********************       
               define(function(require, exports, module) {
                  var $ = require('jquery.js')
                  $('div').addClass('active');
                });
       ************/
    引入：
        seajs.use(['myModule.js'], function(my){
		});
	0- 主要是seaJS
	1- 【就近依赖】,用到某个模块时再require
	
ES6:
	导出：
    	export  / export default
	导入：
    	import

AMD 与 CMD的不同:
	1-AMD 依赖前置，定义模块时要声明其依赖的模块，
      CMD 就近依赖，用到某个模块再require。
      AMD 在加载完成define好的模块就会立即执行，所有执行完成后，遇到require执行主逻辑【提前加载】
      CMD 在加载完成define好的模块，仅仅是下载不执行，只有需要用时require才执行模块【按需加载】
      AMD用户体验好，CMD性能好。

```

------

### ES6

------

##### Class

##### **proxy**

```javascript
- get(target, propKey, receiver)：拦截对象属性的读取，比如proxy.foo和proxy['foo']。
- set(target, propKey, value, receiver)：拦截对象属性的设置，比如
	                                   proxy.foo = v或proxy['foo'] = v，返回一个布尔值。
- has(target, propKey)：拦截propKey in proxy的操作，返回一个布尔值。
- deleteProperty(target, propKey)：拦截delete proxy[propKey]的操作，返回一个布尔值。
- ownKeys(target)：拦截 Object.getOwnPropertyNames(proxy)
        Object.getOwnPropertySymbols(proxy)、Object.keys(proxy)、for...in循环，返回一个数组。
   该方法返回目标对象所有自身的属性的属性名，而Object.keys()的返回结果仅包括目标对象自身的可遍历属性。
- getOwnPropertyDescriptor(target, propKey)：拦截Object.getOwnPropertyDescriptor(proxy,      propKey)，返回属性的描述对象。
- defineProperty(target, propKey, propDesc)：拦截Object.defineProperty(proxy, propKey,      propDesc）、Object.defineProperties(proxy, propDescs)，返回一个布尔值。
- preventExtensions(target)：拦截Object.preventExtensions(proxy)，返回一个布尔值。
- getPrototypeOf(target)：拦截Object.getPrototypeOf(proxy)，返回一个对象。
- isExtensible(target)：拦截Object.isExtensible(proxy)，返回一个布尔值。
- setPrototypeOf(target, proto)：拦截Object.setPrototypeOf(proxy, proto)，返回一个布尔值。如   果目标对象是函数，那么还有两种额外操作可以拦截。
- apply(target, object, args)：拦截 Proxy 实例作为函数调用的操作，比如proxy(...args)、
   proxy.call(object, ...args)、proxy.apply(...)。
- construct(target, args)：拦截 Proxy 实例作为构造函数调用的操作，比如new proxy(...args)。
```

##### Reflect

##### Promise

```javascript
1- 三种状态,pending/rejected/resolved,只能pending转为 rejected和resolved
2- then有两个支路(成功/失败),由前一个promise确定.只有前一个状态确定才会执行后续的程序
3- thenable,兼容其他的类promise
4- 控制反转,内层返回的promise可控制外层的promise

代码路径：'../Promise'
```

##### async / await

##### generator

------

### Vue

------

##### 发布订阅模式

```
1- 闭包dep,添加 __ob__ 属性(引用value,有自己的dep)
2- 数组：劫持方法(对于添加属性的方法[push,unshift,splice(，，value)]进行劫持观测；
      (pop,shift,sort,reverse直接进行依赖更新))。
3- $set /$delete ,用 __ob__.dep 进行依赖更新 

路径：'./definePropoty'
```

发布订阅模式

