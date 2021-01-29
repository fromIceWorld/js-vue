#### 1-main.ts

```javascript
platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
platformBrowserDynamic 函数加载依赖模块， 调用返回值的 bootstrapModule函数 加载核心app.module【业务入口】
```

#### 2-platformBrowserDynamic

```javascript
const platformBrowserDynamic = createPlatformFactory(
    platformCoreDynamic, 
    'browserDynamic', 
    INTERNAL_BROWSER_DYNAMIC_PLATFORM_PROVIDERS
);
由 createPlatformFactory 【创建平台实例的工厂函数】接收三个值构造
。platformCoreDynamic                          //平台核心动态
。'browserDynamic' 【标识为浏览器平台】            //平台标志
。INTERNAL_BROWSER_DYNAMIC_PLATFORM_PROVIDERS  //平台依赖提供数据：[
     [
    		{provide: PLATFORM_ID, useValue: PLATFORM_BROWSER_ID},
            {provide: PLATFORM_INITIALIZER, useValue: initDomAdapter, multi: true},
            {provide: DOCUMENT, useFactory: _document, deps: []},],
    {
        provide: COMPILER_OPTIONS,
        useValue: {providers: [{provide: ResourceLoader, useClass: ResourceLoaderImpl, deps: []}]},
        multi: true
      },
  	{	provide: PLATFORM_ID, useValue: PLATFORM_BROWSER_ID},
    ]
`依赖`：
    COMPILER_OPTIONS:       编译配置`<InjectionToken>实例`;
    PLATFORM_ID：           平台ID`<InjectionToken>实例`;
	PLATFORM_INITIALIZER:   平台初始化时执行的函数`<InjectionToken>实例`;
	DOCUMENT:               浏览器document`<InjectionToken>实例`;
**
`核心:createPlatformFactory函数 和 平台依赖`
```

##### 2.1-platformCoreDynamic

```javascript
【平台核心动态】
const platformCoreDynamic = createPlatformFactory(platformCore, 'coreDynamic', [
    { provide: COMPILER_OPTIONS, useValue: ɵ0, multi: true },
    { provide: CompilerFactory, useClass: JitCompilerFactory, deps: [COMPILER_OPTIONS] },
]);
。platformCore                  //平台核心
。'coreDynamic'                 //标志
。平台核心依赖：[
              {provide: COMPILER_OPTIONS, useValue: {}, multi: true},
              {provide: CompilerFactory, useClass: JitCompilerFactory, deps: [COMPILER_OPTIONS]},
            ]            
`依赖`：
    COMPILER_OPTIONS：  编译配置`<InjectionToken>实例`
	CompilerFactory：   编译的工厂函数 `函数CompilerFactory`
    
**注：
核心:createPlatformFactory函数
platformBrowserDynamic[2] 和 platformCoreDynamic[2.1] 都是由【createPlatformFactory构造】
```

###### 2.1.1-platformCore

```typescript
【平台核心】
const platformCore = createPlatformFactory(null, 'core', _CORE_PLATFORM_PROVIDERS);

null:无更深依赖
'core':平台标志
_CORE_PLATFORM_PROVIDERS：[
      // Set a default platform name for platforms that don't set it explicitly.
      {provide: PLATFORM_ID, useValue: 'unknown'},
      {provide: PlatformRef, deps: [Injector]},
      {provide: TestabilityRegistry, deps: []},
      {provide: Console, deps: []},
    ];
`依赖`：
    PlatformRef            平台构造函数`函数 PlatformRef`;
    TestabilityRegistry    ？？？`函数 TestabilityRegistry`;
    Console                console函数`函数 Console`;
**注
这个也是由 createPlatformFactory 构造【2，2.1，2.1.1都是由其构造】
```

#### 2.*-createPlatformFactory

```typescript
【创建实例化平台的工厂函数】

	先创建【平台核心:platformCore,1级】，
    再创建【平台核心动态:platformCoreDynamic，2级】，
    再创建【平台浏览器动态:platformBrowserDynamic，3级】，最后生成：
	const platformBrowserDynamic = [platformCoreDynamic[platformCore]]

export function createPlatformFactory(
    parentPlatformFactory: ((extraProviders?: StaticProvider[]) => PlatformRef)|null,         name: string,
    providers: StaticProvider[] = []): (extraProviders?: StaticProvider[]) => PlatformRef {
  const desc = `Platform: ${name}`;
  const marker = new InjectionToken(desc);
  return (extraProviders: StaticProvider[] = []) => {
    let platform = getPlatform();
    if (!platform || platform.injector.get(ALLOW_MULTIPLE_PLATFORMS, false)) {
      if (parentPlatformFactory) {
        parentPlatformFactory(
            providers.concat(extraProviders).concat({provide: marker, useValue: true}));
      } else {
        const injectedProviders: StaticProvider[] =
            providers.concat(extraProviders).concat({provide: marker, useValue: true}, {
              provide: INJECTOR_SCOPE,
              useValue: 'platform'
            });
        createPlatform(Injector.create({providers: injectedProviders, name: desc}));
      }
    }
    return assertPlatform(marker);
  };
}

先运行的2.1.1
const platformCore = createPlatformFactory(null, 'core', _CORE_PLATFORM_PROVIDERS);
生成 desc = `Platform:core` 和 包含 desc 的marker【InjectionToken实例】 
然后返回函数【platformCore】供上层2.1调用

再运行2.1
const platformCoreDynamic = createPlatformFactory(platformCore, 'coreDynamic', [
    { provide: COMPILER_OPTIONS, useValue: ɵ0, multi: true },
    { provide: CompilerFactory, useClass: JitCompilerFactory, deps: [COMPILER_OPTIONS] },
]);
同样生成 desc[`Platform:coreDynamic`] 和包含 desc 的marker,
返回函数【platformCoreDynamic】供上层2调用

再运行2
const platformBrowserDynamic = createPlatformFactory(
    platformCoreDynamic, 
    'browserDynamic', 
    INTERNAL_BROWSER_DYNAMIC_PLATFORM_PROVIDERS
);
也是生成 desc[`Platform:browserDynamic`] 和包含 desc 的marker， 
然后返回platformBrowserDynamic，也就是我们main.ts中的 platformBrowserDynamic函数。


`运行platformBrowserDynamic()`


如果还没有创建平台实例【_platform】或者允许多平台，就逐级运行2.1,2.1.1;将provider进行合并。
const injectedProviders =
[
`---------------------platformCore 的 provide------------------`
    { provide: PLATFORM_ID, useValue: 'unknown' },
    { provide: PlatformRef, deps: [Injector] },
    { provide: TestabilityRegistry, deps: [] },
    { provide: Console, deps: [] },
        
    
`--------------------platformCoreDynamic 的 provide--------------------`
    {provide: COMPILER_OPTIONS, useValue: {}, multi: true},
    {provide: CompilerFactory, useClass: JitCompilerFactory, deps: [COMPILER_OPTIONS]},
        
`----------------platformBrowserDynamic 的 provide---------------------`
    [
        { provide: PLATFORM_ID, useValue: 'browser'},
        { provide: PLATFORM_INITIALIZER, useValue: initDomAdapter, multi: true},
        { provide: DOCUMENT, useFactory: _document, deps: []},
]
        
    { provide: COMPILER_OPTIONS,
      useValue: {providers: [{provide: ResourceLoader, 
                            useClass: ResourceLoaderImpl,
                            deps: []}
                          ]},
                 multi: true
    },
    {provide: PLATFORM_ID, useValue: 'browser'},
`-------------------------平台标志【每次合并provider时添加】-------------------------`    
    { provide: InjectionToken<'Platform: browserDynamic'>,useValue: true}
	{ provide: InjectionToken<'Platform: coreDynamic'>,useValue:true}
	{ provide: InjectionToken<'Platform: core'>,useValue:true}

`---------------------合并完成providers后 添加的`
    { provide: INJECTOR_SCOPE,useValue: 'platform'}

]

`INJECTOR_SCOPE` ： InjectionToken<'root'|'platform'|null>


createPlatform(Injector.create(
    { providers: injectedProviders, name: 'Platform: core' }
	)
 );

`**注`
下一步Injector.create【参数是对象，走else逻辑】
```

##### 2.2-Injector

```typescript
//是抽象构造函数
abstract class Injector {
    static THROW_IF_NOT_FOUND = THROW_IF_NOT_FOUND = {};
    static NULL: Injector = new NullInjector();
	static __NG_ELEMENT_ID__ = -1;

    static create(options, parent) {
        if (Array.isArray(options)) {
            return new StaticInjector(options, parent, '');
        }
        else {
            return new StaticInjector(options.providers, options.parent, options.name || null);
        }
    }
}

export class NullInjector implements Injector {
  get(token: any, notFoundValue: any = THROW_IF_NOT_FOUND): any {
    if (notFoundValue === THROW_IF_NOT_FOUND) {
      const error = new Error(`NullInjectorError: No provider for ${stringify(token)}!`);
      error.name = 'NullInjectorError';
      throw error;
    }
    return notFoundValue;
  }
}


**else逻辑  StaticInjector(providers, "", 'Platform: core')
--附录分析【StaticInjector】
```

###### 2.2.1-new NullInjector()

```typescript
export class NullInjector implements Injector {
  get(token: any, notFoundValue: any = THROW_IF_NOT_FOUND): any {
    if (notFoundValue === THROW_IF_NOT_FOUND) {
      const error = new Error(`NullInjectorError: No provider for ${stringify(token)}!`);
      error.name = 'NullInjectorError';
      throw error;
    }
    return notFoundValue;
  }
}
```



##### 2.3-*createPlatform(终)

```javascript
`这一步是初始化的重点：生成平台实例，然后进行平台初始化，最终返回平台实例进行下一步：_platform.bootstrapModule(AppModule)`

function createPlatform(injector) { //injector是StaticInjector实例，见附录，【StaticInjector是Injector的实现】
    if (_platform && !_platform.destroyed &&
        !_platform.injector.get(ALLOW_MULTIPLE_PLATFORMS, false)) {
        throw new Error('There can be only one platform. Destroy the previous one to create a new one.');
    }
    publishDefaultGlobalUtils();
    _platform = injector.get(PlatformRef); //在生成的records中查询 PlatformRef，new PlatformRef(...deps)
    const inits = injector.get(PLATFORM_INITIALIZER, null);
    if (inits)
        inits.forEach((init) => init());
    return _platform;
}

**注
1-获取平台实例injector.get(PlatformRef)【获取的是附录中 recursivelyProcessProviders解析providers后records中的数据】
2-获取平台初始化，然后运行。
`最终返回 PlatformRef(平台实例)`

1-recursivelyProcessProviders解析{ provide: PlatformRef, deps: [Injector] }
	resords<Map> = {
        PlatformRef：{dep:{ token: Injector, options: 6 },
                      fn: value=>value, useNew: [], value: false}
    }
2-{ provide: PLATFORM_INITIALIZER, useValue: initDomAdapter, multi: true},    resords<Map> = {
        PLATFORM_INITIALIZER：{dep:[],
                      fn: value=>value, useNew: [], value: initDomAdapter}
    }
```

##### 2.4-PlatformRef

```javascript
class PlatformRef{
    private _modules: NgModuleRef<any>[] = [];
  	private _destroyListeners: Function[] = [];
  	private _destroyed: boolean = false;

  	/** @internal */
  	constructor(private _injector: Injector) {}

    bootstrapModuleFactory(){}
    bootstrapModule(){}   //引导挨app.module
    _moduleDoBootstrap(){}
    onDestroy(){}
    get injector(){}
    destroy(){}
    get destroyed(){}
}
`nwe 生成 PlatformRef实例 _platform;`
`_injector 是我们实例化后的 StaticInjector`:[附录 StaticInjector 的结果]

```

##### 2.5-assertPlatform

```typescript
export function assertPlatform(requiredToken: any): PlatformRef {
  const platform = getPlatform();

  if (!platform) {
    throw new Error('No platform exists!');
  }

  if (!platform.injector.get(requiredToken, null)) {
    throw new Error(
        'A platform with a different configuration has been created. Please destroy it first.');
  }

  return platform;
}

**注
获取平台实例
```

##### 2.6-getPlatform

```typescript
export function getPlatform(): PlatformRef|null {
  return _platform && !_platform.destroyed ? _platform : null;
}
```

#### 3-总结

```
将平台依赖和核心依赖汇总【2】，通过创建injector.get创建 StaticInjecto r实例，并将依赖记录到 _record 中。
createPlatform(StaticInjector实例)获取 PlatformRef 依赖生成平台实例 _platform，
_platform 实例中 记录着 StaticInjector 实例，
最后返回 _platform 去执行 原型上的 bootstrapModule【1-bootstrapModule文档】
```

#### 附录

```
分析 providers
```

###### platformBrowserDynamic 的 provide

```javascript
【内部浏览器提供者】
	{ provide: PLATFORM_ID, useValue: 'browser'},
    { provide: PLATFORM_INITIALIZER, useValue: initDomAdapter, multi: true},
    { provide: DOCUMENT, useFactory: _document, deps: []},
        
    { provide: COMPILER_OPTIONS,
      useValue: {providers: [{provide: ResourceLoader, 
                            useClass: ResourceLoaderImpl,
                            deps: []}
                          ]},
                 multi: true
    },
    {provide: PLATFORM_ID, useValue: 'browser'}
    
1- PLATFORM_ID
   const PLATFORM_ID = new InjectionToken<Object>('Platform ID');
2- PLATFORM_INITIALIZER
   const PLATFORM_INITIALIZER = new InjectionToken<Array<() => void>>(
       'PlatformInitializer');
3- DOCUMENT
	const DOCUMENT = new InjectionToken<Document>('DocumentToken');
4- COMPILER_OPTIONS
    const COMPILER_OPTIONS = new InjectionToken<CompilerOptions[]>('compilerOptions');
```

###### platformCoreDynamic 的 provide

```javascript
【平台核心提供者】
	{provide: COMPILER_OPTIONS, useValue: {}, multi: true},
    {provide: CompilerFactory, useClass: JitCompilerFactory, deps: [COMPILER_OPTIONS]},
    { provide: 【InjectionToken 实例】,useValue:true}

1- COMPILER_OPTIONS
	const COMPILER_OPTIONS = new InjectionToken<CompilerOptions[]>('compilerOptions');
2- CompilerFactory
	抽象类， 可创建 Compiler
3- InjectionToken 实例
    new InjectionToken('Platform: coreDynamic')
```

###### platformCore 的 provide

```javascript
【平台核心】
	{ provide: PLATFORM_ID, useValue: 'unknown' },
    { provide: PlatformRef, deps: [Injector] },
    { provide: TestabilityRegistry, deps: [] },
    { provide: Console, deps: [] },
1- PLATFORM_ID  
	const PLATFORM_ID = new InjectionToken<Object>('Platform ID');
2- PlatformRef
	平台类 
3- TestabilityRegistry
	测试
4-  Console
    console类 只实现了log,warn.
```

###### InjectionToken

```javascript
export class InjectionToken<T> {
  /** @internal */
  readonly ngMetadataName = 'InjectionToken';

  readonly ɵprov: never|undefined;

  constructor(protected _desc: string, options?: {
    providedIn?: Type<any>|'root'|'platform'|'any'|null, factory: () => T
  }) {
    this.ɵprov = undefined;
    if (typeof options == 'number') {
      (typeof ngDevMode === 'undefined' || ngDevMode) &&
          assertLessThan(options, 0, 'Only negative numbers are supported here');
      // This is a special hack to assign __NG_ELEMENT_ID__ to this instance.
      // See `InjectorMarkers`
      (this as any).__NG_ELEMENT_ID__ = options;
    } else if (options !== undefined) {
      this.ɵprov = ɵɵdefineInjectable({
        token: this,
        providedIn: options.providedIn || 'root',
        factory: options.factory,
      });
    }
  }

  toString(): string {
    return `InjectionToken ${this._desc}`;
  }
}

**注
生成对应 maker和 providers 中的 provider
{
   ngMetadataName：‘InjectionToken’, 
   ɵprov:undefined,
   toString(): string {
    	return `InjectionToken ${this._desc}`;
  }
}
```

###### StaticInjector

```javascript
`2.2-Injector 调用 StaticInjector(汇总后的providers, "", 'Platform: core')`
export class StaticInjector implements Injector {
  readonly parent: Injector;
  readonly source: string|null;
  readonly scope: string|null;

  private _records: Map<any, Record|null>;

  constructor(
      providers: StaticProvider[], parent: Injector = Injector.NULL, source: string|null = null) {
    this.parent = parent;
    this.source = source;
    const records = this._records = new Map<any, Record>();
    records.set(
        Injector, <Record>{token: Injector, fn: IDENT, deps: EMPTY, value: this, useNew: false});
    records.set(
        INJECTOR, <Record>{token: INJECTOR, fn: IDENT, deps: EMPTY, value: this, useNew: false});
    this.scope = recursivelyProcessProviders(records, providers);
  }

  get<T>(token: Type<T>|AbstractType<T>|InjectionToken<T>, notFoundValue?: T, flags?: InjectFlags):
      T;
  get(token: any, notFoundValue?: any): any;
  get(token: any, notFoundValue?: any, flags: InjectFlags = InjectFlags.Default): any {
    const records = this._records;
    let record = records.get(token);
    if (record === undefined) {
      // This means we have never seen this record, see if it is tree shakable provider.
      const injectableDef = getInjectableDef(token);
      if (injectableDef) {
        const providedIn = injectableDef && injectableDef.providedIn;
        if (providedIn === 'any' || providedIn != null && providedIn === this.scope) {
          records.set(
              token,
              record = resolveProvider(
                  {provide: token, useFactory: injectableDef.factory, deps: EMPTY}));
        }
      }
      if (record === undefined) {
        // Set record to null to make sure that we don't go through expensive lookup above again.
        records.set(token, null);
      }
    }
    let lastInjector = setCurrentInjector(this);
    try {
      return tryResolveToken(token, record, records, this.parent, notFoundValue, flags);
    } catch (e) {
      return catchInjectorError(e, token, 'StaticInjectorError', this.source);
    } finally {
      setCurrentInjector(lastInjector);
    }
  }

  toString() {
    const tokens = <string[]>[], records = this._records;
    records.forEach((v, token) => tokens.push(stringify(token)));
    return `StaticInjector[${tokens.join(', ')}]`;
  }
}

INJECTOR = new InjectionToken<Injector>(
    'INJECTOR',
    -1, 
)

*********注---------
Injector.get:获取对应依赖时，传入flag标记，与 InjectFlags 中的标记做`与`操作，   
    
生成 StaticInjector 实例 = {
    parent:Injector.NULL = new NullInjector()【2.2.1】，
    source:'Platform: core'，
    _records<map对象>{
    		Injector:{token: Injector, fn: IDENT, deps: EMPTY, value: this, useNew: false},
    		INJECTOR:{token: INJECTOR, fn: IDENT, deps: EMPTY, value: this, useNew: false},
        	...还有各级平台的依赖。
    },
    scope:'platform'
}

Injector:抽象类
INJECTOR:InjectionToken<'INJECTOR'> =  {
    ngMetadataName : 'InjectionToken',
    _desc:'INJECTOR',
    ɵprov:undefined,
    __NG_ELEMENT_ID__:-1
    
}

****注
在creaPlatform函数中 injector.get(token),解析token【tryResolveToken，最终调用resolveToken】

`scope属性是 'platform'`
```

###### resolveToken

```typescript
function resolveToken(
    token: any, record: Record|undefined|null, records: Map<any, Record|null>, parent: Injector,
    notFoundValue: any, flags: InjectFlags): any {
  let value;
  if (record && !(flags & InjectFlags.SkipSelf)) {
    // If we don't have a record, this implies that we don't own the provider hence don't know how
    // to resolve it.
    value = record.value;
    if (value == CIRCULAR) {
      throw Error(NO_NEW_LINE + 'Circular dependency');
    } else if (value === EMPTY) {
      record.value = CIRCULAR;
      let obj = undefined;
      let useNew = record.useNew;
      let fn = record.fn;
      let depRecords = record.deps;
      let deps = EMPTY;
      if (depRecords.length) {
        deps = [];
        for (let i = 0; i < depRecords.length; i++) {
          const depRecord: DependencyRecord = depRecords[i];
          const options = depRecord.options;
          const childRecord =
              options & OptionFlags.CheckSelf ? records.get(depRecord.token) : undefined;
          deps.push(tryResolveToken(
              // Current Token to resolve
              depRecord.token,
              // A record which describes how to resolve the token.
              // If undefined, this means we don't have such a record
              childRecord,
              // Other records we know about.
              records,
              // If we don't know how to resolve dependency and we should not check parent for it,
              // than pass in Null injector.
              !childRecord && !(options & OptionFlags.CheckParent) ? Injector.NULL : parent,
              options & OptionFlags.Optional ? null : Injector.THROW_IF_NOT_FOUND,
              InjectFlags.Default));
        }
      }
      record.value = value = useNew ? new (fn as any)(...deps) : fn.apply(obj, deps);
    }
  } else if (!(flags & InjectFlags.Self)) {
    value = parent.get(token, notFoundValue, InjectFlags.Default);
  } else if (!(flags & InjectFlags.Optional)) {
    value = Injector.NULL.get(token, notFoundValue);
  } else {
    value = Injector.NULL.get(token, typeof notFoundValue !== 'undefined' ? notFoundValue : null);
  }
  return value;
}

***注
在createPlatform阶段，调用 PlatformRef 构造函数，生成平台实例 _platform
```



###### recursivelyProcessProviders

```javascript
`递归处理依赖`
function recursivelyProcessProviders(records, provider) {
    if (provider) {
        provider = resolveForwardRef(provider); //provider是数组返回provider
        if (provider instanceof Array) {
            // if we have an array recurse into the array
            for (var i = 0; i < provider.length; i++) {
                recursivelyProcessProviders(records, provider[i]);
            }
        }
        else if (typeof provider === 'function') {
            // Functions were supported in ReflectiveInjector, but are not here. For safety give useful
            // error messages
            throw staticError('Function/Class not supported', provider);
        }
        else if (provider && typeof provider === 'object' && provider.provide) {
            // At this point we have what looks like a provider: {provide: ?, ....}
            var token = resolveForwardRef(provider.provide);  //返回provider 
            var resolvedProvider = resolveProvider(provider);
            if (provider.multi === true) {
                // This is a multi provider.
                var multiProvider = records.get(token);
                if (multiProvider) {
                    if (multiProvider.fn !== MULTI_PROVIDER_FN) {
                        throw multiProviderMixError(token);
                    }
                }
                else {
                    // Create a placeholder factory which will look up the constituents of the multi provider.
                    records.set(token, multiProvider = {
                        token: provider.provide,
                        deps: [],
                        useNew: false,
                        fn: MULTI_PROVIDER_FN,
                        value: EMPTY
                    });
                }
                // Treat the provider as the token.
                token = provider;
                multiProvider.deps.push({ token: token, options: 6 /* Default */ });
            }
            var record = records.get(token);
            if (record && record.fn == MULTI_PROVIDER_FN) {
                throw multiProviderMixError(token);
            }
            records.set(token, resolvedProvider);
        }
        else {
            throw staticError('Unexpected provider', provider);
        }
    }
}

**注
`调用 resolveProvider 函数，解析依赖`
解析 providers【2.*中的平台依赖】，存放到records<provide,{}>中，
records<Map> = {
    key(provide):value(
    	{ deps: [默认为空], fn: value=>value, useNew: [], value: false }
    )
}
关于providers中的参数:{
    provide:作为 _records 中的key,如果是函数，将其设为fn,useNew为true;
    deps:将deps中的依赖进行计算后放入新的deps中返回[{token:dep依赖，options:标记}]
    
    useValue: 如果有值，将返回的value设为此值
    useFactory: 如果有值，将其设为fn
    useExisting: 如果有值，fn设为(value)=>value
    useClass: 如果有值，将其设为fn
    
    multi:将后续的依赖放到相同的第一个依赖的 deps 中
}


生成Map中的value：{
    deps: [默认为空],
    fn:   默认(value)=>value, 
    useNew: 默认false, 
    value: 默认[]
}
```

###### _records

```typescript
`经过 recursivelyProcessProviders -> resolveProvider 生成 _records`
`_record = <Map>{
    key:value
}`
`---------------------platformCore 的 provide 生成的record<Map>------------------`
injectionToken('Platform ID') -->  {deps:[],value:'unknow',fn:IDENT, useNew:false}
PlatformRef  -->  {deps:[{token:Injector,options:OptionFlags.Default}],value:EMPTY,fn:PlatformRef, useNew:true}
TestabilityRegistry -->, {deps: [],fn:IDENT, useNew:false,value:[] }
console -->, {deps: [],fn:IDENT, useNew:false,value:[] }

`--------------------platformCoreDynamic 的 provide--------------------`
CompilerFactory --> {deps:[{token:COMPILER_OPTIONS,options:OptionFlags.Default}] ,value:EMPY, fn:JitCompilerFactory ,useNew:true} 
COMPILER_OPTIONS  -->  {deps: [],token：COMPILER_OPTIONS,fn:MULTI_PROVIDER_FN, useNew:false,value:[] }

    
`----------------platformBrowserDynamic 的 provide---------------------`
injectionToken('Platform ID') --->  {deps:[],value:'browser',fn:IDENT, useNew:false} 
`--------vvvvvvvvvvvv------multi:true 的 PLATFORM_INITIALIZER----vvvvvvv--------`
PLATFORM_INITIALIZER    --> {deps:[],value:[],token:PLATFORM_INITIALIZER,fn:MULTI_PROVIDER_FN, useNew:false}
{ provide: PLATFORM_INITIALIZER, useValue: initDomAdapter, multi: true} -->{deps:[],value:initDomAdapter,fn:IDENT, useNew:false}
`--------^^^^^^^^^^^^--------multi:true 的 PLATFORM_INITIALIZER--^^^^^^^^^^^^-------------`     
DOCUMENT   --> {deps:[],value:[],fn:_document, useNew:false}

COMPILER_OPTIONS provider 放到前一个COMPILER_OPTIONS的deps中
{ provide: COMPILER_OPTIONS,
      useValue: {providers: [{provide: ResourceLoader, 
                            useClass: ResourceLoaderImpl,
                            deps: []}
                          ]},
                 multi: true
    },
`---------------------multi:true的处理方法----------------------`    
`multi:true的provider`表示为多相同依赖，第一个multi的处理如下
value中会有token属性【和key相同】，fn属性【MULTI_PROVIDER_FN】
最终生成 两个record<Map>= {provider-> resolvedProvider,provide:muti分支解析后的provider}

第二次遇到相同key的依赖
直接将第二个依赖整个作为token，options为OptionFlags.Default，放到第一个依赖deps里面
{token:provider,options: OptionFlags.Default}
再次生成record<Map>= {provider-> resolvedProvider}
```

###### 注入标记InjectFlags

```typescript
依赖注入的标记
InjectFlags = {
	0:Default     检查自身，检查父             0b0000
    1:Host                                  0b0001
    2:Self        只在当前查找                0b0010
    4:SkipSelf    跳过当前                   0b0100
    8:Optional    找不到就插入`defaultValue`  0b1000
}
```

###### options标记OptionsFlags

```typescript
const enum OptionFlags {
  Optional = 1 << 0,                    1
  CheckSelf = 1 << 1,                   2
  CheckParent = 1 << 2,                 4
  Default = CheckSelf | CheckParent     6
}
```

###### INJECTOR_IMPL

```typescript
INJECTOR_IMPL内部调用 new StaticInjector()

export class StaticInjector {
    constructor(providers, parent = Injector.NULL, source = null) {
        this.parent = parent;
        this.source = source;
        const records = this._records = new Map();
        records.set(Injector, { token: Injector, fn: IDENT, deps: EMPTY, value: this, useNew: false });
        records.set(INJECTOR, { token: INJECTOR, fn: IDENT, deps: EMPTY, value: this, useNew: false });
        this.scope = recursivelyProcessProviders(records, providers);
    }
    get(token, notFoundValue, flags = InjectFlags.Default) {
        const records = this._records;
        let record = records.get(token);
        if (record === undefined) {
            // This means we have never seen this record, see if it is tree shakable provider.
            const injectableDef = getInjectableDef(token);
            if (injectableDef) {
                const providedIn = injectableDef && injectableDef.providedIn;
                if (providedIn === 'any' || providedIn != null && providedIn === this.scope) {
                    records.set(token, record = resolveProvider({ provide: token, useFactory: injectableDef.factory, deps: EMPTY }));
                }
            }
            if (record === undefined) {
                // Set record to null to make sure that we don't go through expensive lookup above again.
                records.set(token, null);
            }
        }
        let lastInjector = setCurrentInjector(this);
        try {
            return tryResolveToken(token, record, records, this.parent, notFoundValue, flags);
        }
        catch (e) {
            return catchInjectorError(e, token, 'StaticInjectorError', this.source);
        }
        finally {
            setCurrentInjector(lastInjector);
        }
    }
    toString() {
        const tokens = [], records = this._records;
        records.forEach((v, token) => tokens.push(stringify(token)));
        return `StaticInjector[${tokens.join(', ')}]`;
    }
}
```

###### provide注解

```typescript
------------------------------platformCore的provider-------------
PLATFORM_ID = new InjectionToken<Object>('Platform ID');
PlatformRef:class PlatformRef
TestabilityRegistry:class TestabilityRegistry
Console: class Console
    
 ------------------------------platformCoreDynamic 的 provide-----------
COMPILER_OPTIONS = new InjectionToken<CompilerOptions[]>('compilerOptions');
CompilerFactory：class CompilerFactory

----------------platformBrowserDynamic 的 provide---------------------
PLATFORM_ID
PLATFORM_INITIALIZER = new InjectionToken<Array<() => void>>('Platform Initializer');
DOCUMENT = new InjectionToken<Document>('DocumentToken');
COMPILER_OPTIONS
PLATFORM_ID
```

###### resolveForwardRef

```typescript
export function resolveForwardRef<T>(type: T): T {
  return isForwardRef(type) ? type() : type;
}

/** Checks whether a function is wrapped by a `forwardRef`. */
export function isForwardRef(fn: any): fn is() => any {
  return typeof fn === 'function' && fn.hasOwnProperty(__forward_ref__) &&
      fn.__forward_ref__ === forwardRef;
}
```

###### resolveProvider

```typescript
function resolveProvider(provider: SupportedProvider): Record {
  const deps = computeDeps(provider);
  let fn: Function = IDENT;
  let value: any = EMPTY;
  let useNew: boolean = false;
  let provide = resolveForwardRef(provider.provide);
  if (USE_VALUE in provider) {
    // We need to use USE_VALUE in provider since provider.useValue could be defined as undefined.
    value = (provider as ValueProvider).useValue;
  } else if ((provider as FactoryProvider).useFactory) {
    fn = (provider as FactoryProvider).useFactory;
  } else if ((provider as ExistingProvider).useExisting) {
    // Just use IDENT
  } else if ((provider as StaticClassProvider).useClass) {
    useNew = true;
    fn = resolveForwardRef((provider as StaticClassProvider).useClass);
  } else if (typeof provide == 'function') {
    useNew = true;
    fn = provide;
  } else {
    throw staticError(
        'StaticProvider does not have [useValue|useFactory|useExisting|useClass] or [provide] is not newable',
        provider);
  }
  return {deps, fn, useNew, value};
}

****注
返回数据的用处
deps是本层【provider】所依赖的数据，
fn,是运行时需要的函数 useFactory 、useClass、或者provide自身【根据传入数据决定】
useNew为true，则fn为函数时，使用new fn(...deps)获取值,否则fn.apply(undefined,deps)
value:与 useValue 属性有关，当有useValue属性时，在resolveToken时直接使用。没有useValue的话，默认为EMPTY，在解析时[resolveToken]，设置为CIRCULAR【作为标记，防止循环依赖】
```

###### computeDeps

```typescript
function computeDeps(provider: StaticProvider): DependencyRecord[] {
  let deps: DependencyRecord[] = EMPTY;
  const providerDeps: any[] =
      (provider as ExistingProvider & StaticClassProvider & ConstructorProvider).deps;
  if (providerDeps && providerDeps.length) {
    deps = [];
    for (let i = 0; i < providerDeps.length; i++) {
      let options = OptionFlags.Default;
      let token = resolveForwardRef(providerDeps[i]);
      if (Array.isArray(token)) {
        for (let j = 0, annotations = token; j < annotations.length; j++) {
          const annotation = annotations[j];
          if (annotation instanceof Optional || annotation == Optional) {
            options = options | OptionFlags.Optional;
          } else if (annotation instanceof SkipSelf || annotation == SkipSelf) {
            options = options & ~OptionFlags.CheckSelf;
          } else if (annotation instanceof Self || annotation == Self) {
            options = options & ~OptionFlags.CheckParent;
          } else if (annotation instanceof Inject) {
            token = (annotation as Inject).token;
          } else {
            token = resolveForwardRef(annotation);
          }
        }
      }
      deps.push({token, options});
    }
  } else if ((provider as ExistingProvider).useExisting) {
    const token = resolveForwardRef((provider as ExistingProvider).useExisting);
    deps = [{token, options: OptionFlags.Default}];
  } else if (!providerDeps && !(USE_VALUE in provider)) {
    // useValue & useExisting are the only ones which are exempt from deps all others need it.
    throw staticError('\'deps\' required', provider);
  }
  return deps;
}

***注
根据deps中的数据，对依赖进行解析，如果是单个依赖，将{token，OptionFlags.Default}存入deps，在调用父级时，调用。
当依赖是数组，【有点复杂。。。】

当没有下级依赖时，根据传入的 useExisting，决定deps中的token：[{token:useExisting, options: OptionFlags.Default}]

options属性是为了标记在引用当前deps时，如何解析依赖，在 injector.get 函数中调用。
```

#### 输出 injector.get（token）

其他模块用到依赖时，通过【injector.get(token)】获取【_recods】中存储的依赖,然后进行【resolveToken操作】根据各种标志位，对依赖进行运行，将返回值作为参数传递给上级依赖，递归的运行依赖。

##### 输出injector.get(PlatformRef)

```typescript
`这个injector是 StaticInjector 的实例`
injector.get(PlatformRef),走 StaticInjector的get函数【函数重载的get(PlatformRef),flag为 undefined】

`_record 中 对应的 PlatformRef 记录`：
PlatformRef  -->  {deps:[{token:Injector,options:OptionFlags.Default}],value:EMPTY,fn:PlatformRef,

`经过 resolveToken 解析`:
 PlatformRef 的依赖是 Injector，deps走 resolveToken 逻辑后返回的是 【StaticInjector实例】              
deps = [<StaticInjector实例>]
                   
最终：return new PlatformRef(...dep)【走2.4】
```

##### 输出injector.get(CompilerFactory)

```typescript
主要运行：resolveToken(CompilerFactory, record, _record, Injector.NULL, '', InjectFlags.Default)
deps:[{COMPILER_OPTIONS}]
最终 return new JitCompilerFactory(...deps)//参数是编译配置 _record 中的 COMPILER_OPTIONS
```

