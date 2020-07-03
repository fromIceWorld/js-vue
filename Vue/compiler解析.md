## parse

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

​		stack中后续的tag删除（删除一些未闭合标签<div><span></div>）

​		更新lastTag = stack[stack.length-1].tag 

​		- 对于一元标签</br> <p>

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

​	

