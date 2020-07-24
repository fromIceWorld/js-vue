## Vue构造函数的生成

版本：@2.6.10

环境：web ; runtime-with-compiler

思维图：https://www.processon.com/view/link/5efc60aa6376891e81f3d350

------

我们使用的Vue是一个经过层层加强的构造函数，

①在src/core/instance/index.js中的增强：

------

```javascript
initMixin(Vue)
	//增加 Vue.prototype._init()函数
```

```javascript
stateMixin(Vue)
	//Vue.prototype.$data
	//Vue.prototype.$props
	//Vue.prototype.$set
	//Vue.prototype.$delete
	//Vue.prototype.$watch
```

```javascript
eventsMixin(Vue)
	//Vue.prototype.$on
	//Vue.prototype.$once
	//Vue.prototype.$off
	//Vue.prototype.$emit
```

```javascript
lifecycleMixin(Vue)
	//Vue.prototype._update
	//Vue.prototype.$forceUpdate
	//Vue.prototype.$destroy
```

```javascript
renderMixin(Vue)
	//Vue.prototype.$nextTick
	//Vue.prototype._render

	// Vue.prototype._o = markOnce
  	// Vue.prototype._n = toNumber
  	// Vue.prototype._s = toString
 	// Vue.prototype._l = renderList
    // Vue.prototype._t = renderSlot
    // Vue.prototype._q = looseEqual
    // Vue.prototype._i = looseIndexOf
    // Vue.prototype._m = renderStatic
    // Vue.prototype._f = resolveFilter
    // Vue.prototype._k = checkKeyCodes
    // Vue.prototype._b = bindObjectProps
    // Vue.prototype._v = createTextVNode
    // Vue.prototype._e = createEmptyVNode
    // Vue.prototype._u = resolveScopedSlots
    // Vue.prototype._g = bindObjectListeners
    // Vue.prototype._d = bindDynamicKeys
    // Vue.prototype._p = prependModifier
```

②src/core/index.js

```
Vue.config
	//配置所在位置：src/core/config.js
```

```
Vue.util = {
    warn,
    extend,
    mergeOptions,
    defineReactive
  }

  Vue.set = set
  Vue.delete = del
  Vue.nextTick = nextTick
  Vue.observable
  Vue.options = {
  	components:{ KeepAlive },   //内置组件KeepAlive
  	directives:{},
  	filters:{}
  	}
  Vue.options._base = Vue
  Vue.use	
  Vue.mixin
  Vue.component=function   //定义组件
  Vue.directives=function  //定义指令
  Vue.filters=function     //定义过滤器
  Vue.prototype.$isServer   
  Vue.prototype.$ssrContext
  Vue.protottype.FunctionalRenderContext
  Vue.version = 2.6.10
```

 ③ src/platforms/web/runtime/index.js

```
加入web平台属性

配置：
Vue.config.mustUseProp = mustUseProp
Vue.config.isReservedTag = isReservedTag  //保留标签
Vue.config.isReservedAttr = isReservedAttr //保留属性
Vue.config.getTagNamespace = getTagNamespace //命名空间
Vue.config.isUnknownElement = isUnknownElement 

指令：
  Vue.options = {
  	components:{ KeepAlive, Transition,TransitionGroup }, //加入Transition,TransitionGroup
  	directives:{model, show}, //加入model, show
  	filters:{}
  	}
原型：
  Vue.prototype.__patch__ = patch
  Vue.prototype.$mount
```

④src/platforms/web/entry-runtime-with-compiler.js

```

const mount = Vue.prototype.$mount //缓存公用mount
Vue.prototype.$mount               //加入平台mount
Vue.compile = compileToFunctions   加入属性
```

------

以上内容就是Vue@2.6.10构造函数的全部属性。