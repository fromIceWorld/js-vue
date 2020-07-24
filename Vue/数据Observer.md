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

4-将data变成观察者observer（data, true）
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

  /**
   * Observe a list of Array items.
   */
  observeArray (items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}
## -- ob实例化属性
ob.value = data
ob.dep = new Dep()
def(data, '__ob__', this) [data.__ob__ = ob 将__ob__属性设置为不可枚举，防止重复观察]

-- 数组劫持
当data是数组而且对象有__proto__属性时，将数组原型放到data原型上，但是在数组方法上做了一层拦截。
当 使用 push / unshift / splice 传递第三个参数 这些对数组数据进行改变或者新增数组数据的操作时，将会对新增/修改的数据进行观察。然后再 ob.dep.notify() 让依赖进行更新。
```

