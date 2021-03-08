### fs

------

##### `readFileSync`:读取文件

```javascript
fs.readFileSync(path[, options])

path <string> | <Buffer> | <URL> | <integer> 文件名或文件描述符。
options <Object> | <string>
    encoding <string> | <null> 默认值: null。
    flag <string> 参见文件系统 flag 的支持。 默认值: 'r'。
返回: <string> | <Buffer>
```

##### `writeFileSync`:写文件

```
fs.writeFileSync(file, data[, options])

file <string> | <Buffer> | <URL> | <integer> 文件名或文件描述符。
data <string> | <Buffer> | <TypedArray> | <DataView>
options <Object> | <string>
    encoding <string> | <null> 默认值: 'utf8'。
    mode <integer> 默认值: 0o666。
    flag <string> 参见文件系统 flag 的支持。 默认值: 'w'。

```

##### `readdir`:读取目录内容

```
fs.readdir(path[, options], callback)

path <string> | <Buffer> | <URL>
options <string> | <Object>
    encoding <string> 默认值: 'utf8'。
    withFileTypes <boolean> 默认值: false。
callback <Function>
    err <Error>
    files <string[]> | <Buffer[]> | <fs.Dirent[]>
```

