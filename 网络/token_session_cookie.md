session，cookie，token来源：

```
http无状态，需要一种方法维持会话。然后引出cookie维持会话，但是cookie存储敏感信息可能会泄露，因此在cookie中存储敏感信息对应的Id，在数据库或者其他地方存储重要信息，将敏感信息对应的Id存储到cookie，这样cookie就不会暴露敏感信息，这个会话就是session，但是服务器存储session会引发两个问题【服务器保存所有session，开销大;如果用两个机器组成一个集群，请求被转发，session不同步】，因此引出token，客户端保存token，每次请求携带token，服务端接收数据，再生成token进行认证
```

session：

```
来源：用户的浏览器在访问【服务器】由服务器生成session及对应sessionID，服务端保存session，将sessionID返回给客户端，
优点：服务端保存session，安全
缺点：每次回话服务器都保存session(压力大)；如果配置负载均衡，会产生新的session,而且需要同步session
```

cookie：

```
来源：服务端和客户端每次信息交流都携带cookie，可在cookie中保存数据用于识别客户端身份
优点：
缺点：保存在客户端，可用js获取（可通过服务端配置httponly：true，禁止客户端操作）
```

token：

```
普通的字符串，登录通过后由服务端返回，客户端请求携带token，服务端接收后与存储的token比较【redis？】
```

jwt：

```
json-web-token:服务端加密（头.payload.加密字段）发送给客户端，客户端每次请求携带jwt，服务端通过解密jwt，获取用户信息及过期时间
头：{"alg":"HS256","typ":"JWT"}  --base64-> eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
payload：用户名称，id,签发时间，过期时间.... --base64->****
签证：由头【base64后的】+payload【base64后的】+secret 通过头中声明的加密方式进行加密。

优点：可授权登录，用运算时间【服务端下发，每次请求携带到服务端，服务端用密钥secret,与jwt对比，相同】获取存储空间，不用存储token
缺点：1-固定时间后会过期(无法单纯的更新expiresIn，更新expiresIn，会生成新的token)[redis解决？]
```

浏览器同源策略

```
https://www.baidu.com/pages/...
协议：https
域名：www.baidu.com【一级域名：.com;二级域名:baidu;三级域名:www;后续相同】
端口:https默认443;http默认80;

浏览器同源策略指的是： 协议，域名，端口一致

----------------同站-----------------------
cookie的同站【只关注域名】：两个url的eTLD+1相同就认为是同站【eTLD+1表示有效顶级域名+二级域名】,www.taobao.com和www.baidu.com是跨站，www.a.taobao.com和www.b.taobao.com是同站

作用：
XmlHttpRequest:禁止使用XHR对象向不同源的服务器地址发起HTTP请求，即不能发送跨域ajax请求【CSRF跨站请求伪造】
DOM:禁止操作非源页面的DOM和JS对象。【iframe情况】
本地存储:Cookie,LocalStorage和IndexDB 无法跨域读取
```

响应头

```
Access-Control-Allow-Origin：接受指定域名的请求
Access-Control-Allow-Credentials:表示跨域请求是否允许携带cookie
```

token刷新

```
在token中存储刷新时间，前端拦截请求，如果超过刷新时间没超过过期时间，就用旧的token去换取新的token。
如果遇到同时发送多请求，就挂载一个promise，将后续请求放入promise，在第一次请求刷新token后再进行后续请求。
```

