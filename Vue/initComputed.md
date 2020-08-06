**initComputed(vm, computed)**

初始化 options中的 computed 属性。

```javascript
function initComputed (vm: Component, computed: Object) {
  // $flow-disable-line
  const watchers = vm._computedWatchers = Object.create(null)
  // computed properties are just getters during SSR
  const isSSR = isServerRendering()

  for (const key in computed) {
    const userDef = computed[key]
    const getter = typeof userDef === 'function' ? userDef : userDef.get
    if (process.env.NODE_ENV !== 'production' && getter == null) {
      warn(
        `Getter is missing for computed property "${key}".`,
        vm
      )
    }

    if (!isSSR) {
      // create internal watcher for the computed property.
      /*
      * 为计算属性创建内部观察程序
      * */
      watchers[key] = new Watcher(
        vm,
        getter || noop,
        noop,
        computedWatcherOptions
      )
    }

    // component-defined computed properties are already defined on the
    // component prototype. We only need to define computed properties defined
    // at instantiation here.
    /*
    * 已在组件原型上定义组件定义的计算属性。我们只需要在这里定义实例化时定义的计算属性
    * */
    if (!(key in vm)) {
      defineComputed(vm, key, userDef)
    } else if (process.env.NODE_ENV !== 'production') {
      if (key in vm.$data) {
        warn(`The computed property "${key}" is already defined in data.`, vm)
      } else if (vm.$options.props && key in vm.$options.props) {
        warn(`The computed property "${key}" is already defined as a prop.`, vm)
      }
    }
  }
}
1-在实例上新建一个 _computedWatchers 属性用于存放computed的watcher实例
2-获取computed的getter属性
3-判断环境是否是ssr
	-非ssr的话,用computed的getter属性生成watcher实例,并将computed对应的watcher实例存到实例上的	         _computedWatchers中,
        vm._computedWatchers[key] =
        						new Watcher(vm, getter, noop, computedWatcherOptions)
4-对vm上的属性进行校验,因为我们要把computed属性也挂到vm实例上，所以computed名称不能与props，data中的属性值相同。
5-当校验通过,对computed的getter进行劫持,根据是否是服务端渲染,进行不同的劫持,
    -createComputedGetter  //非服务端渲染
	-createGetterInvoker   //服务端渲染
6-最后将computed对应的key添加到vm实例上
```

**createComputedGetter**

```javascript
  function createComputedGetter (key) {
    return function computedGetter () {
      var watcher = this._computedWatchers && this._computedWatchers[key];
      if (watcher) {
        if (watcher.dirty) {
          watcher.evaluate();
        }
        if (Dep.target) {
          watcher.depend();
        }
        return watcher.value
      }
    }
1-对computed的属性劫持,是每当使用computed属性时(get),都会调用我们的劫持属性,劫持属性会对computedWatcher进行一些操作,在最后分析。
      
function createGetterInvoker(fn) {
    return function computedGetter () {
      return fn.call(this, this)
    }
  }     
1-服务端渲染,对computed的劫持,没有watcher？？？？？？？？？？？？      
```

vue官网对于 computed 属性的列举

```javascript
 // 仅读取
    aDouble: function () {
      return this.a * 2
    },
    // 读取和设置
    aPlus: {
      get: function () {
        return this.a + 1
      },
      set: function (v) {
        this.a = v - 1
      }
    }
```

**computedWatcher**

```javascript
watchers[key] = new Watcher(
        vm,                    //实例
        getter || noop,        //computed属性调用的函数
        noop,                  //空函数
        computedWatcherOptions //计算属性的特性值 { lazy: true }
      )
```

**Watcher 构造函数**

由于我们的watcher构造函数,被运用于三种watcher,我们的computedWatcher只走其中的一部分,因此简化为

```javascript
  var Watcher = function Watcher (
    vm,              //实例
    expOrFn,         //computed属性调用的函数
    cb,              //未传
    options,         //{ lazy: true }
    isRenderWatcher  //未传
  ) {
    this.vm = vm;
    vm._watchers.push(this);
    this.lazy = !!options.lazy;
    this.cb = cb;
    this.id = ++uid$1; // uid for batching
    this.active = true;
    this.dirty = true
    this.deps = [];
    this.newDeps = [];
    this.depIds = new _Set();
    this.newDepIds = new _Set();
    this.expression =  expOrFn.toString();
    this.getter = expOrFn;
    this.value = undefined
  };
1-我们在初始化computed时在vm._computedWatchers保存的watcher就是上面这些属性。
2-由于我们对computed函数的get做了劫持处理,在使用computed属性时,调用的是createComputedGetter的返回函   数,会将我们保存在vm._computedWatchers中对应的computedWatcher取出来。由于我们的watcher.dirty是true,运行watcher.evaluate()
```

watcher.evaluate()

```javascript
  Watcher.prototype.evaluate = function evaluate () {
    this.value = this.get();
    this.dirty = false;
  };
```

Watcher.prototype.get

```
  Watcher.prototype.get = function get () {
    pushTarget(this);
    var value;
    var vm = this.vm;
    try {
      value = this.getter.call(vm, vm);
    } catch (e) {
      if (this.user) {
        handleError(e, vm, ("getter for watcher \"" + (this.expression) + "\""));
      } else {
        throw e
      }
    } finally {
      // "touch" every property so they are all tracked as
      // dependencies for deep watching
      if (this.deep) {
        traverse(value);
      }
      popTarget();
      this.cleanupDeps();
    }
    return value
  };
1- 运行计算属性watcher的get方法,
2- 将计算属性的watcher赋值给Dep.target
3- 运行计算属性的函数,将值赋值给value
    - 如果在计算属性的函数内,依赖了data，props，methods的话，由于Dep.target是计算属性的watcher,那么在       收集依赖时收集的也是计算属性。【关于依赖互相收集的过程后续单独分析】
4- 最后将计算属性watcher出栈，Dep.target还原为外层watcher,    
5- this.cleanupDeps()
    -对depIds newDepIds newDeps deps进行维护。防止重复收集？？？？？
```

