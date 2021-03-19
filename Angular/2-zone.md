#### zone

​	zone是一个执行上下文，专门为异步操作设计，通过重写异步操作[setTimeout，setInterval，setImmediate，promise，ajax。。。]等方法用来拦截追踪异步操作。

​	主要操作是重写异步操作，添加zone函数，当触发异步时，记录收集zone，回调异步时在记录的zone的执行上下文中执行异步操作。

​	有一个‘<root>’zone,其他的zone都是根的子节点，

zone：执行上下文

zoneDelegate：储存钩子函数，在运行阶段判断是否调用钩子函数，**注意**：用户钩子会拦截程序默认操作

zoneTask：存储

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
	run(fn) 切换zone，让fn在指定的zone中执行，完成后恢复之前的zone
    fork
    wrap
    runGuarded
    runTask
    scheduleTask
    cancelTask
    _updateTaskCount【更新task 数量 触发 onhasTask 钩子】
}
`zone 中的 操作函数 对应的都是 ZoneDelegate中的生命周期钩子函数`:


zone                  ZoneDelegate
----------------------------
fork                  fork[onFork]
wrap                  intercept[onIntercept]
run/runGuarded        invoke[onInvoke]
handleError[处理错误]   handleError[onHandleError]

runTask               invokeTask[onInvokeTask]
scheduleTask          scheduleTask[onScheduleTask]
cancelTask            cancelTask[onCancelTask]
_updateTaskCount      hasTask[onhasTask]


`每次添加 钩子函数需要注意:`
例: 
	每次zone使用操作符时都会调用对应<生命周期函数>,后续操作需要在你<生命周期>钩子函数中操作
比如 onFork 钩子,当没有onFork钩子时,会创建新的zone并返回,但是如果有 onFork 钩子,后续流程会走 onFork函数,如果在 onFork 钩子里没有返回新的zone,就不会生成zone, 所以需要你在 onFork 函数中生成zone并返回.
```

##### zoneSpec

```typescript
【通过传递 zoneSpec 配置来控制 zone 的拦截操作。】
interface ZoneSpec {
    name: string;                                 // 新生zone的名称
    properties?: { [key: string]: any };          // 传递共享的数据
  ----------------------------初始化时注册的钩子函数---------------------  
    onFork?: ( ... );         //在 fork 时执行                    
    onIntercept?: ( ... );    
    onInvoke?: ( ... );       //zone.run()执行时
    onHandleError?: ( ... );  //catch到错误时执行
    onScheduleTask?: ( ... ); //检查到异步操作执行时执行
    onInvokeTask?: ( ... );   //异步操作的回调被执行时执行
    onCancelTask?: ( ... );   //异步取消时调用【clearTimeout】
    onHasTask?: ( ... );      //监听任务队列的 空/非空 状态变换
}
{
    name:'zone1',
    onFork:function(){console.log('onFork',arguments)},
    onIntercept:function(){console.log('onIntercept',arguments)},
    onInvoke:function(){console.log('onInvoke',arguments)},
    onHandleError:function(){console.log('onHandleError',arguments)},
    onScheduleTask:function(){console.log('onScheduleTask',arguments)},
    onInvokeTask:function(){console.log('onInvokeTask',arguments)}},
    onCancelTask:function(){console.log('onCancelTask',arguments)}},
    onHasTask:function(){console.log('onHasTask',arguments)}
}
`注意:`
	当有连续的钩子函数时,需要在钩子函数中承担默认操作(因为添加钩子函数会将默认操作替代掉,因此需要在钩子函数中添加)
```

##### ZoneTask

```typescript
根据任务类型分类[微任务,宏任务,事件]，
生成 ZoneTask 实例 task, 与生命周期[onScheduleTask,onInvokeTask,onCancelTask,onHasTask]
相关
`task中保存了异步应用的调用栈`

@params type   :类型
@params source :识别不同的任务:['fetch','promise.then'....]
@params callback
@params options
@params scheduleFn
@params cancelFn

function ZoneTask(type, source, callback, options, scheduleFn, cancelFn) {
    this._zone = null;
    this.runCount = 0;
    this._zoneDelegates = null;
    this._state = 'notScheduled';
    this.type = type;
    this.source = source;
    this.data = options;
    this.scheduleFn = scheduleFn;
    this.cancelFn = cancelFn;
    this.callback = callback;
    var self = this;
    // TODO: @JiaLiPassion options should have interface
    if (type === eventTask && options && options.useG) {
    	this.invoke = ZoneTask.invokeTask;
    }else {
        this.invoke = function () {
        	return ZoneTask.invokeTask.call(global, self, this, arguments);
    };
    }
}
```



##### ZoneDelegate

```typescript
`当前zone的代理，在new zone时产生对应代理_zoneDelegate，根据传入的配置(代理目标zone，父级代理，代理配置)生成对应的子代理`
根据 zoneSpec 配置的不同的钩子函数 保存对应的zoneSpec, parentDelegate, CurrZone
当


当调用 zone 的方法时，内部调用了  ZoneDelegate 的对应方法，
  fork[zone] -> fork[ZoneDelegate] -> 
      				_forkZS.onFork(this._forkDlgt!, this.zone, targetZone, zoneSpec) 
			        new Zone(targetZone, zoneSpec)
	如果当前 ZoneDelegate 有 _forkZS，就调用对应的周期函数onFork，在周期函数里做拦截，最后生成zone。如果没有就证明此zone的上级都没有配置生命周期onFork函数，就直接生成zone返回。

    
    
interface _zoneDelegate  {
    public zone: Zone;  //代理的当前zone

    private _taskCounts:
        {microTask: number,
         macroTask: number,
         eventTask: number} = {'microTask': 0, 'macroTask': 0, 'eventTask': 0};
    
    private _parentDelegate: // 父zone代理

-------------------   
**ZS      : zoneSpec 
**Dlgt    : _parent._zoneDelegate
**CurrZone: 当前zone

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

通过设置_currentZoneFrame，进入当前zone，然后执行生命周期函数this._zoneDelegate.invoke，没有_invokeZS就直接运行callback。最后回到上级zone。
```

#### ZoneAwarePromise

**重点**:promise 和 zone之间的联系:

resolvePromise,then,finally **-触发->*** 

*scheduleResolveOrReject  **-触发->*** 

*zone.scheduleMicroTask  **-触发->***

*zone._zoneDelegate.scheduleTask* ***-触发->***

*onScheduleTask生命周期*

```typescript
function ZoneAwarePromise(executor) {
            var promise = this;
            if (!(promise instanceof ZoneAwarePromise)) {
                throw new Error('Must be an instanceof Promise.');
            }
            promise[symbolState] = UNRESOLVED;
            promise[symbolValue] = []; // queue;
            try {
                executor && executor(makeResolver(promise, RESOLVED),
                          makeResolver(promise, REJECTED));
            }
            catch (error) {
                resolvePromise(promise, false, error);
            }
        }
promise 状态：UNRESOLVED,
             RESOLVED,
             REJECTED,
             REJECTED_NO_CATCH
promise 值  :[]
```

##### makeResolver

```typescript
根据状态 生成 resolve/reject
function makeResolver(promise, state) {
    return function (v) {
        try {
            resolvePromise(promise, state, v);
        }
        catch (err) {
            resolvePromise(promise, false, err);
        }
        // Do not return value or you will break the Promise spec.
    };
}
```

##### resolvePromise

```typescript
@params promise, 
@params state     状态
@params value     值/错误

用于解析 Promise

```

#### setTimeout

setTimeout的触发过程：

1. patch重写

   ```typescript
   `获取原生setTimeout，用 patchFn 来替代原生setTimeout`
   
   patchTimer(global, 'set', 'clear', 'Timeout');
   patchMethod(global, 'setTimeout', patchFn)
   delegate = proto[delegateName] = global['setTimeout'];
   var patchDelegate_1 = patchFn(delegate, delegateName, name);
   proto[name] = function () {
       return patchDelegate_1(this, arguments);
   };
   `patchFn是重写 setTimeout的关键`
   ```

   patchTimer【重写setTimeout】

   ```typescript
   `scheduleMacroTaskWithCurrentZone 操作 与zone 关联`
   `scheduleTask 属于 patchTimer`
   `patchMethod 的第三个参数就是 重写后的setTimeout`
   patchMethod(window, setName, function (delegate) { return function (self, args) {
               if (typeof args[0] === 'function') {
                   var options = {
                       isPeriodic: nameSuffix === 'Interval',
                       delay: (nameSuffix === 'Timeout' || nameSuffix === 'Interval') ? args[1] || 0 :
                           undefined,
                       args: args
                   };
                   var task = scheduleMacroTaskWithCurrentZone(setName, args[0], 
                                                               options, scheduleTask, clearTask);
                   if (!task) {
                       return task;
                   }
                   // Node.js must additionally support the ref and unref functions.
                   var handle = task.data.handleId;
                   if (typeof handle === 'number') {
                       // for non nodejs env, we save handleId: task
                       // mapping in local cache for clearTimeout
                       tasksByHandleId[handle] = task;
                   }
                   else if (handle) {
                       // for nodejs env, we save task
                       // reference in timerId Object for clearTimeout
                       handle[taskSymbol] = task;
                   }
                   // check whether handle is null, because some polyfill or browser
                   // may return undefined from setTimeout/setInterval/setImmediate/requestAnimationFrame
                   if (handle && handle.ref && handle.unref && typeof handle.ref === 'function' &&
                       typeof handle.unref === 'function') {
                       task.ref = handle.ref.bind(handle);
                       task.unref = handle.unref.bind(handle);
                   }
                   if (typeof handle === 'number' || handle) {
                       return handle;
                   }
                   return task;
               }
               else {
                   // cause an error by calling it directly.
                   return delegate.apply(window, args);
               }
           };
   ```

   patchMethod

   ```typescript
   function patchMethod(target, name, patchFn) {
       var proto = target;
       while (proto && !proto.hasOwnProperty(name)) {
           proto = ObjectGetPrototypeOf(proto);
       }
       if (!proto && target[name]) {
           // somehow we did not find it, but we can see it. This happens on IE for Window properties.
           proto = target;
       }
       var delegateName = zoneSymbol(name);
       var delegate = null;
       if (proto && !(delegate = proto[delegateName])) {
           delegate = proto[delegateName] = proto[name];
           // check whether proto[name] is writable
           // some property is readonly in safari, such as HtmlCanvasElement.prototype.toBlob
           var desc = proto && ObjectGetOwnPropertyDescriptor(proto, name);
           if (isPropertyWritable(desc)) {
               var patchDelegate_1 = patchFn(delegate, delegateName, name);
               proto[name] = function () {
                   return patchDelegate_1(this, arguments);
               };
               attachOriginToPatched(proto[name], delegate);
               if (shouldCopySymbolProperties) {
                   copySymbolProperties(delegate, proto[name]);
               }
           }
       }
       return delegate;
   }
   `patchFn 返回闭包函数`： patchDelegate_1【patchTimer 第三个参数返回的函数】
   `重写 setTimeout：内部调用 patchDelegate_1`
   `返回 delegate：原生setTimeout；并将 delegate 传入 patchDelegate_1，在不满足参数条件时，用原生函数报错`
   ```

   scheduleMacroTaskWithCurrentZone【调用 setTimeout阶段】

   ```typescript
   @params source   "setTimeout"
   @params callback "setTimeout的回调函数"
   @params data     "记录"{
                       isPeriodic: nameSuffix === 'Interval', 循环异步???
                       delay: (nameSuffix === 'Timeout' || nameSuffix === 'Interval') ? args[1] || 0 :
                           undefined,
                       args: args 'setTimeout的参数'
                   }
   @params customSchedule
   @params customCancel   "取消setTimeout"
   
   function scheduleMacroTaskWithCurrentZone(source, callback, data, customSchedule, customCancel) {
       return Zone.current.scheduleMacroTask(source, callback, data, customSchedule, customCancel);
   }
   `使用当前 zone 安排宏任务`
   ```

2. 触发zone.current.scheduleMacroTask

   ```typescript
   Zone.prototype.scheduleMacroTask = function (source, callback, data, customSchedule, customCancel) {
               return this.scheduleTask(new ZoneTask('macroTask', source, callback, data, customSchedule, customCancel));
           };
   `生成 task 再调用 scheduleTask`
   ```

   

3. ZoneTask

   ```typescript
   `task 保存： 异步类型，异步名称，异步回调函数，异步配置`
   `task 中的 invoke函数 是else`
   `初始化 task 的状态 _state 为 'notScheduled'`
   
   function ZoneTask(type, source, callback, options, scheduleFn, cancelFn) {
               this._zone = null;
               this.runCount = 0;
               this._zoneDelegates = null;
               this._state = 'notScheduled';
               this.type = type;
               this.source = source;
               this.data = options;
               this.scheduleFn = scheduleFn;
               this.cancelFn = cancelFn;
               this.callback = callback;
               var self = this;
               // TODO: @JiaLiPassion options should have interface
               if (type === eventTask && options && options.useG) {
                   this.invoke = ZoneTask.invokeTask;
               }
               else {
                   this.invoke = function () {
                       return ZoneTask.invokeTask.call(global, self, this, arguments);
                   };
               }
           }
   
   ```

4. scheduleTask

   ```typescript
   `在 scheduleTask 中 改变 task 的状态 'notScheduled' -> 'scheduling' `
   `调用代理的 scheduleTask函数  _zoneDelegate.scheduleTask` 触发 onScheduleTask 钩子函数
   `对错误进行拦截，触发 onHandleError 钩子`
   `更改 task 的状态 'scheduling' ->  'scheduled'`
   `task 存储 zone`
   Zone.prototype.scheduleTask = function (task) {
               task._transitionTo(scheduling, notScheduled);
               var zoneDelegates = [];
               task._zoneDelegates = zoneDelegates;
               task._zone = this;
               try {
                   task = this._zoneDelegate.scheduleTask(this, task);
               }
               catch (err) {
                   // should set task's state to unknown when scheduleTask throw error
                   // because the err may from reschedule, so the fromState maybe notScheduled
                   task._transitionTo(unknown, scheduling, notScheduled);
                   // TODO: @JiaLiPassion, should we check the result from handleError?
                   this._zoneDelegate.handleError(this, err);
                   throw err;
               }
               if (task._zoneDelegates === zoneDelegates) {
                   // we have to check because internally the delegate can reschedule the task.
                   this._updateTaskCount(task, 1);
               }
               if (task.state == scheduling) {
                   task._transitionTo(scheduled, scheduling);
               }
               return task;
           }
   
   this._zoneDelegate.scheduleTask(this, task)【`此阶段上触发 onScheduleTask`】
   ```

5. _zoneDelegate.scheduleTask 【触发《onScheduleTask》钩子】

   ```typescript
   `在代理阶段，会触发《onScheduleTask》并为《onHasTask》钩子做准备`
   `触发 onScheduleTask 钩子函数`
   `有《onHasTask》钩子就将 ZoneDelegate代理 存储到task里`
   `执行用户的《onScheduleTask》钩子，传入参数`
   
   `没有《onScheduleTask》 就正常执行 `
   ZoneDelegate.prototype.scheduleTask = function (targetZone, task) {
               var returnTask = task;
               if (this._scheduleTaskZS) {
                   if (this._hasTaskZS) {
                       returnTask._zoneDelegates.push(this._hasTaskDlgtOwner);
                   }
                   returnTask = this._scheduleTaskZS.onScheduleTask(this._scheduleTaskDlgt, 
                                           this._scheduleTaskCurrZone, targetZone, task);
                   if (!returnTask)
                       returnTask = task;
               }
               else {
                   if (task.scheduleFn) {
                       task.scheduleFn(task);
                   }
                   else if (task.type == microTask) {
                       scheduleMicroTask(task);
                   }
                   else {
                       throw new Error('Task is missing scheduleFn.');
                   }
               }
               return returnTask;
           };
   `task.scheduleFn 在 ‘setTimeout 中是 scheduleTask函数👇`
   ```

   scheduleTask

   ```typescript
   function scheduleTask(task) {
           var data = task.data;
           function timer() {
               try {
                   task.invoke.apply(this, arguments);
               }
               finally {
                   // issue-934, task will be cancelled
                   // even it is a periodic task such as
                   // setInterval
                   if (!(task.data && task.data.isPeriodic)) {
                       if (typeof data.handleId === 'number') {
                           // in non-nodejs env, we remove timerId
                           // from local cache
                           delete tasksByHandleId[data.handleId];
                       }
                       else if (data.handleId) {
                           // Node returns complex objects as handleIds
                           // we remove task reference from timer object
                           data.handleId[taskSymbol] = null;
                       }
                   }
               }
           }
           data.args[0] = timer;
           data.handleId = setNative.apply(window, data.args);
           return task;
       }
   `调用回调函数，由于回调函数被重写，因此会先调用《钩子函数》`
   `调用 task.invokeTask 内部再调用 task.zone.runTask`
   ```

   zone.runTask【调用《onInvokeTask钩子函数》阶段】，【以及判断是否调用 《onHasTask》钩子】

   ```typescript
   `在 setTimeout 事件中 会在执行 《onInvokeTask》钩子前 删除 task.cancelFn【cancelSetTimeout函数】`
   `调用 《onInvokeTask》钩子`有报错就执行 《onHandleError》钩子
   `最后 判断是否会触发 《onHasTask》钩子`
   Zone.prototype.runTask = function (task, applyThis, applyArgs) {
               if (task.zone != this) {
                   throw new Error('A task can only be run in the zone of creation! (Creation: ' +
                       (task.zone || NO_ZONE).name + '; Execution: ' + this.name + ')');
               }
               if (task.state === notScheduled && (task.type === eventTask || task.type === macroTask)) {
                   return;
               }
               var reEntryGuard = task.state != running;
               reEntryGuard && task._transitionTo(running, scheduled);
               task.runCount++;
               var previousTask = _currentTask;
               _currentTask = task;
               _currentZoneFrame = { parent: _currentZoneFrame, zone: this };
               try {
                   if (task.type == macroTask && task.data && !task.data.isPeriodic) {
                       task.cancelFn = undefined;
                   }
                   try {
                       return this._zoneDelegate.invokeTask(this, task, applyThis, applyArgs);
                   }
                   catch (error) {
                       if (this._zoneDelegate.handleError(this, error)) {
                           throw error;
                       }
                   }
               }
               finally {
                   // if the task's state is notScheduled or unknown, then it has already been cancelled
                   // we should not reset the state to scheduled
                   if (task.state !== notScheduled && task.state !== unknown) {
                       if (task.type == eventTask || (task.data && task.data.isPeriodic)) {
                           reEntryGuard && task._transitionTo(scheduled, running);
                       }
                       else {
                           task.runCount = 0;
                           this._updateTaskCount(task, -1);
                           reEntryGuard &&
                               task._transitionTo(notScheduled, running, notScheduled);
                       }
                   }
                   _currentZoneFrame = _currentZoneFrame.parent;
                   _currentTask = previousTask;
               }
           };
   ```

#### zone + Angular => NgZone

```

```



#### 问题

1. 异步任务之间维持zone

   

   

2. 每次执行完成都会恢复原来的zone【zone.run】

3. 异步任务 记录zone

#### 相关文章

https://juejin.cn/post/6844903929394757639

https://zhuanlan.zhihu.com/p/50835920