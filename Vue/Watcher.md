## Watcher

当我们走到mount阶段，我们会调用我们web端的Vue.prototype.$mount函数，在 $mount函数中，我们会对 

el / template / render 属性进行 抉择（模板优先顺序，【之后再写】），将模板进行解析后生成渲染函数及静态渲染函数，最后再调用运行时mount函数进行挂载[--- mount.call(this, el, hydrating) ---]。

运行时mount主要调用了[---- mountComponent(this, el, hydrating) ---],mountComponent函数中，我们收集依赖，运行生命周期函数（beforeMount，mounted ），主要分析依赖的收集 new Watcher的过程。

```javascript
updateComponent = () => {
      vm._update(vm._render(), hydrating)
    }
new Watcher(vm, updateComponent, noop, {
    before () {
      if (vm._isMounted && !vm._isDestroyed) {
        callHook(vm, 'beforeUpdate')
      }
    }
  }, true /* isRenderWatcher */)
```



