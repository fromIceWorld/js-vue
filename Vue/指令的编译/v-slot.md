#### **插槽**

Vue@2.6.10

###### 作用域插槽:

------

描述:插槽【slot="slotName" slot-scope="scope"】【v-slot:"slotName"=‘scope’   ::】指令从解析到渲染.

模板:

```javascript
<router-view>
	<span slot="slot1" slot-scope="scope">
        {{user}} | {{scope.user}}          //user是父组件的数据
    </span>
</router-view>
子组件:
<slot name = "slot1" :user="user">
渲染:
	父组件.user | 传入子组件插槽.user
```

**0- 指令解析（parseHTLM()阶段）**

```javascript
在模板解析[parseHTML]阶段,遇到开始标签,
1-收集开始标签上的属性:
    match = {
        tagname:'span',
        attrs:[
            ["slot="slot1"", "slot", "=", "slot1"],             
            ["slot-scope="scope"", "slot-scope", "=", "scope"]  
        ],
    }
2-处理开始标签上的属性,创建节点:
  attrs = [
      {name:"slot",value:"slot1"},
      {name:"slot-scope",value:"scope"},
  ]
  element = {
      type: 1,
      tag: "span",
      attrsList: attrs,             // 基础属性列表
      attrsMap: makeAttrsMap(attrs),// 属性map列表{key:value}
      rawAttrsMap: {},              // 属性名称和属性的对应 {key:{name:'key',value:12}}
      parent: parent,
      children: []
  }
3-处理slot插槽节点
	element.slotScope = "scope"
	element.slotTarget = "slot1" //当没有solt属性时,slotTarget为"default"
	放进父节点的scopedSlots中,parent.scopedSlots = {
        "scope":插槽节点。
    }
4-generate 处理
	处理父节点的scopedSlots,在【父节点】的data中加入scopedSlots属性
	var fn = "function(" + slotScope + "){" +
      "return " + (el.tag === 'template'
        ? el.if && isLegacySyntax
          ? ("(" + (el.if) + ")?" + (genChildren(el, state) || 'undefined') + 		     
             ":undefined")
          : genChildren(el, state) || 'undefined'
        : genElement(el, state)) + "}";
    data = {
        scopedSlots:_u([{key:"slot1",fn:fn}])
    }
    _u 解析返回:{
        "slot1":fn
    }
	最终data
	data = {
        scopeSlots:{
            "slot1":fn
        }
    }
5- 处理slot标签 genSlot(el) 
    最终返回 _t('slot1',children,{user:user},bindObject)
	_t  = renderSlot(
        name,    //插槽名称
        fallback,//退路，当此插槽没插入东西时，使用【内容是插槽的children】
        props,   //子组件传入的props值
        bindObject)】//插槽节点绑定的值
    返回的 nodes = scopedSlotFn(props) || fallback;
	注：scopedSlotFn是第四步返回的fn
       props是子组件传入的props和bindObject的合并
	因此父组件的插槽中的作用域 scope 就是 子组件传入的props 
6- 总结 
	在插槽中的数据如果用作用域scope开头就是用的子组件的数据,其他的都是用的父组件的数据
    【父级模板里的所有内容都是在父级作用域中编译的；子模板里的所有内容都是在子作用域中编译的。】
    在子组件会调用父组件编译完成的渲染函数并传入值，在插槽中的数据会先取函数中的值(也就是子组件传入的值)，当获取不到需要的值会去上级作用域找(也就是父组件),因此可以同时获取子组件的父组件的值。
```

