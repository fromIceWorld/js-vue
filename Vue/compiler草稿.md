## 模板解析

```html
<div class="cla1" key="key1" v-for="(item,index) in arr">
    <p ref="refp" 
       v-bind:[class]="bindClass"
       @click.prevent="handlep" v-if="true">
        efwe{{word}}
    </p>
    <componentFirst :value="data" @select="change" ></componentFirst>
    <template slot-scope="rowData"></template>
    <slot name="slot1"></slot>
</div>
```

以此模板为实例，对解析流程进行分析：

我们声明 currentParent , stack , root,  inVPre,  inPre  对整个过程的状态进行存储。

currentParent ：记录当前父节点。

root：根节点。

stack:维持节点间的等级关系。

inVpre：v-pre指令。

inPre: 标签为<pre>

整个流程以 ’<‘ 为标志，当以’<‘ 开头时，可能会是 注释 / 条件注释 /   Doctype / 闭合标签 / 开始标签。当以 '<'开头再用正则去匹配以上五种情况。

**注释**              <!--  ********** -->

新建类型 3 节点，将注释内容放入节点内，再将节点，放入 currentParent 节点的 children 节点中。

**条件注释**    <![      ***************    ]>

**Doctype**   

条件注释及Doctype 直接用 advance 删除

**结束标签**

```javascript
## 先分析开始标签,分析完开始标签，结束标签的作用就很明显了
### 当解析到结束标签时，截掉html上的结束标签，再运行解析结束标签的函数
parseEndTag(endTagMatch[1], curIndex, index)

  function parseEndTag (tagName, start, end) {
    let pos, lowerCasedTagName
    if (start == null) start = index
    if (end == null) end = index

    // Find the closest opened tag of the same type
    if (tagName) {
      lowerCasedTagName = tagName.toLowerCase()
      for (pos = stack.length - 1; pos >= 0; pos--) {
        if (stack[pos].lowerCasedTag === lowerCasedTagName) {
          break
        }
      }
    } else {
      // If no tag name is provided, clean shop
      pos = 0
    }

    if (pos >= 0) {
      // Close all the open elements, up the stack
      for (let i = stack.length - 1; i >= pos; i--) {
        if (process.env.NODE_ENV !== 'production' &&
          (i > pos || !tagName) &&
          options.warn
        ) {
          options.warn(
            `tag <${stack[i].tag}> has no matching end tag.`,
            { start: stack[i].start, end: stack[i].end }
          )
        }
        if (options.end) {
          options.end(stack[i].tag, start, end)
        }
      }

      // Remove the open elements from the stack
      stack.length = pos
      lastTag = pos && stack[pos - 1].tag
    } else if (lowerCasedTagName === 'br') {
      if (options.start) {
        options.start(tagName, [], true, start, end)
      }
    } else if (lowerCasedTagName === 'p') {
      if (options.start) {
        options.start(tagName, [], false, start, end)
      }
      if (options.end) {
        options.end(tagName, start, end)
      }
    }
  }
##-----------
当有tagName时，寻找到stack中，与当前tagName一样的节点，记录 标签的 index，然后将index - stack.length的标签都给关闭(通过执行解析过程中的结束标签钩子函数 end(stack[i],start,end))
## -----     end(stack[i],start,end))
end (tag, start, end) {
      const element = stack[stack.length - 1]
      // pop stack
      stack.length -= 1
      currentParent = stack[stack.length - 1]
      if (process.env.NODE_ENV !== 'production' && options.outputSourceRange) {
        element.end = end
      }
      closeElement(element)
    },
将stack中的最后一个节点出栈(处理这个节点)，改变stack的长度，再将stack最后一个节点赋值给currentParent
然后处理出栈的要闭合的节点 closeElement(element)
closeElement(element)节点的解析在下面start钩子函数最后



```

**开始标签**

```javascript
## parseStartTag 直接对html进行解析。
function parseStartTag () {
    const start = html.match(startTagOpen)
    if (start) {
      const match = {
        tagName: start[1],
        attrs: [],
        start: index
      }
      advance(start[0].length)
      let end, attr
      while (!(end = html.match(startTagClose)) 
             && (attr = html.match(dynamicArgAttribute) || html.match(attribute))) {
        attr.start = index
        advance(attr[0].length)
        attr.end = index
        match.attrs.push(attr)
      }
      if (end) {
        match.unarySlash = end[1]
        advance(end[0].length)
        match.end = index
        return match
      }
    }
  }
## 当解析到开始标签，创建收集节点属性的对象，对节点属性进行循环收集，直到正则匹配到结束标签。
<div class = "class1" id = "app"></div>

对于上面这个节点，属性match之后的结果是：
attr = html.match(attribute)
attr的结果就是["cks = "sfs"", "cks", "=", "sfs", undefined, index: 0,
         		input: "cks = "sfs"", groups: undefined]

const match = {
        tagName: 'div',
        attrs: [attr1,attr2],
        unarySlash:''
        start: index
      }

match.unarySlash是对开始标签的闭合进行的判断，因为我们开始标签的闭合有两种情况 > 和 />
这两种情况生成的 match.unarySlash 是不一样的一个是 '' 另一个是 '/' 我们会有不同的处理。 

解析后的html：
html = </div>

当将开始标签中的属性都解析完成后，我们对解析出的属性进行处理:
将上面解析出的attr数组，提取出键值对的对象，name是 = 的值，value 是 = 右边的值，
attrs = [
    {class:'class1'},
    {id : "app"}
]
当我们当前解析的标签是非一元标签(img)，也未自闭合(/>)
将提取出的对象数组attrs放入新对象中,再将新对象入栈。
stack.push(
    { 
    	tag: tagName, 
    	lowerCasedTag: tagName.toLowerCase(), 
    	attrs: attrs,
    	start: match.start, 
    	end: match.end 
})
lastTag = tagName
再用钩子函数对标签进行处理：
## start(tagName, attrs, unary, match.start, match.end)

在对属性处理之前，我们会有一个对标签的判断(unary)，如果是一元标签 / 可自动补全的标签(p) / 自闭和标签 
这个属性(unary)控制后续解析分支：
是一元标签或者自闭合标签，或者可自动补全标签的话：
	【次标签直接结束，不入栈，将此标签放入currentParent的children中】
当前标签不结束的话：
当前节点成为currentParent，当前节点入栈
##--------------------------------------------------------------------
继续解析
    
    
```

**start钩子函数**

------

```javascript
生成namespace
const ns = (currentParent && currentParent.ns) || platformGetTagNamespace(tag)
只有 'svg' 和 'math' 有ns属性

生成element :
let element = createASTElement(tag, attrs, currentParent)
element =  {
        type: 1,
        tag,
        attrsList: attrs,
        attrsMap: makeAttrsMap(attrs),
        rawAttrsMap: {},
        parent,
        children: []
  }
makeAttrsMap 将我们的数组对象attrs, 设置成map中的 key/value 形式

对开始标签的中的指令进行解析。生成ast
##------------------------     v-pre 和 <pre> 特殊情况    ------------------------
v-pre
当解析到 v-pre 会设置 inVpre = true。el.pre = true
对于有 v-pre 的标签,会将所有的 el.attrsList 中的属性都提取出来放入 el.attrs

tag 是 pre 时
inPre = true
##---------------------------  一般情况解析，-----------------------------------------
v-for
processFor(el)对 v-for 指令进行解析【在《解析中的辅助函数》中有processFor的详细解析】
el.for = obj
el.alise = item
el.iterator1 = index
el.iterator2 = ''

v-if
processIf(el) 对v-if /v-else /v-else-if 进行解析【在《解析中的辅助函数》中有processFor的详细解析】
el.if = exp
el.else = true
el.v-else-if = exp //添加 v-else-if 的表达式

v-once
processOnce(el)对v-once 进行解析【在《解析中的辅助函数》中有processOnce的详细解析】
el.once = true
##-------------------------------------------------------------------
然后确定 root 根节点
当 root值 为空时，当前结点为 root 
然后非生产环境会对 root 进行校验：
slot / template 不能是根节点，因为 slot 是虚拟节点不渲染成真实节点；template也不渲染
root 节点不能有 v-for 属性，因为vue@2.6.10 只支持一个元素
##-------------------------------------------------------------------
根据 handleStartTag 中传入的 unary属性，判断当前标签是否已经结束(当前标签为一元标签 || 当前标签自闭合)

如果当前标签未结束，将当前el 赋值给 currentParent，再将当前节点入栈 stack.push(el)

##---  closeElement 函数 --------
如果当前标签结束，运行 closeElement 钩子函数:
先将当前 节点下的子节点中的无效节点(空白节点)删除，
如果非 v-pre 环境
processElement(el,options)//对剩余属性进行解析【在《解析中的辅助函数》中有processElement的详细解析】

根节点可以是几个if /elseif / else 组成的条件节点。【具体在解析总体流程中分析分析】

如果当前节点有else / elseif属性
将当前节点添加到前一个节点的ifConditions属性中，如果前一个节点没有if属性，报错！

将子节点有 scope slots 属性的节点都过滤【不懂】
如果当前节点有 v-pre指令(也就是当前属性 inVPre = true),将inVPre设为false，整明v-pre指令结束
如果当前结点是<pre>,和上面情况一样
post-transform 【后置-解析？ 不懂】

```

**文本**

```javascript
当有‘<’,又不匹配上面这些格式( 开始标签 / 结束标签 / 注释 / 条件注释 / Doctype )，那就属于文本。
让正则循环匹配下一个‘<’,记录位置index，直到遇到( 开始标签 / 结束标签 / 注释 / 条件注释 / Doctype )，
这样的话我们直接截取text = html.substring(0,index),就是文本了
直接运行文本的钩子函数chars(text, index-text.length, index)
##--  chars(text, index-text.length, index) ------如下
当没有‘<’,说明剩余的都是文本 text = html

```

**chars (text,  start,  end)**

```javascript
## 文本的钩子函数
不能只用文本做根节点 || 独立于根节点外的文本会被忽略 ===>  会告警
##--还有其他一些对文本的设置【v-pre指令内，对文本进行一些操作，whitespaceOption。。。。】==>不分析
文本剩下只有两种情况了：
#1-有动态数据的文本(  Vue is very {{Vue}}  )
对于有动态数据的文本我们用 parseText(text, delimiters) 解析
let res = parseText(text, delimiters).repression
解析后生成 type 为 2的节点:
child = {
    type:2,
    expression: res.repression,
    tokens: res.tokens
}
#2-没有动态数据的纯文本
child={
    type:3,
    text
}
### --最后将child 放到 currentParent.children.push(child)
```

**parseText(text, delimiters)**

```javascript
设置 rowTokens = [], tokens = [] 保存我们解析出来的文本
lastIndex 保存位置
我们不断的解析 {{***}},当解析到动态数据时，match.index如果大于我们初始化的lastIndex，说明lastIndex到index之间的数据是文本:
# rawTokens.push(tokenValue = text.slice(lastIndex, index))
# tokens.push(JSON.stringify(tokenValue))
然后将我们解析出的《动态数据》通过parseFilters(text)解析，将_s(${exp})放入tokens，
将{'@binding':exp}放入rowTokens，下次从动态数据后开始解析，
当没有动态数据后 lastIndex 如果小于文本的长度,说明剩下的文本都是纯文本，直接截取。
return{
    expression:tokens.join('+'),
    tokens:rowTokens
}
```

