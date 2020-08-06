## initData

在 new Vue 的过程中，有一步initData过程是将data数据变为可观察数据。

```javascript
function initData (vm: Component) {
  let data = vm.$options.data
  data = vm._data = typeof data === 'function'
    ? getData(data, vm)
    : data || {}
  if (!isPlainObject(data)) {
    data = {}
    process.env.NODE_ENV !== 'production' && warn(
      'data functions should return an object:\n' +
      'https://vuejs.org/v2/guide/components.html#data-Must-Be-a-Function',
      vm
    )
  }
  // proxy data on instance
  const keys = Object.keys(data)
  const props = vm.$options.props
  const methods = vm.$options.methods
  let i = keys.length
  while (i--) {
    const key = keys[i]
    if (process.env.NODE_ENV !== 'production') {
      if (methods && hasOwn(methods, key)) {
        warn(
          `Method "${key}" has already been defined as a data property.`,
          vm
        )
      }
    }
    if (props && hasOwn(props, key)) {
      process.env.NODE_ENV !== 'production' && warn(
        `The data property "${key}" is already declared as a prop. ` +
        `Use prop default value instead.`,
        vm
      )
    } else if (!isReserved(key)) {
      proxy(vm, `_data`, key)
    }
  }
  // observe data
  observe(data, true /* asRootData */)
}
##---流程拆分
1-在initData中获取 $options中的data数据，但是我们在mergeOptions中对data进行了合并，$options.data返回的是一个函数。所以要用genData去获取数据。然后将获取的数据(对象)赋值给 vm._data.

2-之后又对data的类型进行判断，data需要是一个object

3-将 _data 中的值代理到vm上

4-将data变成观察者observer(data, true)
```

**observer**(data, true)

```javascript
export function observe (value: any, asRootData: ?boolean): Observer | void {
  if (!isObject(value) || value instanceof VNode) {
    return
  }
  let ob: Observer | void
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__
  } else if (
    shouldObserve &&
    !isServerRendering() &&
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    !value._isVue
  ) {
    ob = new Observer(value)
  }
  if (asRootData && ob) {
    ob.vmCount++
  }
  return ob
}
##
1-data需要是object 而且不能是vnode的实例【这个还不太懂】
2-当data有 __ob__属性的话，整明data已经被observe，只需要将data.__ob__返回，避免重复观察。
3-当满足
	shouldObserve &&                                   //开关，在initProps时已开启
    !isServerRendering() &&                            //非服务端渲染？？？？
    (Array.isArray(value) || isPlainObject(value)) &&  //data是对象或者数组？？？？
    Object.isExtensible(value) &&                      //data可扩展
    !value._isVue                                      //data._isVue 为空或者为false ？？？？
	以上五个条件时才对数据进行观察。
    
ob = new Observer(value)
```

**ob = new Observer( value )**

```javascript
export class Observer {
  value: any;
  dep: Dep;
  vmCount: number; // number of vms that have this object as root $data

  constructor (value: any) {
    this.value = value
    this.dep = new Dep()
    this.vmCount = 0
    def(value, '__ob__', this)
    if (Array.isArray(value)) {
      if (hasProto) {
        protoAugment(value, arrayMethods)
      } else {
        copyAugment(value, arrayMethods, arrayKeys)
      }
      this.observeArray(value)
    } else {
      this.walk(value)
    }
  }

  /**
   * Walk through all properties and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   */
  walk (obj: Object) {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i])
    }
  }
  /**Observe a list of Array items.*/
  observeArray (items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}
## -- ob实例化属性
ob.value = data
ob.dep = new Dep()
def(data, '__ob__', ob) 【data.__ob__ = ob 将__ob__属性设置为不可枚举，防止重复观察】
__ob__.value又指向data,
__ob__.dep = new Dep()属性【与$set,有关】

--对象劫持


-- 数组劫持
当data是数组而且对象有__proto__属性时，将数组原型放到data原型上，但是在数组方法上做了一层拦截。
当 使用 push / unshift / splice 传递第三个参数 这些对数组数据进行改变或者新增数组数据的操作时，将会对新增/修改的数据进行观察。然后再 ob.dep.notify() 让依赖进行更新。
```

对于对象 我们用 defineReactive 对对象中的每个 key 进行赋能

```
export function defineReactive (
  obj: Object,
  key: string,
  val: any,
  customSetter?: ?Function,
  shallow?: boolean
) {
  const dep = new Dep()

  const property = Object.getOwnPropertyDescriptor(obj, key)
  if (property && property.configurable === false) {
    return
  }

  // cater for pre-defined getter/setters
  const getter = property && property.get
  const setter = property && property.set
  if ((!getter || setter) && arguments.length === 2) {
    val = obj[key]
  }

  let childOb = !shallow && observe(val)
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter () {
      const value = getter ? getter.call(obj) : val
      if (Dep.target) {
        dep.depend()
        if (childOb) {
          childOb.dep.depend()
          if (Array.isArray(value)) {
            dependArray(value)
          }
        }
      }
      return value
    },
    set: function reactiveSetter (newVal) {
      const value = getter ? getter.call(obj) : val
      /* eslint-disable no-self-compare */
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter()
      }
      // #7981: for accessor properties without setter
      if (getter && !setter) return
      if (setter) {
        setter.call(obj, newVal)
      } else {
        val = newVal
      }
      childOb = !shallow && observe(newVal)
      dep.notify()
    }
  })
}  
```

_ _ob_ _ 属性中dep的作用

```javascript
#####对于 data.__ob__ 属性中dep 的
假如我有data.a.b属性

observer（data）时 检测data是否是对象还是数组
ob = new Observer(data)      data.__ob__ ={value:data,dep:new Dep(),vmCount:0}    return ob
walk(data)  运行  defineReactive()   

defineReactive(data, a)  ==>   dep=new Dep()   val = data['a']    **childOb = observe(val)**  

defineReactive(data, a)是设置的data.a的get,get劫持触发的是data.a闭包保存的dep
childOb = observe(data.a)是设置的
                    data.a.__ob__ ={value:a.dep:new Dep().vmCount:1}    return ob

childOb = data.a._ _ob_ _

当childOb.dep.depend()
是在我们的data.a收集依赖时，data.a.__ob__收集同样的依赖,作用是在我们$set时,
#####
```

$set(target, key)

```javascript
export function set (target: Array<any> | Object, key: any, val: any): any {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot set reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val)
    return val
  }
  if (key in target && !(key in Object.prototype)) {
    target[key] = val
    return val
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return val
  }
  if (!ob) {
    target[key] = val
    return val
  }
  defineReactive(ob.value, key, val)
  ob.dep.notify()
  return val
}
1-先对target的有效性做校验,target 是undefind / null 会报警
2-如果target是array key 也是有效的数组key(整数),就直接对数组进行操作,返回val，这样同样能引起target的变   化触发更新
3-当key 属于 target 且key是target的自身属性，相当于修改对象的值，同样触发更新
4-当2，3情况不满足时，如果是target是data的属性,那么可能是为target添加新的属性,
    取出 ob = target.__ob__ 当ob不存在说明非双向绑定属性,直接赋值，返回。
    ob存在就说明是双向绑定属性，而且要给target添加属性key:value,
    运行defineReactive(ob.value, key, val)观测新的属性,
    ob.dep.notify()  //重点
        在ob.dep中同样收集了和target一样的依赖,我们运行ob.dep.notify()通知依赖target的watcher重新渲         染,
```

**$delete(target, key)**

和$set相似