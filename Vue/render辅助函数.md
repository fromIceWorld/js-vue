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
  normalizationType: any,
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

