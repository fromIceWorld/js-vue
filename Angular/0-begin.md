#### 1-main.ts

```javascript
platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
项目由 platformBrowserDynamic【平台浏览器动态？】 函数的返回值 bootstrapModule函数 加载核心app.module【业务入口】
```

#### 2-platformBrowserDynamic

```javascript
const platformBrowserDynamic = createPlatformFactory(
    platformCoreDynamic, 
    'browserDynamic', 
    INTERNAL_BROWSER_DYNAMIC_PLATFORM_PROVIDERS
);
又由 createPlatformFactory 【创建平台工厂？？】接收三个值构造
。platformCoreDynamic
。'browserDynamic' 【标识为浏览器平台】
。INTERNAL_BROWSER_DYNAMIC_PLATFORM_PROVIDERS

**
核心:createPlatformFactory函数
```

##### 2.1-platformCoreDynamic

```javascript
【平台核心动态？？？】
const platformCoreDynamic = createPlatformFactory(platformCore, 'coreDynamic', [
    { provide: COMPILER_OPTIONS, useValue: ɵ0, multi: true },
    { provide: CompilerFactory, useClass: JitCompilerFactory, deps: [COMPILER_OPTIONS] },
]);
。platformCore
。'coreDynamic'
。提供的一些配置？？？？


**注：
核心:createPlatformFactory函数
platformBrowserDynamic[2] 和 platformCoreDynamic[2.1] 都是由【createPlatformFactory构造】
```

###### 2.1.1-platformCore

```typescript
【平台核心】
const platformCore = createPlatformFactory(null, 'core', _CORE_PLATFORM_PROVIDERS);

**注
这个也是由 createPlatformFactory 构造【2，2.1，2.1.1都是由其构造】
```

#### 2.*-createPlatformFactory

```typescript
【创建平台的工厂函数】

	先创建【平台核心:platformCore,1级】，再创建【平台核心动态:platformCoreDynamic，2级】，再创建【平台浏览器动态:platformBrowserDynamic，3级】，最后生成
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
生成 desc[`Platform:core`] 和 marker 然后返回 函数【platformCore】供上层2.1调用

再运行2.1
const platformCoreDynamic = createPlatformFactory(platformCore, 'coreDynamic', [
    { provide: COMPILER_OPTIONS, useValue: ɵ0, multi: true },
    { provide: CompilerFactory, useClass: JitCompilerFactory, deps: [COMPILER_OPTIONS] },
]);
同样生成 desc[`Platform:coreDynamic`] 和 marker,返回函数【platformCoreDynamic】供上层供上层2调用

再运行2
const platformBrowserDynamic = createPlatformFactory(
    platformCoreDynamic, 
    'browserDynamic', 
    INTERNAL_BROWSER_DYNAMIC_PLATFORM_PROVIDERS
);
也是生成 desc[`Platform:browserDynamic`] 和 marker 然后返回platformBrowserDynamic，也就是我们main.ts中的 platformBrowserDynamic函数。

**终
platformBrowserDynamic()
如果还没有创建平台实例【_platform】，就将逐级获取2.1，2.1.1;将provider进行合并。
const injectedProviders =
[
---------------------platformCore 的 provide------------------
    { provide: PLATFORM_ID, useValue: 'unknown' },
    { provide: PlatformRef, deps: [Injector] },
    { provide: TestabilityRegistry, deps: [] },
    { provide: Console, deps: [] },
        
    { provide: {_desc:'Platform: core', ngMetadataName:'InjectionToken'},useValue:true}

    { provide: INJECTOR_SCOPE,useValue: 'platform'}

--------------------platformCoreDynamic 的 provide--------------------
    {provide: COMPILER_OPTIONS, useValue: {}, multi: true},
    {provide: CompilerFactory, useClass: JitCompilerFactory, deps: [COMPILER_OPTIONS]},
        
    { provide: {_desc:'Platform: browserDynamic', ngMetadataName:'InjectionToken'},useValue:true}

----------------platformBrowserDynamic 的 provide---------------------
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
    {provide: PLATFORM_ID, useValue: 'browser'},
    
    {provide: {_desc:'Platform: coreDynamic', ngMetadataName:'InjectionToken'}, 			 useValue: true}
]

createPlatform(Injector.create(
    { providers: injectedProviders, name: 'Platform: core' }
	)
 );

**注
下一步Injector.create
```

##### 2.2-Injector

```javascript
abstract class Injector {
    static THROW_IF_NOT_FOUND = {};
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

**if逻辑  StaticInjector(providers,"",'')
--附录分析【StaticInjector】
```

##### 2.3-createPlatform(finish)

```javascript
function createPlatform(injector) {
    if (_platform && !_platform.destroyed &&
        !_platform.injector.get(ALLOW_MULTIPLE_PLATFORMS, false)) {
        throw new Error('There can be only one platform. Destroy the previous one to create a new one.');
    }
    publishDefaultGlobalUtils();
    _platform = injector.get(PlatformRef);
    const inits = injector.get(PLATFORM_INITIALIZER, null);
    if (inits)
        inits.forEach((init) => init());
    return _platform;
}

**注
1-获取平台实例injector.get(PlatformRef)【获取的是附录中    recursivelyProcessProviders解析providers后records中的数据】
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
    constructor(_injector) {
        this._injector = _injector;
        this._modules = [];
        this._destroyListeners = [];
        this._destroyed = false;
    }
    bootstrapModuleFactory(){}
    bootstrapModule(){}   //引导挨app.module
    _moduleDoBootstrap(){}
    onDestroy(){}
    get injector(){}
    destroy(){}
    get destroyed(){}
}
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

生成 StaticInjector 实例 = {
    parent:Injector.NULL，
    source:null，
    _records<map对象>{
    		Injector：{token: Injector, fn: IDENT, deps: EMPTY, value: this, useNew: false},
    		INJECTOR:{token: INJECTOR, fn: IDENT, deps: EMPTY, value: this, useNew: false}},
    scope
}

Injector:抽象类
INJECTOR:InjectionToken实例 =  {
    ngMetadataName : 'InjectionToken',
    _desc:'INJECTOR',
    ɵprov:undefined,
    __NG_ELEMENT_ID__:-1
    
}


scope属性是调用 recursivelyProcessProviders(records, providers)生成的;
```

###### recursivelyProcessProviders

```javascript
function recursivelyProcessProviders(records, provider) {
    if (provider) {
        provider = resolveForwardRef(provider);
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
            var token = resolveForwardRef(provider.provide);
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
解析 providers【2.*中的平台注入】，存放到records<provide,{}>中，
records = {
    key(provide):value(
    	{ deps: [默认为空], fn: value=>value, useNew: [], value: false }
    )
}
```

###### _records

```

```

###### InjectFlags

```javascript
注入标记
InjectFlags = {
	0:Default
    1:Host
    2:Self
    4:SkipSelf
    8:Optional
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

