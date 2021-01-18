#### flex

##### 简介

```
Flexible Box:弹性布局
分为两个部分：容器和容器成员（子元素）
特点：容器设置flex后子元素的float，clear，vertical-align属性失效
---------------------------------------------------------
|                                     |                  |
|                                     |                  |
|--------------------主轴--------------------------------|                   |                                     |                  |
|                                     交叉轴              |
|                                     |                  |
|                                     |                  |
---------------------------------------------------------


```

##### 容器属性

```
flex-direction:row[默认] | row-reverse | column | column-reverse;决定主轴的方向
flex-wrap:nowrap | wrap | wrap-reverse;默认项目是一条线，如果排不下决定换行样式
	nowrap:默认，不换行
	wrap:换行；
	wrap-reverse:换行，行的位置也反转
felx-flow:是flex-direction和flex-wrap和简写
	flex-flow:<flex-direction> <flex-wrap>
	
justify-content:定义子元素在主轴的对齐方式；
	flex-start（默认值）：左对齐
    flex-end：右对齐
    center： 居中
    space-between：两端对齐，项目之间的间隔都相等。
    space-around：每个项目两侧的间隔相等。所以，项目之间的间隔比项目与边框的间隔大一倍。
align-items：定义子元素在交叉轴轴的对齐方式；
    flex-start：交叉轴的起点对齐。
    flex-end：交叉轴的终点对齐。
    center：交叉轴的中点对齐。
    baseline: 项目的第一行文字的基线对齐。
    stretch（默认值）：如果项目未设置高度或设为auto，将占满整个容器的高度。
align-content：多根轴线的对齐方式。如果项目只有一根轴线，该属性不起作用。
    flex-start：与交叉轴的起点对齐。
    flex-end：与交叉轴的终点对齐。
    center：与交叉轴的中点对齐。
    space-between：与交叉轴两端对齐，轴线之间的间隔平均分布。
    space-around：每根轴线两侧的间隔都相等。所以，轴线之间的间隔比轴线与边框的间隔大一倍。
    stretch（默认值）：轴线占满整个交叉轴。
```

##### 子元素属性

```
order:定义子元素的排列顺序，数值越小，排列越靠前，默认为0；
flex-grow：定义元素的放大比例，默认为0，即如果存在剩余空间，也不放大。
flex-shrink：定义元素的缩小比例，默认为1，即如果空间不足，该项目将缩小。
flex-basis：在分配多余空间之前，项目占据的主轴空间，默认auto
flex：<flex-grow> <flex-shrink> <flex-basis>的简写，默认 1 0 auto
align-self：允许单个项目有与其他项目不一样的对齐方式，覆盖align-items属性，默认auto，继承父属性
```

