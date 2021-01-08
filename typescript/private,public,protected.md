##### 0-关于修饰符

```
private/protected/readonly 修饰符只是ts支持的一种语法，js只支持static
```

##### 1-private

```
类中的修饰符，只能在【所属类】中使用,无法在实例中使用
```

##### 2-protected

```
类中的修饰符，只能在【所属类及其子类】中使用,无法在实例中使用
```

##### 3-readonly

```
类中的修饰符,无法修改，只能在初始化时赋值
```

##### 4-static

```
编译为 类的静态属性。
class Animal{
	static type = 'man';
}
编译为
function Animal(){}
Animal.type = 'name'
```

如图：

![private.proteted](C:\Users\崔冰冰\Desktop\sea\typescript\private.proteted.png)