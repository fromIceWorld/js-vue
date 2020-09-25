#### vuex(3.1.1)

1. 建立模块间关系 new ModuleCollection(options)

   ```javascript
   new Vuex.Store({
       modules:{
           a,
           b
       }
   })
   
   //Store实例
   store:{
       this._committing = false;
       this._actions = Object.create(null);
       this._actionSubscribers = [];
       this._mutations = Object.create(null);
       this._wrappedGetters = Object.create(null);
       this._modules = new ModuleCollection(options);   //提取数据()
       this._modulesNamespaceMap = Object.create(null); //模块名称映射模块(name=>module)
       this._subscribers = [];
       this._watcherVM = new Vue();
       dispatch:'dispatch方法',
       commit:'commit方法'    
   }
   
   //store._modules
   _module = {
       _children:{
           a:{//模块A
               rawModule:a【本模块】,
               state:a.state【本模块的state】
           },
           b:{//模块B
               rawModule:b【本模块】,
               state:b.state【本模块的state】
           }
       },
       rawModule:options【new时传入的options】,
       state:{
           state:自身state,
           a:a.state    //指向a模块的state
           b:b.state    //指向b模块的state
       },
       root:_module【根】
   }
   ```

2. 初始化数据(installModule)

   ```javascript
   1-初始化 state getter mutation action
   _mutations:{
       'a/mutationA'：[mutation,mutation2...]
   }
   _actions:{//异步
       'a/actionA':[wrappedActionHandler()]
   }
   _wrappedGetters:{
       'a/getterA':getterA(a.state, a.getters, root.state, root.getters)
   }
   state：{
       'a':a.state
   },
   ```

3. 包装实例

   ```javascript
   store._vm = new Vue({
         data: {
           $$state: state
         },
         computed: computed  //getter属性
       });
   ```

4. 调用API

   ```javascript
   1-getter 调用_wrappedGetters
    getter生成:
   	module.forEachGetter(function (getter, key) {
         var namespacedType = namespace + key;
         registerGetter(store, namespacedType, getter, local);
       });
   
    	function registerGetter (store, type, rawGetter, local) {
       store._wrappedGetters[type] = function wrappedGetter (store) {
         return rawGetter(
           local.state, // local state
           local.getters, // local getters
           store.state, // root state
           store.getters // root getters
         )
       };
     }
     步骤3包装store实例就是将store._wrappedGetters转换为computed，因此getter可以获取四个属性
     (本模块state, 本模块getters, 根state, 根getters)
   2-commit 调用 _mutations
   	_mutation
   	  function registerMutation (store, type, handler, local) {
           var entry = store._mutations[type] || (store._mutations[type] = []);
           entry.push(function wrappedMutationHandler (payload) {
             handler.call(store, local.state, payload);
           });
         }
      
       commit 调用的mutation对当前state进行操作
   3-dispatch 调用 _actions
   	_actions生成：
       module.forEachAction(function (action, key) {
         var type = action.root ? key : namespace + key;
         var handler = action.handler || action;
         registerAction(store, type, handler, local);
       });
   	
   	function registerAction (store, type, handler, local) {
       var entry = store._actions[type] || (store._actions[type] = []);
       entry.push(function wrappedActionHandler (payload, cb) {
         var res = handler.call(store, {
           dispatch: local.dispatch,
           commit: local.commit,
           getters: local.getters,
           state: local.state,
           rootGetters: store.getters,
           rootState: store.state
         }, payload, cb);
         if (!isPromise(res)) {
           res = Promise.resolve(res);
         }
         if (store._devtoolHook) {
           return res.catch(function (err) {
             store._devtoolHook.emit('vuex:error', err);
             throw err
           })
         } else {
           return res
         }
       });
     }
      在dispatch中的函数有两个参数(
          {
              local.dispatch,
              local.commit,
              local.getters,
              local.state,
              store.getters,
              store.state 
          },
          payload),可以获取当前模块的各种数据以及store的部分数据
   4-mapStates / mapGetters / mapMutations / mapActions 类似的批量导出数据的方法
     mapStates(nameSpace, states):传入path获取指定模块(可不传默认根)，
     states是要获取的key：value集合
   ```

   

5. 



###### Store实例

