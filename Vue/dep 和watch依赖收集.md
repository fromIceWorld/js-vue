**依赖收集**

我们在对数据进行观察赋能时，对我们的属性的get / set 进行劫持时[<defineReactive>]，又有一个实例化dep的操作,我们的get 被添加了一些操作【数据与视图绑定的关键步骤】:

get:

​	~ 当我们获取数据时，如果有Dep.target,说明是处于三种三种watcher中的一种,运行dep.depend(),

​	~dep.depend()会调用watcher.addDep(this),如果watcher中的newDepIds中还没收集这个dep，就将dep.id

​       收集到 newDepIds，将dep实例收集到 newDeps中。如果watcher实例中的depIds中没有这个dep的id，就        	   运行dep.addSub(this)将watcher收集到dep.subs中,这就是一个依赖相互收集的过程。

set：

​	~更改属性时会触发dep.notify(),将dep.subs中收集的watcher都拿出,按照id从小到大排列(config.async为    

​    false),然后循环运行watcher.updata()函数     	  

在我们的初始化渲染阶段，我们在挂载时,执行new Watcher(),进行初始化渲染，用到我们的数据时，触发依赖收集,在最后阶段this.cleanupDeps(),将我们的newDeps，newDepIds，放到对应的deps，depIds，在后续的更新中，也会通过对比新收集的依赖和旧的依赖,来进行对比添加或者删除依赖,最后总是将newDeps，newDepIds清空。

**defineReactive**

```javascript
  function defineReactive (
    obj,
    key,
    val,
    customSetter,
    shallow
  ) {
    var dep = new Dep();

    var property = Object.getOwnPropertyDescriptor(obj, key);
    if (property && property.configurable === false) {
      return
    }

    // cater for pre-defined getter/setters
    var getter = property && property.get;
    var setter = property && property.set;
    if ((!getter || setter) && arguments.length === 2) {
      val = obj[key];
    }

    var childOb = !shallow && observe(val);
    Object.defineProperty(obj, key, {
      enumerable: true,
      configurable: true,
      get: function reactiveGetter () {
        var value = getter ? getter.call(obj) : val;
        if (Dep.target) {
          dep.depend();
          if (childOb) {
            childOb.dep.depend();
            if (Array.isArray(value)) {
              dependArray(value);
            }
          }
        }
        return value
      },
      set: function reactiveSetter (newVal) {
        var value = getter ? getter.call(obj) : val;
        /* eslint-disable no-self-compare */
        if (newVal === value || (newVal !== newVal && value !== value)) {
          return
        }
        /* eslint-enable no-self-compare */
        if ( customSetter) {
          customSetter();
        }
        // #7981: for accessor properties without setter
        if (getter && !setter) { return }
        if (setter) {
          setter.call(obj, newVal);
        } else {
          val = newVal;
        }
        childOb = !shallow && observe(newVal);
        dep.notify();
      }
    });
  }
```

Dep

```javascript
  var Dep = function Dep () {
    this.id = uid++;
    this.subs = [];
  };
  Dep.prototype.addSub = function addSub (sub) {
    this.subs.push(sub);
  };
  Dep.prototype.removeSub = function removeSub (sub) {
    remove(this.subs, sub);
  };
  Dep.prototype.depend = function depend () {
    if (Dep.target) {
      Dep.target.addDep(this);
    }
  };
  Dep.prototype.notify = function notify () {
    // stabilize the subscriber list first
    var subs = this.subs.slice();
    if ( !config.async) {
      // subs aren't sorted in scheduler if not running async
      // we need to sort them now to make sure they fire in correct
      // order
      subs.sort(function (a, b) { return a.id - b.id; });
    }
    for (var i = 0, l = subs.length; i < l; i++) {
      subs[i].update();
    }
  };
```

watcher.prototype

```javascript
  
Watcher.prototype.addDep = function addDep (dep) {
    var id = dep.id;
    if (!this.newDepIds.has(id)) {
      this.newDepIds.add(id);
      this.newDeps.push(dep);
      if (!this.depIds.has(id)) {
        dep.addSub(this);
      }
    }
  };
Watcher.prototype.update = function update () {
    /* istanbul ignore else */
    if (this.lazy) {
      this.dirty = true;
    } else if (this.sync) {
      this.run();
    } else {
      queueWatcher(this);
    }
  };

function queueWatcher (watcher) {
    var id = watcher.id;
    if (has[id] == null) {
      has[id] = true;
      if (!flushing) {
        queue.push(watcher);
      } else {
        // if already flushing, splice the watcher based on its id
        // if already past its id, it will be run next immediately.
        var i = queue.length - 1;
        while (i > index && queue[i].id > watcher.id) {
          i--;
        }
        queue.splice(i + 1, 0, watcher);
      }
      // queue the flush
      if (!waiting) {
        waiting = true;

        if ( !config.async) {
          flushSchedulerQueue();
          return
        }
        nextTick(flushSchedulerQueue);
      }
    }
  }
```

