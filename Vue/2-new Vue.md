## new Vue

new Vue的过程其实是调用了 Vue构造函数原型上的 _init方法(只分析初始化需要走的代码)

```javascript
  Vue.prototype._init = function (options) {
    const vm = this
    vm._uid = uid++
    vm._isVue = true

      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
      
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm)
    }else {
      vm._renderProxy = vm
    }
      
    vm._self = vm
    /*---------------------------------初始化过程------------------------------*/      

    /*---------------------------------生命周期初始化-----------*/
         initLifecycle(vm)
    //----------------------------------事件初始化-------------------------
      initEvents(vm)   
    //----------------------------------render初始化--------------------------
      initRender(vm)
    //调用beforeCreated钩子函数
      callHook(vm, 'beforeCreate')
    //初始化Injections
      initInjections(vm) //
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

在 _init过程中，主要流程是：实例化Vue，为vm实例添加能力。

**1-添加一些基础状态属性**

```javascript
vm._uid
vm._isVue = true
##mergeOptions过程
1-mergeOptions是将Vue构造函数中的options属性添加到实例上（增强vm功能）

resolveConstructorOptions(vm.constructor)的解析结果为：
Vue.options{
    components：{KeepAlive, Transition, TransitionGroup}，
    directives：{model, show}，
    filters：{}，
    _base :Vue
}
mergeOptions函数将用户输入的props / inject / directives 进行规范化然后将Vue构造函数上的属性和用户options的属性合并后添加到实例上。根据不同的属性有不同的合并策略。具体合并流程解析在（src\core\util\options.js）
##-- initProxy 过程
1-对vm进行代理，生成_renderProxy属性，在渲染时调用_renderProxy，根据拦截器给出友好提示。
```

**2-合并配置项**

```javascript
vm.$options = mergeOptions(resolveConstructorOptions(vm.constructor), options, vm)
//---------------------------------------------------------
1-resolveConstructorOptions(vm.constructor)
    function resolveConstructorOptions (Ctor) {
        var options = Ctor.options;
        if (Ctor.super) {
          var superOptions = resolveConstructorOptions(Ctor.super);
          var cachedSuperOptions = Ctor.superOptions;
          if (superOptions !== cachedSuperOptions) {
            // super option changed,
            // need to resolve new options.
            Ctor.superOptions = superOptions;
            // check if there are any late-modified/attached options (#4976)
            var modifiedOptions = resolveModifiedOptions(Ctor);
            // update base extend options
            if (modifiedOptions) {
              extend(Ctor.extendOptions, modifiedOptions);
            }
            options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions);
            if (options.name) {
              options.components[options.name] = Ctor;
            }
          }
        }
        return options
      }
 1.1- 由于vm.constructor是Vue,Vue的最终结果是在第一节最后，初始Vue暂时没有super属性，所以返回
     Vue.options = {
         components:{KeepAlive, Transition, TransitionGroup},
         directive:{model, show},
         filter:{},
         _base :Vue
     }
2- mergeOptions(Vue.options, options, vm)
   篇幅较长，单独在2.1分析。
```

**3-添加代理属性**

```javascript
vm._renderProxy
vm._self = vm
1- vm._renderProxy是对vm进行代理，在渲染获取数据的时候，有错时，给出提示。
2- vm._self引用自身。
```

**4-初始化生命周期**

```javascript
  function initLifecycle (vm) {
    var options = vm.$options;

    // locate first non-abstract parent
    var parent = options.parent;
    if (parent && !options.abstract) {
      while (parent.$options.abstract && parent.$parent) {
        parent = parent.$parent;
      }
      parent.$children.push(vm);
    }

    vm.$parent = parent;
    vm.$root = parent ? parent.$root : vm;

    vm.$children = [];
    vm.$refs = {};

    vm._watcher = null;
    vm._inactive = null;
    vm._directInactive = false;
    vm._isMounted = false;
    vm._isDestroyed = false;
    vm._isBeingDestroyed = false;
  }
0-初始化状态信息，建立节点间的关系，保存根节点
```

**5-初始化事件相关**

```javascript
  function initEvents (vm) {
    vm._events = Object.create(null);
    vm._hasHookEvent = false;
    // init parent attached events
    var listeners = vm.$options._parentListeners;
    if (listeners) {
      updateComponentListeners(vm, listeners);
    }
  }
0-与组件有关，初始化父子组件间的事件【在分析组件时，再用】
```

**6-初始化渲染相关**

```javascript
  function initRender (vm) {
    vm._vnode = null; // the root of the child tree
    vm._staticTrees = null; // v-once cached trees
    var options = vm.$options;
    var parentVnode = vm.$vnode = options._parentVnode; // the placeholder node in parent tree
    var renderContext = parentVnode && parentVnode.context;
    vm.$slots = resolveSlots(options._renderChildren, renderContext);
    vm.$scopedSlots = emptyObject;
    // bind the createElement fn to this instance
    // so that we get proper render context inside it.
    // args order: tag, data, children, normalizationType, alwaysNormalize
    // internal version is used by render functions compiled from templates
    vm._c = function (a, b, c, d) { return createElement(vm, a, b, c, d, false); };
    // normalization is always applied for the public version, used in
    // user-written render functions.
    vm.$createElement = function (a, b, c, d) { return createElement(vm, a, b, c, d, true); };

    // $attrs & $listeners are exposed for easier HOC creation.
    // they need to be reactive so that HOCs using them are always updated
    var parentData = parentVnode && parentVnode.data;

    /* istanbul ignore else */
    {
      defineReactive(vm, '$attrs', parentData && parentData.attrs || emptyObject, function () {
        !isUpdatingChildComponent && warn("$attrs is readonly.", vm);
      }, true);
      defineReactive(vm, '$listeners', options._parentListeners || emptyObject, function () {
        !isUpdatingChildComponent && warn("$listeners is readonly.", vm);
      }, true);
    }
  }
0-与插槽，渲染函数，$attrs, $listeners有关。
```

**7-调用[beforeCreate]生命周期钩子函数**

```javascript
  function callHook (vm, hook) {
    // #7573 disable dep collection when invoking lifecycle hooks
    pushTarget();
    var handlers = vm.$options[hook];
    var info = hook + " hook";
    if (handlers) {
      for (var i = 0, j = handlers.length; i < j; i++) {
        invokeWithErrorHandling(handlers[i], vm, null, vm, info);
      }
    }
    if (vm._hasHookEvent) {
      vm.$emit('hook:' + hook);
    }
    popTarget();
  }
0-调用生命周期钩子函数，如果父组件有监听子组件的生命周期，发射生命周期状态。
```

**8-初始化[inject]属性**

```javascript
  function initInjections (vm) {
    var result = resolveInject(vm.$options.inject, vm);
    if (result) {
      toggleObserving(false);//非观测
      Object.keys(result).forEach(function (key) {
        /* istanbul ignore else */
        {
          defineReactive(vm, key, result[key], function () {
            warn(
              "Avoid mutating an injected value directly since the changes will be " +
              "overwritten whenever the provided component re-renders. " +
              "injection being mutated: \"" + key + "\"",
              vm
            );
          });
        }
      });
      toggleObserving(true);
    }
  }
function resolveInject (inject, vm) {
    if (inject) {
      // inject is :any because flow is not smart enough to figure out cached
      var result = Object.create(null);
      var keys = hasSymbol
        ? Reflect.ownKeys(inject)
        : Object.keys(inject);

      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        // #6574 in case the inject object is observed...
        if (key === '__ob__') { continue }
        var provideKey = inject[key].from;
        var source = vm;
        while (source) {
          if (source._provided && hasOwn(source._provided, provideKey)) {
            result[key] = source._provided[provideKey];
            break
          }
          source = source.$parent;
        }
        if (!source) {
          if ('default' in inject[key]) {
            var provideDefault = inject[key].default;
            result[key] = typeof provideDefault === 'function'
              ? provideDefault.call(vm)
              : provideDefault;
          } else {
            warn(("Injection \"" + key + "\" not found"), vm);
          }
        }
      }
      return result
    }
  }
0-需要与provide一起看，获取父级上的provid 提供的key，父级没有就接着向上级寻找，最终只有两种结果(找到 | 没   找到)
1-找到就直接赋值；
1.1-没找到，就看有没有default属性，有就使用，没有就告警
2- 将inject值赋值到vm上，且阻止改变inject。不对inject做观察赋能
```

**9-初始化[state]状态属性**

state包括props，methods，data，computed，watch属性，在【2.2-2.4】

**10-初始化[provide]状态属性**

```javascript
  function initProvide (vm) {
    var provide = vm.$options.provide;
    if (provide) {
      vm._provided = typeof provide === 'function'
        ? provide.call(vm)
        : provide;
    }
  }
0-需与inject一起看
1-provide提供数据，inject接收数据。
2-有provide，会将provide转换后存到_provide.
```

**11-调用[created]生命周期钩子函数**

与 7 相同

**12-挂载**

```javascript
if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
## $mount 函数是在Vue的原型上（src\platforms\web\entry-runtime-with-compiler.js）
1-在挂载时，会根据render，template，el 确定挂载的内容
   -根据el属性,获取el属性对应的Element(1-el是string类型，根据id获取dom，2-el是其他类型，直接返回el), 	   在初始化渲染时，我们会有一个渲染的优先顺序，render属性为主，当没有render属性，寻找template属性，		template如果是字符串且以'#'开头，就根据'#id',去找到id对应的dom属性，获取innerHTML当作			     template,否则template可能是Element，是Element的话直接获取Element的innerHTML当作模板,都不是的		话，告警,没有template的话,根据el属性(此时的el属性已经是Element)获取outerHTML作为template,然	后     根据我们获取的template属性,对template进行编译(compiler在单独一个文件里'./compiler')
   -总结：
	 也就是当有render属性时就不需要对template所对应的值进行编译了，没有render，也是将template对应的值转	 换成render进行挂载。
2-在对template进行编译后生成render或者本来就有有render，对render进行挂载
   -运行 mount.call(this, el, hydrating)进行挂载
   
3- mount函数是缓存的[公用]的Vue.prototype.$mount方法
   -在这个方法中，实际是调用的mountComponent(this,el,hydrating)//非服务端渲染情况下hydrating为		false
```

**mountComponent**

mountComponent 方法在初始化渲染阶段使用，在组件渲染阶段同样使用，我们现在只分析初始化渲染，因此会对 mountComponent 进行简化。

```javascript
  function mountComponent (
    vm,
    el,
    hydrating  //非服务端渲染为false
  ) {
    vm.$el = el;
    callHook(vm, 'beforeMount');
    var updateComponent = function () {
        vm._update(vm._render(), hydrating);
      };
    new Watcher(vm, updateComponent, noop, {
      before: function before () {
        if (vm._isMounted && !vm._isDestroyed) {
          callHook(vm, 'beforeUpdate');
        }
      }
    }, true /* isRenderWatcher */);
    hydrating = false;
    if (vm.$vnode == null) {
      vm._isMounted = true;
      callHook(vm, 'mounted');
    }
    return vm
  }

1-保存el
2-调用'beforeMount'钩子函数
3-生成 updateComponent 
3-new Watcher() 渲染watcher,进行渲染 [渲染watcher,和其他两个一起分析]
4-根据调用时间，判断是mounted 还是 update
5-将实例返回
```

