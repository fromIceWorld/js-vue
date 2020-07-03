## webpack@4.43.0

## css

##### css-loader

描述：获取工程中的 css代码。

##### style-loader

描述：打包后 js 会在 html 中将 css 样式 (<style>),style标签直接dom操作插入html。

弊端：页面插入<style>标签会导致页面闪烁

##### post-css-loader

描述：css样式兼容loader，通过设置浏览器的范围browserslist，来生成兼容browserslist的css代码。

条件：需要配置 autoprefixer 插件

```javascript
{
    test: /\.css$/,
        use: [
            MiniCssExtractPlugin.loader,
            "css-loader",
            {
                loader: "postcss-loader",
                options: {  
                    plugins:[
                        require('autoprefixer')
                    ]
                }
            }
        ]

},
```

##### MiniCssExtractPlugin

描述：直接将 css样式 从默认js文件中提取出来。

优点：提取出css 会减少js文件包的大小。

##### OptimizeCssAssetsWebpackPlugin

描述：优化打包后的css文件，将css文件压缩，减少css文件体积