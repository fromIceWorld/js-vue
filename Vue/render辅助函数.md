**渲染中的辅助函数**

在我们生成的render中有一些帮助我们渲染的辅助函数  _ _l,   __c,_

_l  【renderList】帮助我们渲染 有v-for指令的节点

```javascript
  function renderList (
    val,
    render
  ) {
    var ret, i, l, keys, key;
    if (Array.isArray(val) || typeof val === 'string') {
      ret = new Array(val.length);
      for (i = 0, l = val.length; i < l; i++) {
        ret[i] = render(val[i], i);
      }
    } else if (typeof val === 'number') {
      ret = new Array(val);
      for (i = 0; i < val; i++) {
        ret[i] = render(i + 1, i);
      }
    } else if (isObject(val)) {
      if (hasSymbol && val[Symbol.iterator]) {
        ret = [];
        var iterator = val[Symbol.iterator]();
        var result = iterator.next();
        while (!result.done) {
          ret.push(render(result.value, ret.length));
          result = iterator.next();
        }
      } else {
        keys = Object.keys(val);
        ret = new Array(keys.length);
        for (i = 0, l = keys.length; i < l; i++) {
          key = keys[i];
          ret[i] = render(val[key], key, i);
        }
      }
    }
    if (!isDef(ret)) {
      ret = [];
    }
    (ret)._isVList = true;
    return ret
  }

###
假设我们的模板如下：
data:{list:[{name:'zhang'}]}
template:<div v-for="item in list">{{item}}</div>
生成的渲染函数
with(this){return _l((list),function(item){return _c('div',[_v(_s(item))])})}
用到我们的_l _c _v _s四种渲染函数
_c在我们initRender时放到实例上【_c的由来在下面分析】

##
1- v-for 的渲染根据我们提供的for属性的不同 有不同的模式
	[{name:'cui'}] ->数组 ret[0] = _c('div',[_v(_s({name:'cui'}))])}


```

_c(a, b, c, d)渲染函数

```javascript
#  
vm._c = (a, b, c, d) => createElement(vm, a, b, c, d, false)
##
export function createElement (
  context: Component, //执行上下文
  tag: any,           //tag标签
  data: any,          //data，标签属性
  children: any,      //子节点
  normalizationType: any, //d
  alwaysNormalize: boolean  // false     
): VNode | Array<VNode> {
  if (Array.isArray(data) || isPrimitive(data)) {
    normalizationType = children
    children = data
    data = undefined
  }
  if (isTrue(alwaysNormalize)) {
    normalizationType = ALWAYS_NORMALIZE
  }
  return _createElement(context, tag, data, children, normalizationType)
}
```

**_createElement(context, tag, data, children, normalizationType)**

```javascript
export function _createElement (
  context: Component,
  tag?: string | Class<Component> | Function | Object,
  data?: VNodeData,
  children?: any,
  normalizationType?: number
): VNode | Array<VNode> {
  if (isDef(data) && isDef((data: any).__ob__)) {
    process.env.NODE_ENV !== 'production' && warn(
      ’Avoid using observed data object as vnode data: ${JSON.stringify(data)}\n‘ +
      Always create fresh vnode data objects in each render!,
      context
    )
    return createEmptyVNode()
  }

  // object syntax in v-bind
  // v-bind中的对象语法
  if (isDef(data) && isDef(data.is)) {
    tag = data.is
  }
  if (!tag) {
    // in case of component :is set to falsy value
    //在组件的情况下：设置为falsy值
    return createEmptyVNode()
  }
  // warn against non-primitive key
  //对非基元密钥发出警告
  if (process.env.NODE_ENV !== 'production' &&
    isDef(data) && isDef(data.key) && !isPrimitive(data.key)
  ) {
    if (!__WEEX__ || !('@binding' in data.key)) {
      warn(
        'Avoid using non-primitive value as key, ' +
        'use string/number value instead.',
        context
      )
    }
  }
  // support single function children as default scoped slot
  //支持将单函数子级作为默认作用域插槽
  if (Array.isArray(children) &&
    typeof children[0] === 'function'
  ) {
    data = data || {}
    data.scopedSlots = { default: children[0] }
    children.length = 0
  }
  if (normalizationType === ALWAYS_NORMALIZE) {
    children = normalizeChildren(children)
  } else if (normalizationType === SIMPLE_NORMALIZE) {
    children = simpleNormalizeChildren(children)
  }
  let vnode, ns
  if (typeof tag === 'string') {
    let Ctor
    ns = (context.$vnode && context.$vnode.ns) || config.getTagNamespace(tag)
    if (config.isReservedTag(tag)) {
      // platform built-in elements
      //平台内置元件
      vnode = new VNode(
        config.parsePlatformTagName(tag), data, children,
        undefined, undefined, context
      )
    } else if ((!data || !data.pre) && isDef(Ctor = resolveAsset(context.$options, 'components', tag))) {
      // component
      vnode = createComponent(Ctor, data, context, children, tag)
    } else {
      // unknown or unlisted namespaced elements
      // check at runtime because it may get assigned a namespace when its
      // parent normalizes children
      //运行时检查未知或未列出的命名空间元素，因为其父级规范化子级时可能会为其分配命名空间
      vnode = new VNode(
        tag, data, children,
        undefined, undefined, context
      )
    }
  } else {
    // direct component options / constructor
    //直接组件选项/构造函数
    vnode = createComponent(tag, data, context, children)
  }
  if (Array.isArray(vnode)) {
    return vnode
  } else if (isDef(vnode)) {
    if (isDef(ns)) applyNS(vnode, ns)
    if (isDef(data)) registerDeepBindings(data)
    return vnode
  } else {
    return createEmptyVNode()
  }
}
1- 禁止观察属性作为vnode
2- 处理 <tag :is='componentA'/>  tag = 'componentA'
3- 没有tag 返回一个空的虚拟节点(<tag :is=''/>)  
4- 避免使用 string，number，symbol，boolean 作为标签中key属性？？？？？？？
5- 单函数子级作为默认作用域插槽？？？？？？？？？
6- 规范children？？？？？？
7- tag是string类型:
	-如果是平台内置节点,
        vnode = new VNode(
                config.parsePlatformTagName(tag), data, children,
                undefined, undefined, context
              )
	-是组件
		      vnode = createComponent(Ctor, data, context, children, tag)
	-其他未知的节点
		vnode = new VNode(
                    tag, data, children,
                    undefined, undefined, context
                  )
8-当tag不是string  是构造函数？？？？
	    vnode = createComponent(tag, data, context, children)
9-判断vode
	-vnode是数组？？？？？
		直接返回
    -非数组，且不是 undefind /null 
        如果有ns applyNS(vnode, ns)
        如果有data registerDeepBindings(data)
		返回
    -以上两种都不是的话 返回空的vnode    

```





















