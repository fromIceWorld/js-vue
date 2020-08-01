## **parse**

概述：对模板的解析，以·<·为标志，用正则进行匹配，当以·<·开头，可能是注释、条件注释、Doctype、结束标签、开始标签；当以·<·开头与以上模式都不匹配，则为文本内的‘<’。



```javascript
let textEnd = html.indexOf('<')
```

1-判断非<script> / <style>标签

​	以 ‘<’ 开头的 可能是 ：

​		 注释  ：    <!-- 。。。 -->

​		 开始标签 ： <div>

​		 闭合标签 :  </div>

​		 doctype  : <!DOCTYPE HTML>

       条件注释 : 
          <![IE]>
            <link rel="stylesheet" type="text/css" href="all-ie-only.css" />
          <![endif]>
①普通注释：

​	对于普通的注释，通过配置（shouldKeepComment）决定是否保存，保存的话，创建一个type为3的注释节点

```
const child = {
          type: 3,
          text,
          isComment: true
        }
将child 放入currentParent中;
```

②条件注释：

​	直接 advance(commentEnd + 3) 截取掉

 ③ Doctype：

 	直接 doctypeMatch[0].length 截取掉

 ④闭合标签：

​		获取tagName， 在 stack 中从后向前找到对应的tag，

​		stack中后续的tag属于未正确闭合的标签,非生产环境会告警，然后运行闭合钩子进行闭合

​		更新lastTag = stack[stack.length-1].tag 

​		如果找不到对应的tag的话，可能是 </br>  / </p> 标签

​		- 对于标签</br> </p> 进行特殊处理，</br>变成<br>            <p>会自动补全。

⑤ 开始标签:

​		创建 match对象存放数据

```
parseStartTag:
    const match = {
            tagName: start[1],
            attrs: [],
            start: index
          }
循环进行属性解析,将解析结果放入match.attrs,直到匹配到《开始标签的结束》

handleStartTag:

处理match中的attrs解析结果,设置为{name:'class',value:'color'}，key/value形式
如果非闭合，将当前节点入栈,更新lastTag属性；stack.push(match);lastTag = tagName;
如果是自闭合标签，调用钩子函数start，创建节点，更新currentParent，将节点入栈
```

⑥文本：

​	如果textEnd>=0,又不是开始标签 / 闭合标签 / 注释 / 条件注释，必定是文本，直接循环匹配，直到遇到

开始标签 / 闭合标签 / 注释 / 条件注释；最后获取文本的长度截取字符串：text = html.substring(0, textEnd)；

对于文本分为两种（1-有分隔符的动态文本；2-纯文本）==：

​	1-将解析出的动态字符和普通字符进行拼接输出：' _s(${exp}) ' + 'text' + ' _s(${exp})' ,并输出绑定的数据

【{'@binding' : exp},{'@binding' : exp}】

**总结:	parse 过程大体步骤就是这些 ，细节继续分析**

```javascript
解析需要的数据:
{
    stack:[],            //建立一个stack维持父子关系
    preserveWhitespace,
    whitespaceOption, //
    root,           	//记录根节点
    currentParent,  	//记录父节点
    inVPre:false,   	//标签如果有 v-pre 属性， inVPre 为 true
    inPre:false     	//标签是 pre inPre 为 true
}
```

**<u>1- 开始标签</u>**

   	处理开始标签，包括（1-对开始标签中的属性进行处理，变成key：value形式； 2-判断当前标签是否是自闭合标签或者是闭合标签‘<div/>’,然后根据标签状态维护栈 ；3-运行开始标签的钩子函数）

1.1 开始标签的钩子函数 start

1. 定义ns 属性；ns 属性 只有svg | math 标签才返回ns 其他标签只有是 svg | math 的子节点 才会继承 ns

2. 新建节点 createASTElement

   ```javascript
   {
       type:1,
       tag,
       attrsList:attrs,             //稍微处理后的 [{name:key,value:value}] 属性和值对应
       attrsMap:makeAttrsMap(attrs),//处理成{key:value}
       rawAttrsMap: {},             
                     //[key ：{name:key,value:value}] 属性名称与属性对象之间的对应关系
       parent: parent,              // 父节点              
       children: []
   }
   ```

3. 对节点进行前置转换 preTransforms  【后续三个解析一起分析】

 4. 解析 v-pre 指令

    当  inVPre 为false 且当前标签有 v-pre指令时  inVPre为 true，并为节点添加pre属性(el.pre = true)

    v-pre作用是显示最原始的标签

 5. 解析<pre>标签

    当前标签是 pre 的话， inPre为 true

 6. 当 inVPre  为 true 时 在v-pre 指令内 用 processRawAttrs（el）处理节点

    processRawAttrs 会将 attrList 属性都 复制到 attrs 上 【 -将属性保存成 **特性** -对应的值经过JSON.stringify转换】, 没有属性并且不是 v-pre 指令的话，认为 节点是简单节点(el.plain = true)

 7. 当 inVPre  为false, 而且当前节点 未被处理（processed = false）会对节点进行正常分析

 8. ```javascript
    processFor(element) 解析节点的 v-for 属性,为节点el添加关于v-for的属性描述
    
    v-for = "(item, index) in array" ->  {for:array,alias:item,iterator1:index}
    v-fro = "item in array"          ->  {for:array,alias:item}
    
    ## 最后删除 attrsList 中的 v-for 属性
    ```

 9. ```javascript
    processIf(element);解析节点的 v-if 属性, 为节点el添加关于v-if的属性描述
    //v-if
    el.if = exp //if表达式
    el.ifConditions = [{exp:exp,block:el}]
    //v-else
    el.else = true
    //v-else-if
    el.elseif = exp //v-else-if的表达式
    
    ## 最后删除 attrsList 中的 v-if / v-else / v-else-if 属性
    ```

 10. ```javascript
     processOnce(element);解析节点的 v-once 属性，为节点添加关于v-once 的属性描述
     
     el.once = true
     ## 最后删除 attrsList 中的 v-once 属性
     ```

 11. 确认根节点 root及验证根节点是否符合规定 【1- 非slot，template；2-无 v-for 指令】

 12. 当解析完这些属性后，判断当前标签是否闭合

     ```javascript
     1-标签闭合分两种，一种是一元标签,开始标签结束就自动闭合，另外一种是自闭合标签 </div>
     2-根据标签是否闭合，来维护stack,currentParent，确定节点间的关系
        - 当前标签不闭合的话，就入栈，赋值currentParent
        - 当前标签闭合就运行closeElement(el)闭合标签钩子函数
     ```

**2-*闭合标签***

1. 移除当前节点下的空的子节点（type:3,text:' '）[空的文本节点]  ？？？

2. 当前节点不是 v-pre 的下级节点且当前节点未被处理，用processElement处理当前节点

3. ```javascript
   # processElement(el)
   
   1-processKey //解析标签中的 :key="key1"  |  key="key1"  属性，为节点添加key属性
   ** 动态:key,可能会有过滤器(:key="key1 | filter1"),
       所以通过 parseFilters 解析动态:key对应的表达式，然后返回解析结果。
       ## parseFilters本页最下面解析【过滤器最后面单独解析】
   ** 静态key,返回 JSON.stringify(key1)
   -- template标签上不能加key
   -- 在v-for节点 不能使用 index 作为key 在 <transition-group> 子节点上
   
   为节点添加key属性(el.key = exp)
   
   2-el.plain = (!element.key &&!element.scopedSlots &&!element.attrsList.length);
   **在删除结构属性后，确认当前节点是否是普通节点
       
   3-processRef  //解析标签中的 :ref="ref1" | ref="ref1" 属性，为节点添加ref属性
   ** ref和 key的解析类似,但是没有 template 限制，v-for那些限制
   
   为节点添加ref属性(el.ref = ref)
   为节点添加ref属性(el.refInFor = checkInFor(el)) //确认当前节点是否属于v-for节点的下级节点
   
   
   4-processSlotContent //  为节点添加slotScope属性(el.slotScope = 'scope')
   ** <template scope = "scope1"> 
       scope只可用于template标签 // 2.5后已被废弃 使用slot-scope
   ** <template slot-scope="scope"> //2.6后被废弃 使用 v-slot
   ** <div slot="header"> //指定插槽插入内容
       -静态slot
       	slot没有对应属性的话是默认插槽，el.slotTarget = '"default"',
       	有对应属性的话是指定插槽，el.slotTarget = '"header"'
   	-动态slot
   		el.slotTargetDynamic = true /false 标记插槽名称是否是动态的
       -非作用域插槽的话将slot添加到attrs属性中
   
   ** v-slot 可以在template标签用，也可以直接在组件标签中用
   	-template 标签
   		v-slot:slotName = 'scope'     |||   v-slot:[slotName] = 'scope'
   		el.slotTarget = slotName
   		el.slotTargetDynamic = dynamic  // 插槽是否是动态插槽
           el.slotScope = 'scope' | "_empty_"
   	-component 组件
       	v-slot:slotName = 'scope'     |||   v-slot:[slotName] = 'scope'
       	el.scopedSlots ={   //组件的scopedSlots属性
               slotName:{
                   type:1,
                   tag:'template',
                   attrsList:[],
                   attrsMap:{},
                   rawAttrsMap:{},
               	parent:el,
                   children:[],//存放组件下的节点(el.children)【没有slotScope属性】
                   slotTarget:'slotName',
                   slotTargetDynamic:dynamic   //插槽是否是动态插槽
                   slotScope:'scope' | "_empty_"
               }
           }
   		在将el(组件)中的 children 都放到 scopedSlots.slotName.children后,删除el.children
   		el.plain = false
       	
   
   
   5-processSlotOutlet   <slot :name="header"> | <slot name="header">
   ** 解析slot标签，为节点添加el.slotName = exp
   
   6-processComponent  解析 <tag :is="component"> </tag>
   ** 有 :is="component" 属性
   	el.component = exp
   ** 有 inline-template 属性
   	el.inlineTemplate = true
   
   7-transforms 转换##【最后面单独解析】
   
   8-processAttrs 解析 标签上的属性: ##【最后面单独解析】
   	v-bind ->	:name.sync = 'value' | v-bind:value.sync = 'value'
   	v-on   ->	@click='handle' | v-on:click.prevent = 'handle'
   ```

 4. 拦截判断(!stack.length && element !== root)

    ```javascript
    	当满足上述条件时，整明 根节点属于(v-if控制的节点),且当前节点应该是v-else /v-else-if
    将当前节点放入根节点 root 的 ifCondition 属性中{exp:element.elseif,block:element}
    ```

 5. 当有currentParent属性时，

    ```javascript
    ** 当前节点有elseif | else 属性时，在父级上的children属性中从后向前找到节点(type ===1),当找到文本节点时会给出提示(if /else / elseif 中间的文本节点会被忽略)，当找到其他节点(没有if属性)会进行告警
    (if / eles / elseif 中间不让有其他节点[非if/ else / elseif ])
    **当前节点没有else / elseif属性,整明当前节点与前一个节点没甚麽关系,然后如果当前节点是作用域插槽,将当前节点保存到currentParent节点上的scopeSlots属性中，以便v-else(-if)能找到？？？？？？？
    **将当前节点保存到currentParent的children属性中,更新当前节点的parent属性
    ```

 6. 将当前标签的children属性中的节点带slotScope属性的都过滤掉  ？？？？？？为甚麽

 7. 清除空节点({type:3,text:' '})

 8. 如果当前节点有pre属性，证明当前节点带有v-pre指令，关闭节点，改变 inVPre = false；

    如果当前节点是pre节点，也同样整明 pre 节点要关闭了 inPre = false

 9. 最后运行后置转换postTransforms 【前置转换 | 转换 |后置转换 一起解析，在最后】

3-***文本***

1. 静态文本

   ```javascript
   建立一个静态文本节点
   {
       type:3,
       text:text,
   }
   ```

2. 动态文本

   ```javascript
   best{{Vue}} and {{javascript}}
   {
       type: 2,
       expression: 'best' + '_s(Vue)' +' and' +'_s(javascript)',
       tokens: [{ '@binding': exp },{ '@binding': exp2 }],
       text: 'best{{Vue}} and {{javascript}}'
   }
   ```

4-***注释类***

```
建立一个注释类节点
{
    type: 3,
    text: text,
    isComment:true
}
```

5-***公用部分解析***

**parseFilters**

------

```javascript
过滤器用于一些绑定的属性(:ref | :key | {{ | }} ....)中
expression为表达式，
inSingle:在单引号中''
inDouble:在双引号中""
inTemplateString:在字符串模板中 ``
inRegex:在正则表达式里 //
curly:记录当前字符大括号的层级,0代表没在大括号。
square:记录当前字符中括号的层级,0代表没在中括号。
paren:记录当前字符小括号的层级,0代表没在小括号。
lastFilterIndex:
filters:[] //保存过滤器

1-在表达式中以 | 为分界线, 第一个 | 前面的属于表达式,之后的分隔符|将过滤函数分割，但是单引号，双引号，模板字符串，三种括号还有 / 都会干扰分隔符的作用，同样 || 也会是另外一种运算符。 

2-基于以上的限制条件，过滤器解析函数，也就出来了。

3-对于字符串逐字符解析，遇到双引号，单引号，模板字符串，正则[/前的非空字符不能满足 /[\w).+\-_$\]]/ ]？？？,会进行标记true，遇到三种括号也会记录+1，当对应括号闭合时对应记录会-1，当 | 不在单引号,双引号,模板字符串,正则,括号内时，并且不是或(||)字符时，才会被认定为分隔符, 当遇到分隔符时,如果表达式expression为undifined时,证明遇到的是第一个分隔符,分隔符前面的是表达式,分隔符后面的是过滤器,记录expression和过滤器的位置(lastFilterIndex),继续解析,当遇到下一个 |(也就是第二个分隔符), 将两个分隔符之间的内容保存到filters,然后更新过滤器位置(lastFilterIndex),继续解析,直到表达式最后[这样全部的字符串就解析完成了]。

4-当解析完成字符串，但是没有expression，证明整个字符串全是expression，直接赋值
5-当解析完成,发现有expression,那么需要进行一次获取过滤器的操作(因为整个解析过滤器的过程都是遇到第二个分隔符才会取出过滤器,最后还需要确认当有过滤器存在时[lastFilterIndex!==0],
解析最后一个过滤器(lastFilterIndex 到 字符串的长度之间的字符串就是最后一个过滤器))
6-当所有的需要的数据都被解析出(expression,filters),需要对数据进行拼接

7-对于过滤器还分为两种情况(1-不带参数的:filter1,2-带参数的:filter2(arg1,arg2,arg3))
8-不带参数的过滤器
	直接return `_f("${filter1}")(${exp})`
9-带参数的过滤器
	return `_f("${filter1}")(${exp}, arg1, arg2, arg3)`
10-带多层过滤器的
	filters = [fiter1,filter2]  expression = exp
	最后对于过滤器进行嵌套
    let exp1 =  `_f("${filter1}")(${exp})`
    return `_f("${filter2}")(${exp1})`
```



**processAttrs**

------

注：processAttrs 是对属性中的指令进行处理:

	 处理 v- | @ | : 开头的指令 及它们的修饰符
	 - v-bind    v-on 
	 - v-model  和 其他自定义指令 
	 添加属性el.hasBindings

```javascript
** ---------------------v-bind-----------------
    
 ##<!-- 绑定一个 attribute -->
<img v-bind:src="imageSrc">   <img :src="imageSrc">

##<!-- 动态 attribute 名 (2.6.0+) -->
<button v-bind:[key]="value"></button>    <button :[key]="value"></button>

<!-- 内联字符串拼接 -->
<img :src="'/path/to/images/' + fileName">

##<!-- class 绑定 -->  在transformNode已被处理移除
<div :class="{ red: isRed }"></div>
<div :class="[classA, classB]"></div>
<div :class="[classA, { classB: isB, classC: isC }]">

##<!-- style 绑定 -->   在transformNode已被处理移除
<div :style="{ fontSize: size + 'px' }"></div>
<div :style="[styleObjectA, styleObjectB]"></div>

##<!-- 绑定一个全是 attribute 的对象 -->
<div v-bind="{ id: someProp, 'other-attr': otherProp }"></div>

##<!-- 通过 prop 修饰符绑定 DOM attribute -->
<div v-bind:text-content.prop="text"></div>

##<!-- prop 绑定。“prop”必须在 my-component 中声明。-->
<my-component :prop="someThing"></my-component>

##<!-- 通过 $props 将父组件的 props 一起传给子组件 -->
<child-component v-bind="$props"></child-component>

##<!-- XLink -->
<svg><a :xlink:special="foo"></a></svg>

############# 
根据 v-bind的语法，以及以前的处理(:class, :style已被处理) 我们需要考虑的情况就少了
只需要确定 v-bind 的描述属性-
name(v-bind绑定的属性名称): 
isDynamic(是否是动态属性?):
modifiers:{
       prop:
       camel:
       sync:   
          }      
1-如果有prop修饰符或者特定的需要添加为特性的属性,将属性添加到节点中的props里
el.props = [{name, value, dynamic:isDynamic }]
el.plain = false
不满足上述情况的话,根据name是否是动态的，添加属性到不同的地方
	-属性是动态的(isDynamic === true)
		el.dynamicAttrs = [{name, value, dynamic:true }]
	-属性是静态的(isDynamic === false)
		el.attrs = [{name, value, dynamic:false }]
2-如果有sync修饰符的话,对 name 添加事件，监听name的更新，对value进行解析以满足多种情况(obj.key | key | obj[key])

obj.key ->{
    exp:obj,
    key:"key"
}
value ->{
    exp:value,
    key:null
}
obj[key] ->{
    exp:obj,
    key:key
}
'obj' ->{  ？？？？？？？？？？？？？
    exp:'',
    key:''
}
'obj'[key] ->{  ？？？？？？？？？？？？？
    exp:'obj',
    key:key
}
当返回的 key为null 说明 value就是一个单纯的value不属于某一个object(没有.或者[]分割)
对于纯value return value = $event
非纯value   return ("$set(" + (res.exp) + ", " + (res.key) + ", " + $event + ")")
addHandler函数 将 value 加入事件 event 中
addHandler(
    el,
    ("update:" + (camelize(name)))
    `value`
    null,
    false,
    warn,
    list[i]
)
el.event[("update:" + (camelize(name)))] = `value`

** --------------------- v-on ------------------------------
<!-- 方法处理器 -->
<button v-on:click="doThis"></button>  <button @click="doThis"></button>

<!-- 动态事件 (2.6.0+) -->
<button v-on:[event]="doThis"></button>  <button @[event]="doThis"></button>

<!-- 内联语句 -->
<button v-on:click="doThat('hello', $event)"></button>

<!-- 停止冒泡 -->
<button @click.stop="doThis"></button>

<!-- 阻止默认行为 -->
<button @click.prevent="doThis"></button>

<!-- 阻止默认行为，没有表达式 -->
<form @submit.prevent></form>

<!--  串联修饰符 -->
<button @click.stop.prevent="doThis"></button>

<!-- 键修饰符，键别名 -->
<input @keyup.enter="onEnter">

<!-- 键修饰符，键代码 -->
<input @keyup.13="onEnter">

<!-- 点击回调只会触发一次 -->
<button v-on:click.once="doThis"></button>

<!-- 对象语法 (2.4.0+) -->
<button v-on="{ mousedown: doThis, mouseup: doThat }"></button>
在子组件上监听自定义事件 (当子组件触发“my-event”时将调用事件处理器)：

<my-component @my-event="handleThis"></my-component>

<!-- 内联语句 -->
<my-component @my-event="handleThis(123, $event)"></my-component>

<!-- 组件中的原生事件 -->
<my-component @click.native="onClick"></my-component>

###########
根据v-on的语法，我们同样需要获取
name       name
isDynamic  动态？
value      value

addHandler(el, name, value, modifiers, false, warn$2, list[i], isDynamic);
addHandler 处理事件【最下面分析】
############
对于其他指令 v-demo:foo.a.b="message"
也是同样的解析套路
name
isDynamic  对arg(foo.a.b)的描述 arg 是[..]类型 ? true : false 
arg:foo.a.b
value:"message"
addDirective(el, name, rawName, value, arg, isDynamic, modifiers, list[i]);
添加el.directives = [] 属性收集指令属性
el.directives = [{name,rawName, value, arg, isDynamic, modifiers}]
el.plain = false
###########
v-model='value'
checkForAliasModel(el, value):
value = el.alias ？？？？？？？
如果v-model绑定的值和本节点或者上级节点的alias属性相同，告警:
提倡使用 [{},{}], v-model绑定{}？？？？？？？？？？？？？？

##### 对于一些 非绑定 且未处理的属性
将这些属性添加到attrs中
name:'muted'属性,el.props=[{name:'muted',value:true}]    
```



**preTransforms**  

------

1-preTransforms 是对  input 标签的解析

```javascript

```

**transforms**

------

transforms 转换分为两类(1-style 转换 ；2-class转换)

1-style转换

```javascript
1-静态 style

获取 attrsList 中的 style = "coler:res;size:12px" 中的value属性,对 style="{{...}}"告警
将value属性解析出(';'分割不同css,':'分割属性及属性值)
返回res = {color:'red',size:''12px}
el.staticStyle = JSON.stringify(res)

2-动态 style

el.styleBinding = parseFilters(value)  //一般没人过滤style吧？？？

## style 的generator

function genData (el: ASTElement): string {
  let data = ''
  if (el.staticStyle) {
    data += `staticStyle:${el.staticStyle},`
  }
  if (el.styleBinding) {
    data += `style:(${el.styleBinding}),`
  }
  return data
}
```

2-class转换

```javascript
1-静态class

获取 attrsList 中的 class = "cla1" 中的value 属性， 对class="{{clas}}"告警
el.staticClass = JSON.stringify(cla1)

2-动态class

el.classBinding = parseFilters(value)

## class的generator 
function genData (el: ASTElement): string {
  let data = ''
  if (el.staticClass) {
    data += `staticClass:${el.staticClass},`
  }
  if (el.classBinding) {
    data += `class:${el.classBinding},`
  }
  return data
}
```

**postTransforms** 

------



**addHandler**

------

将相关的事件加入节点中

```javascript
addHandler (
    el,                 节点
    name,               name
    value,              表达式 ??
    modifiers,          修饰符
    important,          提升？？？
    warn,
    range,              list[i]
    dynamic             动态？？？
  ) 
v-bind的修饰符:{
    prop
    camel
    sync
}
v-on的修饰符:{
    stop 
    prevent 
    capture 
    self 
    {keyCode | keyAlias} 
    native 
    once 
    left 
    right 
    middle 
    passive 
}
# warn-----
    passive 和 prevent (不能一起使用，prevent 会消除掉passive)
#---------
不同的修饰符会根据 dynamic 对 name 进行 变动
dynamic:true    动态的事件;
noDynamic:false 静态的事件;
right:{
    dynamic: name = "(" + name + ")==='click'?'contextmenu':(" + name + ")",
    noDynamic:name = 'contextmenu'
} delete modifiers.right

middle:{
    dynamic: name = "(" + name + ")==='click'?'mouseup':(" + name + ")",
    noDynamic:name = 'mouseup'
} delete modifiers.middle

capture:{
    dynamic: ("_p(" + name + ",\"" + "!" + "\")"),
    noDynamic: '!' + name
} delete modifiers.capture

once:{
    dynamic: ("_p(" + name + ",\"" + "~" + "\")"),
    noDynamic: '~' + name
} delete modifiers.once

passive:{
    dynamic: ("_p(" + name + ",\"" + "&" + "\")"),
    noDynamic: '&' + name
} delete modifiers.passive

native:{
    el.nativeEvents = {}  //原生事件
} delete modifiers.native
没有native修饰符的话{
    el.events = {}
}

未被处理的 modifiers:{
    stop
    prevent
    self
    {keyCode | keyAlias}
}
对于处理后的 value 及 modifiers,生成对应的事件
newHandler = {
    value:value,
    dynmic,
    start,
    end,
    modifiers, //剩余修饰符
}
最后将newHandler 放入 events / nativeEvents内:
important 控制事件放入的顺序
native 控制事件放入的位置:

函数:
events = modifiers.native ? el.nativeEvents : el.events
handlers = events[name]  //相同事件
handlers是数组:
important ? handlers.unshift(newHandler) : handlers.push(newHandler);
handlers是对象
events[name] = important ? [newHandler, handlers] : [handlers, newHandler];
handlers不存在:
events[name] = newHandler;

el.plain = false;




```



















