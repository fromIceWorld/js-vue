## new Vue

概述new Vue的过程其实是调用了 Vue构造函数原型上的 _init方法

```javascript
  Vue.prototype._init = function (options) {
    const vm = this
    vm._uid = uid++
    vm._isVue = true
    if (options && options._isComponent) { 
      initInternalComponent(vm, options)
    }
    else {
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm)
    }
    else {
      vm._renderProxy = vm
    }
    vm._self = vm
    /*
     ---------------------------------初始化------------------------------                        */

    /*---------------------------------生命周期初始化-----------
    *   vm.$parent = 父组件
        vm.$root = parent ? parent.$root : vm
        vm.$children = []
        vm.$refs = {}
        vm._watcher = null
        vm._inactive = null
        vm._directInactive = false
        vm._isMounted = false
        vm._isDestroyed = false
        vm._isBeingDestroyed = false
    *
    *  1-初始化一些属性
    *  2-将第一个【非抽象父组件】保存到实例中 并将自身保存到父组件的 $children中
    *
    * ----------------------------------------*/
      initLifecycle(vm)
    //----------------------------------事件初始化-------------------------
      initEvents(vm)   //父组件给子组件的注册事件中 把自定义事件传给子组件，在子组件实例化的时候进行初始化；浏览器原生事件在父组件中处理


    //----------------------------------render初始化--------------------------
      initRender(vm)
    //调用beforeCreated钩子函数
      callHook(vm, 'beforeCreate')
    //初始化Injections
      initInjections(vm) // resolve injections before data/props
    //初始化状态
      initState(vm)
    //初始化Provide
      initProvide(vm) // resolve provide after data/props
    //调用created钩子函数
      callHook(vm, 'created')
    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
```

在 _init过程中，主要流程是：实例化Vue，为vm实例添加Vue构造函数上的属性。

```javascript
vm._uid
vm._isVue = true
vm.$options = mergeOptions(resolveConstructorOptions(vm.constructor), options, vm)
vm._renderProxy
vm._self = vm
##其中最重要的是mergeOptions的过程和 _renderProxy属性

##mergeOptions过程
1-mergeOptions是将Vue构造函数中的options属性添加到实例上（增强vm功能）

resolveConstructorOptions(vm.constructor)的解析结果为：
Vue.options{
    components：{KeepAlive, Transition, TransitionGroup}，
    directives：{model, show}，
    filters：{}，
    _base :Vue
}
mergeOptions函数将用户输入的props / inject / directives 进行规范化然后将Vue构造函数上的属性和在实例上extend 和mixin的属性添加到实例上。根据不同的属性有不同的合并策略。具体合并流程解析在（src\core\util\options.js）
##-- initProxy 过程
1-对vm进行代理，生成_renderProxy属性，在渲染时调用_renderProxy，根据拦截器给出友好提示。
```

在为 vm 实例 规范数据格式 /  合并属性 / 添加代理属性 /  后 继续初始化我们的 vm 实例：

```javascript
## --  initLifecycle(vm)
		vm.$parent = 父组件
        vm.$root = parent ? parent.$root : vm
        vm.$children = []
        vm.$refs = {}
        vm._watcher = null
        vm._inactive = null
        vm._directInactive = false
        vm._isMounted = false
        vm._isDestroyed = false
        vm._isBeingDestroyed = false
为实例添加状态属性，建立节点间的父子关系，与保存根节点。
## -- initEvents(vm)
        vm._events = Object.create(null)
        vm._hasHookEvent = false
        const listeners = vm.$options._parentListeners
        if (listeners) {
           updateComponentListeners(vm, listeners)
        }
初始化事件状态，更新事件。【后续单独分析事件。】
## -- initRender(vm)
vm._vnode
vm._staticTrees
vm.$slots
vm.$scopedSlots
vm._c = (a, b, c, d) => createElement(vm, a, b, c, d, false)
vm.$createElement = (a, b, c, d) => createElement(vm, a, b, c, d, true)
vm.$attrs
vm.$listeners
【后续与 插槽、事件结合在一起分析】
## -- callHook(vm, 'beforeCreate')
执行beforeCreate 钩子函数
## -- initInjections(vm)
对inject属性 进行观测，同时防止改变
## -- initState(vm)
对props / methods / data / computed / watch 进行观察

props=》
props属性与组件中的props有关【分析编译后再分析】

methods=》
先对method进行验证，验证通过后处理
vm[key] = typeof methods[key] !== 'function' ? noop : bind(methods[key], vm)
将bind返回的函数赋值 vm 上。

computed=》
对computed进行观察，建立一些watcher。与数据绑定有关【后续分析】

watch=》
与数据绑定有关【后续分析】

data=》
单独分析
```

