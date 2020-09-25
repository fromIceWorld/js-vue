## v-if / v-else（-if）

```html
<div v-if="status === 1">
	1
</div>
<div v-else-if="status === 2">
	2
</div>
<div v-else>
	3
</div>
```

**0-指令从解析，到节点信息，再到渲染**

**1- 获取标签上的指令属性parseStartTag()**

```javascript
## v-if
element1 = {
	type:1,
    tag:'div',
    attrsList:[{name:'v-if',value:"status === 1"}],
    attrsMap:{'v-if':"status === 1"}
}
## v-else-if
element2 = {
	type:1,
    tag:'div',
    attrsList:[{name:'v-else-if',value:"status === 2"}],
    attrsMap:{'v-else-if':"status === 2"}
}
## v-else
element3 = {
	type:1,
    tag:'div',
    attrsList:[{name:'v-else',value:undefined}],
    attrsMap:{'v-else':undefined}
}

```

**2- 解析指令属性(processIf、closeElement)**

```javascript
在processIf函数中会解析 v-if / v-else / v-else-if 标签属性
## v-if
element1 = {
	type:1,
    tag:'div',
    attrsList:[],                             //删除关于v-if的属性对象
    attrsMap:{'v-if':"status === 1"},
    if:"status === 1",                        //添加节点属性
    ifConditions:[
        {exp:"status === 1",block:element1},   //添加条件属性，及对应的节点(element也就是当前节点)
    ]
}
## v-else-if
element2 = {
	type:1,
    tag:'div',
    attrsList:[],                             //删除关于v-else-if的属性对象
    attrsMap:{'v-else-if':"status === 2"},
    elseif:"status === 2",                        //添加节点属性
}
## v-else
element3 = {
	type:1,
    tag:'div',
    attrsList:[],                             //删除关于v-else的属性对象
    attrsMap:{'v-else':undefined},
    else:true,                        //添加节点属性
}
/*********
最终只有v-if属性有ifConditions属性保存我们的v-if的表达式(exp)和对应的节点(element)。
因为我们的v-else(-if)属性会在关闭【含有v-else，v-else-if指令】的标签时,将我们的节点放到v-if的标签中的ifConditions中。最终我们的element2和element3都会放到element1中
**/
element1 = {
	type:1,
    tag:'div',
    attrsList:[],                             
    attrsMap:{'v-if':"status === 1"},
    if:"status === 1",                       
    ifConditions:[
        {exp:"status === 1",block:element1}, 
        {exp:"status === 2",block:element2}, 
        {exp:undefined,block:element3}, 
    ]
}
注：- v-if 和 v-else(-if)中间不能有节点(type === 1) //会产生告警
   - v-if 和 v-else(-if)中间的text会被忽略。
```

**3- 渲染函数的生成 genIf**

```javascript
对于有 if属性的节点element1,会运行genif属性返回对应条件的渲染函数(暂时不考虑v-if与v-once混用);
genIfConditions=[
        {exp:"status === 1",block:element1}, 
        {exp:"status === 2",block:element2}, 
        {exp:undefined,block:element3}, 
    ]
对于element1,会返回一个三元表达式:
(exp1 ? genElement(element1) : genIfConditions)

当满足第一个exp条件时,会使用对应的element1,当不满足的话，会判断下一个exp条件是否成立,条件成立会使用对应的element2,对于v-else，我们的exp是undefined,会使用undefined 的element3.
v-else-if 没有对应exp时,解析结果和v-else相同。
```
