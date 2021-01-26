#### zone

​	zone是一个执行上下文，专门为异步操作设计，通过重写异步操作[setTimeout，setInterval，setImmediate，promise，ajax。。。]等方法用来拦截追踪异步操作。

​	有一个‘<root>’zone,其他的zone都是根的子节点，

```javascript
class zone  {
	_parent,
    _name,
    _properties,
    _zoneDelegate,
        
    constructor(parent: Zone|null, zoneSpec: ZoneSpec|null) {
          this._parent = parent;
          this._name = zoneSpec ? zoneSpec.name || 'unnamed' : '<root>';
          this._properties = zoneSpec && zoneSpec.properties || {};
          this._zoneDelegate =
              new ZoneDelegate(
              			this, this._parent && this._parent._zoneDelegate, zoneSpec);
        }
	run(fn) 切换zone，让fn在指定的zone中执行，完成后恢复之前的zone？？？
        
}
```

##### zoneSpec

```
【区域规范】
interface ZoneSpec {
    name: string;                                 // 新生zone的名称
    properties?: { [key: string]: any };          // 传递共享的数据
  -------------------------------钩子函数---------------------  
    onFork?: ( ... );                             
    onIntercept?: ( ... );
    onInvoke?: ( ... );  //在进入zone时执行
    onHandleError?: ( ... );
    onScheduleTask?: ( ... ); //检查到异步操作执行时执行
    onInvokeTask?: ( ... ); //异步操作的回调被执行时执行
    onCancelTask?: ( ... );
    onHasTask?: ( ... );  //监听任务队列的 空/非空 状态变换
}
```

##### ZoneDelegate

```typescript
【当前zone的代理】
当调用 zone 的方法时，内部调用了 ZoneDelegate 的对应方法，
  fork[zone] -> fork[ZoneDelegate] -> 
      				_forkZS.onFork(this._forkDlgt!, this.zone, targetZone, zoneSpec) 
			        new Zone(targetZone, zoneSpec)
	如果当前 ZoneDelegate 有 _forkZS，就调用对应的周期函数onFork，在周期函数里做拦截，最后生成zone。如果没有就证明此zone的上级都没有配置生命周期onFork函数，就直接生成zone返回。

    
    
interface _zoneDelegate  {
    public zone: Zone;  //当前zone

    private _taskCounts:
        {microTask: number,
         macroTask: number,
         eventTask: number} = {'microTask': 0, 'macroTask': 0, 'eventTask': 0};
    
    private _parentDelegate: //父zone代理

-----------根据是否有监听函数，保存ZoneSpec/parentDelegate/zone，没有就使用父级的对应属性--------   

    private _forkDlgt: ZoneDelegate|null;
    private _forkZS: ZoneSpec|null;
    private _forkCurrZone: Zone|null;

    private _interceptDlgt: ZoneDelegate|null;
    private _interceptZS: ZoneSpec|null;
    private _interceptCurrZone: Zone|null;

    private _invokeDlgt: ZoneDelegate|null;
    private _invokeZS: ZoneSpec|null;
    private _invokeCurrZone: Zone|null;

    private _handleErrorDlgt: ZoneDelegate|null;
    private _handleErrorZS: ZoneSpec|null;
    private _handleErrorCurrZone: Zone|null;

    private _scheduleTaskDlgt: ZoneDelegate|null;
    private _scheduleTaskZS: ZoneSpec|null;
    private _scheduleTaskCurrZone: Zone|null;

    private _invokeTaskDlgt: ZoneDelegate|null;
    private _invokeTaskZS: ZoneSpec|null;
    private _invokeTaskCurrZone: Zone|null;

    private _cancelTaskDlgt: ZoneDelegate|null;
    private _cancelTaskZS: ZoneSpec|null;
    private _cancelTaskCurrZone: Zone|null;

    private _hasTaskDlgt: ZoneDelegate|null;
    private _hasTaskDlgtOwner: ZoneDelegate|null;
    private _hasTaskZS: ZoneSpec|null;
    private _hasTaskCurrZone: Zone|null;
    
}
```

##### zone.run(fn)

```typescript
class zone {
    public run<T>(
        callback: (...args: any[]) => T, applyThis?: any, applyArgs?: any[], source?: string): T {
      _currentZoneFrame = {parent: _currentZoneFrame, zone: this};
      try {
        return this._zoneDelegate.invoke(this, callback, applyThis, applyArgs, source);
      } finally {
        _currentZoneFrame = _currentZoneFrame.parent!;
      }
    }
}

通过设置_currentZoneFrame，进入当前zone，然后执行生命周期函数this._zoneDelegate.invoke，没有就直接运行callback。最后回到上级zone。
```

#### 问题

1. 异步任务之间维持zone
2. 每次执行完成都会回复原来的zone【zone.run】

#### 相关文章

https://juejin.cn/post/6844903929394757639