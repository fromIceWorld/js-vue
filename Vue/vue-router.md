### vue-router

***HASH:***

------

**1- router实例**

```javascript
router = {
    app:
    apps:
    options:用户传入的配置。
    beforeHooks：[],
    resolveHooks:[],
    afterHooks:[],
    matcher:{
        match:对比 当前路由(from) 和 location(to) 的方法,
        addRouters:动态添加路由的方法    
    },
    history：{//History实例,控制路由跳转,监听url变化
        
    }     
}
new vueRouter({
    routers:[
        {
            path:'/home',
            name:'home',
            component:home,
            children:[
                {
                    path:'son/:age',
                    component:son,
                    name:son
                },
                {
                    path:'girl',
                    component:girl,
                    name:'girl'
                },
            ]
        }
    ]
})

1- 在初始化过程中,会将options中的路由配置进行拆分(
    pathList:['/home', '/home/son/:age', '/home/girl'],
    pathMap:{
        '/home':{ 路由记录 },
        '/home/son/:age':{ 路由记录 },
        '/home/girl':{ 路由记录 }    
    },
    nameMap:{
        'home':{ 路由记录 },
        'son':{ 路由记录 },
        'girl':{ 路由记录 }    
    })
    路由记录：{
          path: '/home/son/:age',
          regex: compileRouteRegex(normalizedPath, pathToRegexpOptions),
          components: { default: route.component },
          instances: {},
          name: name,
          parent: homeRecord,
          matchAs: matchAs,
          redirect: '',
          beforeEnter: route.beforeEnter,
          meta:  {},
          props:
            route.props == null
              ? {}
              : route.components
                ? route.props
                : { default: route.props }
    }
2- 获取 pathList(路径列表), pathMap(路径=>record映射),nameMap(名称=>record映射)
   在 match 过程中 可以使用以上数据。
```

**2- 混入**

```javascript
 beforeCreate: function beforeCreate () {
        if (isDef(this.$options.router)) {
          this._routerRoot = this;
          this._router = this.$options.router;
          this._router.init(this);
          Vue.util.defineReactive(this, '_route', this._router.history.current);
        } else {
          this._routerRoot = (this.$parent && this.$parent._routerRoot) || this;
        }
        registerInstance(this, this);
      },
      destroyed: function destroyed () {
        registerInstance(this);
      }
```

有 router实例的混入:

```
  VueRouter.prototype.init = function init (app /* Vue component instance */) {
    var this$1 = this;
    this.apps.push(app);
    app.$once('hook:destroyed', function () {
      var index = this$1.apps.indexOf(app);
      if (index > -1) { this$1.apps.splice(index, 1); }
      if (this$1.app === app) { this$1.app = this$1.apps[0] || null; }
    });
    if (this.app) {
      return
    }
    this.app = app;
      var setupHashListener = function () {
        history.setupListeners();
      };
      history.transitionTo(
        history.getCurrentLocation(),
        setupHashListener,
        setupHashListener
      );
    }
    history.listen(function (route) {
      this$1.apps.forEach(function (app) {
        app._route = route;
      });
    });
  };

1-执行 init 操作
	.初始路由跳转(/)
	.添加回调函数(回调函数修改route,routerView收集route,route在修改时routeView进行渲染。)
2-根vm添加 _route 属性指向 route(初始为start,路径为/),	
```

无router实例的混入:

```
保存_routerRoot指向根vm
```

注册实例

```javascript
registerInstance(this, this)
```

组件销毁阶段销毁实例

**3- 路由跳转**( this.$router.push({name:'home'}) )

```javascript
路由的跳转是经过 transitionTo调用 match 对比找到对应的record,创建新route【新的route包含matched数据(保存当前路由到根路由的所有record)】,最后confirmTransition阶段对比新的route和当前router,
    获得:要销毁的组件 | 要更新的组件 | 要进入的组件,再加入 导航守卫⚔。最终生成调用队列[queue]
    

route = {
      name: location.name || (record && record.name),
      meta: (record && record.meta) || {},
      path: location.path || '/',
      hash: location.hash || '',
      query: query,
      params: location.params || {},
      fullPath: getFullPath(location, stringifyQuery),
      matched: record ? formatMatch(record) : []
    };
```

**4- 页面Hash监听(同上)**

