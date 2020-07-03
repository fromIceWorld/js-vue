webpack@4.43.0

##  javaScript

##### eslint

描述：检测javascript代码规范，需要eslint / eslint-loader / eslint-plugin-import /eslint-config-airbnb-base(检测规范)

可通过 npx eslint init 命令配置eslint，生成 .eslintrc.js

```javascript
{
    enforce:'pre',        // 部分检查源文件
    test: /\.js$/,
    exclude:/node_modules/,                  
    loader:'eslint-loader',
    options:{
        fix:true  //是否自动纠正源代码
    }
},
```

可通过 use 属性添加其他loader 比如 babel-loader

```javascript
 {
     test: /\.js$/,
         exclude:/node_modules/,
             loader:'babel-loader',
                 options:{
                     presets:['@babel/preset-env'],
                 }
},
//注：以上设置只能将es6转换为es5，但是不包括es6的一些新特征（promise）
//   使用promise等新特性需要在入口文件引入@babel/polyfill 
```

在入口文件引入@babel/polyfill会导致所有的polifill都会加载，包的体积会变大 ，因此我们需要按需加载（useBuiltIns属性进行配置）

```javascript
{
    test: /\.js$/,
        exclude:/node_modules/,
            loader:'babel-loader',
                options:{
                    // cacheDirectory:true,
                    presets:[
                        ['@babel/preset-env',{
                            useBuiltIns:"usage",
                            'corejs':3
                        }]
                    ]
                }
},
//useBuiltIns 有三个属性（entry，usage，false[默认属性]）
entry：{
    会将文件中引入的@babel/polifill 结合 浏览器配置兼容的browserslist替换成浏览器不兼容的polyfill
}
usage:{
    无需在文件中引入@babel/polifill， 会根据设置的browserslist 和使用 的api进行polyfill，实现了按需加载
}
```

注意：babel-loader  @babel/core @babel/preset-env 三个要同时安装