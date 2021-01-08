session，cookie，token来源：

```
http无状态
```

session：

```
来源：用户的浏览器在访问【服务器】由服务器生成session及对应sessionID，服务端保存session，将sessionID返回给客户端，
优点：服务端保存session，安全
缺点：每次回话服务器都保存session(压力大)；如果配置负载均衡，会产生新的session
```

cookie：

```
来源：服务端和客户端每次信息交流都携带cookie，可在cookie中保存数据用于识别客户端身份
优点：
缺点：保存在客户端，可用js获取（可通过服务端配置httponly：true，禁止客户端操作）
```

token：

```

```

jwt：

```
json-web-token:服务端加密（用户信息+关键字+过期时间）发送给客户端，客户端每次请求携带jwt，服务端通过解密jwt获取用户信息及过期时间
优点：可授权登录，用运算时间获取存储空间，不用存储token
缺点：1-固定时间后会过期(无法单纯的更新expiresIn，更新expiresIn，会生成新的token)[redis解决？]
```

