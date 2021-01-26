### bootstrapModule

bootstrapModule是引导模块，由第一步中返回的平台实例执行，传入的第一个参数是**AppModule**，是根模块。第二个参数初始化时未传入。

```typescript
bootstrapModule<M>(
      moduleType: Type<M>,
      compilerOptions: (CompilerOptions&BootstrapOptions)|
      Array<CompilerOptions&BootstrapOptions> = []): Promise<NgModuleRef<M>> {
    const options = optionsReducer({}, compilerOptions);
    return compileNgModuleFactory(this.injector, options, moduleType)
        .then(moduleFactory => this.bootstrapModuleFactory(moduleFactory, options));
  }
`注----------`
主要是合并编译配置【初始阶段未传入编译配置】，运行compileNgModuleFactory
compileNgModuleFactory(this.injector, {}, moduleType) //this.injector就是第一步中的StaticInjector实例
```

#### 1-compileNgModuleFactory

```typescript
function compileNgModuleFactory<M>(
    injector: Injector, options: CompilerOptions,
    moduleType: Type<M>): Promise<NgModuleFactory<M>> {
  const compilerFactory: CompilerFactory = injector.get(CompilerFactory);
  const compiler = compilerFactory.createCompiler([options]);  //返回的是[CompilerImpl实例]
  return compiler.compileModuleAsync(moduleType);
}

`调用injector.get(CompilerFactory);在【0-begin】中有返回值 JitCompilerFactory实例`
然后运行实例原型方法JitCompilerFactory的createCompiler,提供JIT编译需要的依赖。
在createCompiler最后调用 injector.get(Compiler)
最终compiler.compileModuleAsync(moduleType)【运行 CompilerImpl 的 compileModuleAsync】
也就是进行 【异步的编译模块】，参数是`AppModule`
```

#### 2-compileModuleAsync

运行 CompilerImpl 的 compileModuleAsync 也就是间接调用  JitCompiler 的 compileModuleAsync

下面就分析 JitCompiler 的 compileModuleAsync

```typescript
` JitCompiler代码太多了300行😫，只放相关函数`
compileModuleAsync(moduleType: Type): Promise<object> {
    return Promise.resolve(this._compileModuleAndComponents(moduleType, false));
  }
--------------------------编译模块和组件-------------
private _compileModuleAndComponents(moduleType: Type, isSync: boolean): SyncAsync<object> {
    return SyncAsync.then(this._loadModules(moduleType, isSync), () => {
      this._compileComponents(moduleType, null);
      return this._compileModule(moduleType);
    });
  }    
`分为三步：SyncAsync.then，
		this._loadModules(moduleType, isSync)，
        () => {
          this._compileComponents(moduleType, null);
          return this._compileModule(moduleType);
        }`  
```

#### 2.1-_loadModules(第一步)

```typescript
`函数属于JitCompiler类 `
private _loadModules(mainModule: any, isSync: boolean): SyncAsync<any> {
    const loading: Promise<any>[] = [];
    const mainNgModule = this._metadataResolver.getNgModuleMetadata(mainModule)!;
    // Note: for runtime compilation, we want to transitively compile all modules,
    // so we also need to load the declared directives / pipes for all nested modules.
    this._filterJitIdentifiers(mainNgModule.transitiveModule.modules).forEach((nestedNgModule) => {
      // getNgModuleMetadata only returns null if the value passed in is not an NgModule
      const moduleMeta = this._metadataResolver.getNgModuleMetadata(nestedNgModule)!;
      this._filterJitIdentifiers(moduleMeta.declaredDirectives).forEach((ref) => {
        const promise =
            this._metadataResolver.loadDirectiveMetadata(moduleMeta.type.reference, ref, isSync);
        if (promise) {
          loading.push(promise);
        }
      });
      this._filterJitIdentifiers(moduleMeta.declaredPipes)
          .forEach((ref) => this._metadataResolver.getOrLoadPipeMetadata(ref));
    });
    return SyncAsync.all(loading);
  }
  
`_metadataResolver属于依赖 CompileMetadataResolver`  
`mainNgModule 是2.1.1返回的数据`
终：loading是解析所有组件后生成的相关数据的集合。
```

##### 2.1.1-getNgModuleMetadata

```typescript
`CompileMetadataResolver 依赖的 getNgModuleMetadata 函数 200行😫，只放伪代码`
const meta = this._ngModuleResolver.resolve(moduleType, throwIfNotFound = true);【下2.1.2】
if(meta.imports){...}
if(meta.exports){...}
const transitiveModule = this._getTransitiveNgModuleMetadata(importedModules, exportedModules);
if(meta.declarations){...}
if(meta.providers){...}
if(meta.entryComponents){...}
if(meta.bootstrap){...}
if(meta.schemas){...}
compileMeta = new cpl.CompileNgModuleMetadata(...)
return compileMeta; 

`_ngModuleResolver用到了NgModuleResolver依赖😐` 
                                              
终：`解析出@NgModule装饰器的参数，生成 CompileNgModuleMetadata 实例并返回`                                         注：`CompileNgModuleMetadata`  是收集所有参数信息的集合。   
```

###### 2.1.1.1-_getTransitiveNgModuleMetadata

```typescript
  private _getTransitiveNgModuleMetadata(
      importedModules: cpl.CompileNgModuleSummary[],
      exportedModules: cpl.CompileNgModuleSummary[]): cpl.TransitiveCompileNgModuleMetadata {
    // collect `providers` / `entryComponents` from all imported and all exported modules
    const result = new cpl.TransitiveCompileNgModuleMetadata();
    const modulesByToken = new Map<any, Set<any>>();
    importedModules.concat(exportedModules).forEach((modSummary) => {
      modSummary.modules.forEach((mod) => result.addModule(mod));
      modSummary.entryComponents.forEach((comp) => result.addEntryComponent(comp));
      const addedTokens = new Set<any>();
      modSummary.providers.forEach((entry) => {
        const tokenRef = cpl.tokenReference(entry.provider.token);
        let prevModules = modulesByToken.get(tokenRef);
        if (!prevModules) {
          prevModules = new Set<any>();
          modulesByToken.set(tokenRef, prevModules);
        }
        const moduleRef = entry.module.reference;
        // Note: the providers of one module may still contain multiple providers
        // per token (e.g. for multi providers), and we need to preserve these.
        if (addedTokens.has(tokenRef) || !prevModules.has(moduleRef)) {
          prevModules.add(moduleRef);
          addedTokens.add(tokenRef);
          result.addProvider(entry.provider, entry.module);
        }
      });
    });
    exportedModules.forEach((modSummary) => {
      modSummary.exportedDirectives.forEach((id) => result.addExportedDirective(id));
      modSummary.exportedPipes.forEach((id) => result.addExportedPipe(id));
    });
    importedModules.forEach((modSummary) => {
      modSummary.exportedDirectives.forEach((id) => result.addDirective(id));
      modSummary.exportedPipes.forEach((id) => result.addPipe(id));
    });
    return result;
  }
`从所有的导入/导出模块中 收集 providers/entryComponents ????`
`返回的数据是【transitiveModule】`
 transitiveModule 收集了 @NgModule({...}) 参数的摘要信息
```

###### 2.1.1.2-compileMeta

```typescript
const compileMeta = new cpl.CompileNgModuleMetadata({
      type: this._getTypeMetadata(moduleType),
      providers,
      entryComponents,
      bootstrapComponents,
      schemas,
      declaredDirectives,
      exportedDirectives,
      declaredPipes,
      exportedPipes,
      importedModules,
      exportedModules,
      transitiveModule,
      id: meta.id || null,
    });
_getTypeMetadata函数:{
    reference: moduleType
    diDeps: this._getDependenciesMetadata(moduleType, '', true),
    lifecycleHooks:getAllLifecycleHooks(this._reflector, moduleType),
}
`cpl.CompileNgModuleMetadata 函数 返回 CompileNgModuleMetadata 实例，根据传入数据包装成 CompileNgModuleMetadata 实例，添加一个 toSummary 原型方法。`

```



##### 2.1.2-NgModuleResolver

```typescript
export class NgModuleResolver {
  constructor(private _reflector: CompileReflector) {}

  isNgModule(type: any) {
    return this._reflector.annotations(type).some(createNgModule.isTypeOf);
  }

  resolve(type: Type, throwIfNotFound = true): NgModule|null {
    const ngModuleMeta: NgModule =
        findLast(this._reflector.annotations(type), createNgModule.isTypeOf);

    if (ngModuleMeta) {
      return ngModuleMeta;
    } else {
      if (throwIfNotFound) {
        throw new Error(`No NgModule metadata found for '${stringify(type)}'.`);
      }
      return null;
    }
  }
}
`NgModuleResolver用到了 CompileReflector 依赖😣`  [返回class上的 __annotations__]
`createNgModule.isTypeOf` --函数-->(obj)=>obj && obj.ngMetadataName === name;
`findLast`
export function findLast<T>(arr: T[], condition: (value: T) => boolean): T|null {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (condition(arr[i])) {
      return arr[i];
    }
  }
  return null;
}
`在装饰器部分，装饰器生成的注释实例，会有原型属性 ngMetadataName ，标记属性类别`
最终返回的是 @NgModule({...}) 的参数。回到2.1.1
```

##### 2.1.3-CompileReflector

```typescript
{provide: CompileReflector, useValue: new JitReflector()},
用的是JitReflector实例    
```

##### 2.1.4-JitReflector

```typescript
`用到 annotations 函数`
export class JitReflector implements CompileReflector {
  private reflectionCapabilities = new ReflectionCapabilities();

  componentModuleUrl(type: any, cmpMetadata: Component): string {
    const moduleId = cmpMetadata.moduleId;

    if (typeof moduleId === 'string') {
      const scheme = getUrlScheme(moduleId);
      return scheme ? moduleId : `package:${moduleId}${MODULE_SUFFIX}`;
    } else if (moduleId !== null && moduleId !== void 0) {
      throw syntaxError(
          `moduleId should be a string in "${
              stringify(type)}". See https://goo.gl/wIDDiL for more information.\n` +
          `If you're using Webpack you should inline the template and the styles, see https://goo.gl/X2J8zc.`);
    }

    return `./${stringify(type)}`;
  }
  annotations(typeOrFunc: /*Type*/ any): any[] {
    return this.reflectionCapabilities.annotations(typeOrFunc);
  }
    
  ......
}

`用到的函数 annotations ; 主要用到 ReflectionCapabilities实例的 annotations`
```

##### 2.1.5-ReflectionCapabilities

```typescript
`200行😫，只放部分代码`
`用到了 annotations`
class ReflectionCapabilities{
	constructor(reflect?: any) {
        this._reflect = reflect || global['Reflect'];
      }
    annotations(typeOrFunc: Type<any>): any[] {
    if (!isType(typeOrFunc)) {
      return [];
    }
    const parentCtor = getParentCtor(typeOrFunc);
    const ownAnnotations = this._ownAnnotations(typeOrFunc, parentCtor) || [];
    const parentAnnotations = parentCtor !== Object ? this.annotations(parentCtor) : [];
    return parentAnnotations.concat(ownAnnotations);
  }
}
`合并返回 annotations [装饰器解析参数然后挂到class上的__annotations__；《Angular中的装饰器》文档有 `
回到2.1.2步骤。
```

#### 2.2-_compileComponents（第二步）

```typescript
  _compileComponents(mainModule: Type, allComponentFactories: object[]|null) {
    const ngModule = this._metadataResolver.getNgModuleMetadata(mainModule)!;
    const moduleByJitDirective = new Map<any, CompileNgModuleMetadata>();
    const templates = new Set<CompiledTemplate>();

    const transJitModules = this._filterJitIdentifiers(ngModule.transitiveModule.modules);
    transJitModules.forEach((localMod) => {
      const localModuleMeta = this._metadataResolver.getNgModuleMetadata(localMod)!;
      this._filterJitIdentifiers(localModuleMeta.declaredDirectives).forEach((dirRef) => {
        moduleByJitDirective.set(dirRef, localModuleMeta);
        const dirMeta = this._metadataResolver.getDirectiveMetadata(dirRef);
        if (dirMeta.isComponent) {
          templates.add(this._createCompiledTemplate(dirMeta, localModuleMeta));
          if (allComponentFactories) {
            const template =
                this._createCompiledHostTemplate(dirMeta.type.reference, localModuleMeta);
            templates.add(template);
            allComponentFactories.push(dirMeta.componentFactory as object);
          }
        }
      });
    });
    transJitModules.forEach((localMod) => {
      const localModuleMeta = this._metadataResolver.getNgModuleMetadata(localMod)!;
      this._filterJitIdentifiers(localModuleMeta.declaredDirectives).forEach((dirRef) => {
        const dirMeta = this._metadataResolver.getDirectiveMetadata(dirRef);
        if (dirMeta.isComponent) {
          dirMeta.entryComponents.forEach((entryComponentType) => {
            const moduleMeta = moduleByJitDirective.get(entryComponentType.componentType)!;
            templates.add(
                this._createCompiledHostTemplate(entryComponentType.componentType, moduleMeta));
          });
        }
      });
      localModuleMeta.entryComponents.forEach((entryComponentType) => {
        if (!this.hasAotSummary(entryComponentType.componentType)) {
          const moduleMeta = moduleByJitDirective.get(entryComponentType.componentType)!;
          templates.add(
              this._createCompiledHostTemplate(entryComponentType.componentType, moduleMeta));
        }
      });
    });
    templates.forEach((template) => this._compileTemplate(template));
  }
`ngModule 和2.1.1相同，获取参数`
`过滤掉AOT，将组件保存到 tenplates`
`将 entryComponents 保存到 tenplates`
```

#### 2.3-_compileModule

```typescript
  private _compileModule(moduleType: Type): object {
    let ngModuleFactory = this._compiledNgModuleCache.get(moduleType)!;
    if (!ngModuleFactory) {
      const moduleMeta = this._metadataResolver.getNgModuleMetadata(moduleType)!;
      // Always provide a bound Compiler
      const extraProviders = this.getExtraNgModuleProviders(moduleMeta.type.reference);
      const outputCtx = createOutputContext();
      const compileResult = this._ngModuleCompiler.compile(outputCtx, moduleMeta, extraProviders);
      ngModuleFactory = this._interpretOrJit(
          ngModuleJitUrl(moduleMeta), outputCtx.statements)[compileResult.ngModuleFactoryVar];
      this._compiledNgModuleCache.set(moduleMeta.type.reference, ngModuleFactory);
    }
    return ngModuleFactory;
  }
`return ngModuleFactory;`
```

#### 3-bootstrapModuleFactory

根据第二部返回的模块 ngModuleFactory，运行promise.then：

then(moduleFactory => this.bootstrapModuleFactory(moduleFactory, options));

```typescript
  bootstrapModuleFactory<M>(moduleFactory: NgModuleFactory<M>, options?: BootstrapOptions):
      Promise<NgModuleRef<M>> {
    // Note: We need to create the NgZone _before_ we instantiate the module,
    // as instantiating the module creates some providers eagerly.
    // So we create a mini parent injector that just contains the new NgZone and
    // pass that as parent to the NgModuleFactory.
    const ngZoneOption = options ? options.ngZone : undefined;
    const ngZoneEventCoalescing = (options && options.ngZoneEventCoalescing) || false;
    const ngZoneRunCoalescing = (options && options.ngZoneRunCoalescing) || false;
    const ngZone = getNgZone(ngZoneOption, {ngZoneEventCoalescing, ngZoneRunCoalescing});
    const providers: StaticProvider[] = [{provide: NgZone, useValue: ngZone}];
    // Note: Create ngZoneInjector within ngZone.run so that all of the instantiated services are
    // created within the Angular zone
    // Do not try to replace ngZone.run with ApplicationRef#run because ApplicationRef would then be
    // created outside of the Angular zone.
    return ngZone.run(() => {
      const ngZoneInjector = Injector.create(
          {providers: providers, parent: this.injector, name: moduleFactory.moduleType.name});
      const moduleRef = <InternalNgModuleRef<M>>moduleFactory.create(ngZoneInjector);
      const exceptionHandler: ErrorHandler|null = moduleRef.injector.get(ErrorHandler, null);
      if (!exceptionHandler) {
        throw new Error('No ErrorHandler. Is platform module (BrowserModule) included?');
      }
      ngZone!.runOutsideAngular(() => {
        const subscription = ngZone!.onError.subscribe({
          next: (error: any) => {
            exceptionHandler.handleError(error);
          }
        });
        moduleRef.onDestroy(() => {
          remove(this._modules, moduleRef);
          subscription.unsubscribe();
        });
      });
      return _callAndReportToErrorHandler(exceptionHandler, ngZone!, () => {
        const initStatus: ApplicationInitStatus = moduleRef.injector.get(ApplicationInitStatus);
        initStatus.runInitializers();
        return initStatus.donePromise.then(() => {
          if (ivyEnabled) {
            // If the `LOCALE_ID` provider is defined at bootstrap then we set the value for ivy
            const localeId = moduleRef.injector.get(LOCALE_ID, DEFAULT_LOCALE_ID);
            setLocaleId(localeId || DEFAULT_LOCALE_ID);
          }
          this._moduleDoBootstrap(moduleRef);
          return moduleRef;
        });
      });
    });
  }
`在 ngZone 环境中运行代码【2-zone】`  
```



### 附录

#### JitCompilerFactory

```typescript
export class JitCompilerFactory implements CompilerFactory {
  private _defaultOptions: CompilerOptions[];

  /* @internal */
  constructor(defaultOptions: CompilerOptions[]) {
    const compilerOptions: CompilerOptions = {
      useJit: true,
      defaultEncapsulation: ViewEncapsulation.Emulated,
      missingTranslation: MissingTranslationStrategy.Warning,
    };

    this._defaultOptions = [compilerOptions, ...defaultOptions];
  }
  createCompiler(options: CompilerOptions[] = []): Compiler {
    const opts = _mergeOptions(this._defaultOptions.concat(options));
    const injector = Injector.create([
      COMPILER_PROVIDERS, {
        provide: CompilerConfig,
        useFactory: () => {
          return new CompilerConfig({
            // let explicit values from the compiler options overwrite options
            // from the app providers
            useJit: opts.useJit,
            jitDevMode: isDevMode(),
            // let explicit values from the compiler options overwrite options
            // from the app providers
            defaultEncapsulation: opts.defaultEncapsulation,
            missingTranslation: opts.missingTranslation,
            preserveWhitespaces: opts.preserveWhitespaces,
          });
        },
        deps: []
      },
      opts.providers!
    ]);
    return injector.get(Compiler);
  }
}
`最后返回的Compiler，注入的依赖是`：
{
    provide: Compiler,
    useClass: CompilerImpl,
    deps: [
      Injector, CompileMetadataResolver, TemplateParser, StyleCompiler, ViewCompiler,
      NgModuleCompiler, SummaryResolver, CompileReflector, JitEvaluator, CompilerConfig, Console
    ]
  },
`按照第一阶段begin中的流程，最终 new CompilerImpl(...deps)`     
```

#### CompilerImpl

```typescript
export class CompilerImpl implements Compiler {
  private _delegate: JitCompiler;
  public readonly injector: Injector;
  constructor(
      injector: Injector, private _metadataResolver: CompileMetadataResolver,
      templateParser: TemplateParser, styleCompiler: StyleCompiler, viewCompiler: ViewCompiler,
      ngModuleCompiler: NgModuleCompiler, summaryResolver: SummaryResolver<Type<any>>,
      compileReflector: CompileReflector, jitEvaluator: JitEvaluator,
      compilerConfig: CompilerConfig, console: Console) {
    this._delegate = new JitCompiler(
        _metadataResolver, templateParser, styleCompiler, viewCompiler, ngModuleCompiler,
        summaryResolver, compileReflector, jitEvaluator, compilerConfig, console,
        this.getExtraNgModuleProviders.bind(this));
    this.injector = injector;
  }

  private getExtraNgModuleProviders() {
    return [this._metadataResolver.getProviderMetadata(
        new ProviderMeta(Compiler, {useValue: this}))];
  }

  compileModuleSync<T>(moduleType: Type<T>): NgModuleFactory<T> {
    return this._delegate.compileModuleSync(moduleType) as NgModuleFactory<T>;
  }
  compileModuleAsync<T>(moduleType: Type<T>): Promise<NgModuleFactory<T>> {
    return this._delegate.compileModuleAsync(moduleType) as Promise<NgModuleFactory<T>>;
  }
  compileModuleAndAllComponentsSync<T>(moduleType: Type<T>): ModuleWithComponentFactories<T> {
    const result = this._delegate.compileModuleAndAllComponentsSync(moduleType);
    return {
      ngModuleFactory: result.ngModuleFactory as NgModuleFactory<T>,
      componentFactories: result.componentFactories as ComponentFactory<any>[],
    };
  }
  compileModuleAndAllComponentsAsync<T>(moduleType: Type<T>):
      Promise<ModuleWithComponentFactories<T>> {
    return this._delegate.compileModuleAndAllComponentsAsync(moduleType)
        .then((result) => ({
                ngModuleFactory: result.ngModuleFactory as NgModuleFactory<T>,
                componentFactories: result.componentFactories as ComponentFactory<any>[],
              }));
  }
  loadAotSummaries(summaries: () => any[]) {
    this._delegate.loadAotSummaries(summaries);
  }
  hasAotSummary(ref: Type<any>): boolean {
    return this._delegate.hasAotSummary(ref);
  }
  getComponentFactory<T>(component: Type<T>): ComponentFactory<T> {
    return this._delegate.getComponentFactory(component) as ComponentFactory<T>;
  }
  clearCache(): void {
    this._delegate.clearCache();
  }
  clearCacheFor(type: Type<any>) {
    this._delegate.clearCacheFor(type);
  }
  getModuleId(moduleType: Type<any>): string|undefined {
    const meta = this._metadataResolver.getNgModuleMetadata(moduleType);
    return meta && meta.id || undefined;
  }
}

`实际调用的是new JitCompiler(...)`
CompilerImpl类的一些方法:
    compileModuleSync
    compileModuleAsync
    compileModuleAndAllComponentsSync
    compileModuleAndAllComponentsAsync
    loadAotSummaries
    hasAotSummary
    clearCache
    clearCacheFor
都是调用 JitCompiler 类上对应的同名方法。
```

#### SyncAsync

```typescript
export const SyncAsync = {
  assertSync: <T>(value: SyncAsync<T>): T => {
    if (isPromise(value)) {
      throw new Error(`Illegal state: value cannot be a promise`);
    }
    return value;
  },
  then: <T, R>(value: SyncAsync<T>, cb: (value: T) => R | Promise<R>| SyncAsync<R>):
      SyncAsync<R> => {
        return isPromise(value) ? value.then(cb) : cb(value);
      },
  all: <T>(syncAsyncValues: SyncAsync<T>[]): SyncAsync<T[]> => {
    return syncAsyncValues.some(isPromise) ? Promise.all(syncAsyncValues) : syncAsyncValues as T[];
  }
};
```

#### flattenAndDedupeArray

```typescript
将 tree 类型的数据扁平并去除重复数据
```

#### cpl

```
CompileNgModuleMetadata
```

##### CompileNgModuleMetadata

```typescript
export class CompileNgModuleMetadata {
  type: CompileTypeMetadata;
  declaredDirectives: CompileIdentifierMetadata[];
  exportedDirectives: CompileIdentifierMetadata[];
  declaredPipes: CompileIdentifierMetadata[];

  exportedPipes: CompileIdentifierMetadata[];
  entryComponents: CompileEntryComponentMetadata[];
  bootstrapComponents: CompileIdentifierMetadata[];
  providers: CompileProviderMetadata[];

  importedModules: CompileNgModuleSummary[];
  exportedModules: CompileNgModuleSummary[];
  schemas: SchemaMetadata[];
  id: string|null;

  transitiveModule: TransitiveCompileNgModuleMetadata;

  constructor({
    type,
    providers,
    declaredDirectives,
    exportedDirectives,
    declaredPipes,
    exportedPipes,
    entryComponents,
    bootstrapComponents,
    importedModules,
    exportedModules,
    schemas,
    transitiveModule,
    id
  }: {
    type: CompileTypeMetadata,
    providers: CompileProviderMetadata[],
    declaredDirectives: CompileIdentifierMetadata[],
    exportedDirectives: CompileIdentifierMetadata[],
    declaredPipes: CompileIdentifierMetadata[],
    exportedPipes: CompileIdentifierMetadata[],
    entryComponents: CompileEntryComponentMetadata[],
    bootstrapComponents: CompileIdentifierMetadata[],
    importedModules: CompileNgModuleSummary[],
    exportedModules: CompileNgModuleSummary[],
    transitiveModule: TransitiveCompileNgModuleMetadata,
    schemas: SchemaMetadata[],
    id: string|null
  }) {
    this.type = type || null;
    this.declaredDirectives = _normalizeArray(declaredDirectives);
    this.exportedDirectives = _normalizeArray(exportedDirectives);
    this.declaredPipes = _normalizeArray(declaredPipes);
    this.exportedPipes = _normalizeArray(exportedPipes);
    this.providers = _normalizeArray(providers);
    this.entryComponents = _normalizeArray(entryComponents);
    this.bootstrapComponents = _normalizeArray(bootstrapComponents);
    this.importedModules = _normalizeArray(importedModules);
    this.exportedModules = _normalizeArray(exportedModules);
    this.schemas = _normalizeArray(schemas);
    this.id = id || null;
    this.transitiveModule = transitiveModule || null;
  }

  toSummary(): CompileNgModuleSummary {
    const module = this.transitiveModule!;
    return {
      summaryKind: CompileSummaryKind.NgModule,
      type: this.type,
      entryComponents: module.entryComponents,
      providers: module.providers,
      modules: module.modules,
      exportedDirectives: module.exportedDirectives,
      exportedPipes: module.exportedPipes
    };
  }
}
`toSummary() 生成的摘要与传入的 【transitiveModule】 有关。`
```

#### _metadataResolver【主要】

_metadataResolver 是 CompileMetadataResolver的实例

依赖关系如下：

```typescript
{
    provide: CompileMetadataResolver,
    deps: [
      CompilerConfig, HtmlParser, NgModuleResolver, DirectiveResolver, PipeResolver,
      SummaryResolver, ElementSchemaRegistry, DirectiveNormalizer, Console,
      [Optional, StaticSymbolCache], CompileReflector, [Optional, ERROR_COLLECTOR_TOKEN]
    ]
  },
```

CompileMetadataResolver：

```typescript
`1200行😱`
class CompileMetadataResolver{
   	private _nonNormalizedDirectiveCache =
         new Map<Type, {annotation: Directive, metadata: cpl.CompileDirectiveMetadata}>();
  	private _directiveCache = new Map<Type, cpl.CompileDirectiveMetadata>();
    private _summaryCache = new Map<Type, cpl.CompileTypeSummary|null>();
  	private _pipeCache = new Map<Type, cpl.CompilePipeMetadata>();
  	private _ngModuleCache = new Map<Type, cpl.CompileNgModuleMetadata>();
  	private _ngModuleOfTypes = new Map<Type, Type>();
  	private _shallowModuleCache = new Map<Type, cpl.CompileShallowModuleMetadata>();
    还有依赖的实例数据；
}

```

##### getNonNormalizedDirectiveMetadata

```typescript
`通过解析指令和组件生成对应的元数据`

`解析《指令》生成的元数据`{
    annotation:装饰器的参数【dirMeta】,
    metadata：{
      isHost: false,
      selector: null,
      exportAs: dirMeta.exportAs,
      isComponent: false,
      type: this._getTypeMetadata(directiveType),
      template: undefined,
      changeDetection: null,
      inputs: dirMeta.inputs || [],
      outputs: dirMeta.outputs || [],
      host: dirMeta.host || {},
      providers:  [],
      viewProviders:  [],
      queries: queries || [],
      guards: dirMeta.guards || {},
      viewQueries: viewQueries || [],
      entryComponents: entryComponentMetadata,
      componentViewType: null,
      rendererType:  null,
      componentFactory: null
    }    
}
`-------组件-------组件参数【dirMeta】-----`
nonNormalizedTemplateMetadata = new cpl.CompileTemplateMetadata({
        encapsulation: noUndefined(compMeta.encapsulation),
        template: noUndefined(compMeta.template),
        templateUrl: noUndefined(compMeta.templateUrl),
        htmlAst: null,
        styles: compMeta.styles || [],
        styleUrls: compMeta.styleUrls || [],
        animations: animations || [],
        interpolation: noUndefined(compMeta.interpolation),
        isInline: !!compMeta.template,
        externalStylesheets: [],
        ngContentSelectors: [],
        preserveWhitespaces: noUndefined(dirMeta.preserveWhitespaces),
      });
`解析《组件》生成的元数据`{
    annotation:组件的参数【dirMeta】，
    metadate:{
      isHost: false,
      selector: selector,
      exportAs: noUndefined(dirMeta.exportAs),
      isComponent: !!nonNormalizedTemplateMetadata,
      type: this._getTypeMetadata(directiveType),
      template: nonNormalizedTemplateMetadata,
      changeDetection: changeDetectionStrategy,
      inputs: dirMeta.inputs || [],
      outputs: dirMeta.outputs || [],
      host: dirMeta.host || {},
      providers: providers || [],
      viewProviders: viewProviders || [],
      queries: queries || [],
      guards: dirMeta.guards || {},
      viewQueries: viewQueries || [],
      entryComponents: entryComponentMetadata,
      componentViewType: nonNormalizedTemplateMetadata ? this.getComponentViewClass(directiveType) :
                                                         null,
      rendererType: nonNormalizedTemplateMetadata ? this.getRendererType(directiveType) : null,
      componentFactory: null
    }
}
```

##### loadDirectiveMetadata

```typescript
`组件是指令的子类,走相似逻辑`
loadDirectiveMetadata(ngModuleType: any, directiveType: any, isSync: boolean): SyncAsync<null> {
    if (this._directiveCache.has(directiveType)) {
      return null;
    }
    directiveType = resolveForwardRef(directiveType);
    const {annotation, metadata} = this.getNonNormalizedDirectiveMetadata(directiveType)!;

    const createDirectiveMetadata = (templateMetadata: cpl.CompileTemplateMetadata|null) => {
      const normalizedDirMeta = new cpl.CompileDirectiveMetadata({
        isHost: false,
        type: metadata.type,
        isComponent: metadata.isComponent,
        selector: metadata.selector,
        exportAs: metadata.exportAs,
        changeDetection: metadata.changeDetection,
        inputs: metadata.inputs,
        outputs: metadata.outputs,
        hostListeners: metadata.hostListeners,
        hostProperties: metadata.hostProperties,
        hostAttributes: metadata.hostAttributes,
        providers: metadata.providers,
        viewProviders: metadata.viewProviders,
        queries: metadata.queries,
        guards: metadata.guards,
        viewQueries: metadata.viewQueries,
        entryComponents: metadata.entryComponents,
        componentViewType: metadata.componentViewType,
        rendererType: metadata.rendererType,
        componentFactory: metadata.componentFactory,
        template: templateMetadata
      });
      if (templateMetadata) {
        this.initComponentFactory(metadata.componentFactory!, templateMetadata.ngContentSelectors);
      }
      this._directiveCache.set(directiveType, normalizedDirMeta);
      this._summaryCache.set(directiveType, normalizedDirMeta.toSummary());
      return null;
    };
// 组件
    if (metadata.isComponent) {
      const template = metadata.template !;
      const templateMeta = this._directiveNormalizer.normalizeTemplate({
        ngModuleType,
        componentType: directiveType,
        moduleUrl: this._reflector.componentModuleUrl(directiveType, annotation),
        encapsulation: template.encapsulation,
        template: template.template,
        templateUrl: template.templateUrl,
        styles: template.styles,
        styleUrls: template.styleUrls,
        animations: template.animations,
        interpolation: template.interpolation,
        preserveWhitespaces: template.preserveWhitespaces
      });
      if (isPromise(templateMeta) && isSync) {
        this._reportError(componentStillLoadingError(directiveType), directiveType);
        return null;
      }
      return SyncAsync.then(templateMeta, createDirectiveMetadata);
    } else {
      // directive
      createDirectiveMetadata(null);
      return null;
    }
  }
`走《指令》逻辑：`createDirectiveMetadata(null) => 生成标准指令元数据，存入 _directiveCache 和 _summaryCache，返回null；
`走《组件》逻辑：`this._directiveNormalizer.normalizeTemplate
生成关于组件的数据👇【_directiveNormalizer结尾】。
```

#### _directiveNormalizer

解析指令数据

```typescript
class DirectiveNormalizer{
    normalizeTemplate(prenormData: PrenormalizedTemplateMetadata):
        SyncAsync<CompileTemplateMetadata> {
            `...校验互斥输入值 templateUrl，template
            校验 preserveWhitespaces【是否保留空白字符】`
            return SyncAsync.then(
                this._preParseTemplate(prenormData),
                (preparsedTemplate) => this._normalizeTemplateMetadata(prenormData, preparsedTemplate));
      }
    private _preParseTemplate(prenomData: PrenormalizedTemplateMetadata):
        SyncAsync<PreparsedTemplate> {
            `...获取 template【如果没有url对应的缓存，template为‘’】 和 templateUrl【moduleurl + templateUrl】`
            return SyncAsync.then(
                template, (template) => this._preparseLoadedTemplate(prenomData, template, templateUrl));
          }
    private _preparseLoadedTemplate(
          prenormData: PrenormalizedTemplateMetadata, template: string,
          templateAbsUrl: string): PreparsedTemplate {
        const isInline = !!prenormData.template;
        const interpolationConfig = InterpolationConfig.fromArray(prenormData.interpolation!);
        const templateUrl = templateSourceUrl(
            {reference: prenormData.ngModuleType}, {type: {reference: prenormData.componentType}},
            {isInline, templateUrl: templateAbsUrl});
        const rootNodesAndErrors = this._htmlParser.parse(
            template, templateUrl, {tokenizeExpansionForms: true, interpolationConfig});
        if (rootNodesAndErrors.errors.length > 0) {
          const errorString = rootNodesAndErrors.errors.join('\n');
          throw syntaxError(`Template parse errors:\n${errorString}`);
        }

        const templateMetadataStyles = this._normalizeStylesheet(new CompileStylesheetMetadata(
            {styles: prenormData.styles, moduleUrl: prenormData.moduleUrl}));

        const visitor = new TemplatePreparseVisitor();
        html.visitAll(visitor, rootNodesAndErrors.rootNodes);
        const templateStyles = this._normalizeStylesheet(new CompileStylesheetMetadata(
            {styles: visitor.styles, styleUrls: visitor.styleUrls, moduleUrl: templateAbsUrl}));

        const styles = templateMetadataStyles.styles.concat(templateStyles.styles);

        const inlineStyleUrls = templateMetadataStyles.styleUrls.concat(templateStyles.styleUrls);
        const styleUrls = this
                              ._normalizeStylesheet(new CompileStylesheetMetadata(
                                  {styleUrls: prenormData.styleUrls, moduleUrl: prenormData.moduleUrl}))
                              .styleUrls;
        return {
          template,
          templateUrl: templateAbsUrl,
          isInline,
          htmlAst: rootNodesAndErrors,
          styles,
          inlineStyleUrls,
          styleUrls,
          ngContentSelectors: visitor.ngContentSelectors,
        };
      }    
}
`isInline`:判断是内联模板还是 url模板
`interpolationConfig`:解析分隔符，默认{{}}
`templateUrl`:获取html url
`rootNodesAndErrors`：解析html，生成节点树
`templateMetadataStyles`:解析styles 和 模块module合并

return {
          template,                       //模板
          templateUrl: templateAbsUrl,    //参数templateUrl
          isInline,                       //是否是行内组件 (!!template)
          htmlAst: rootNodesAndErrors,    //生成的语法树
          styles,                         //参数styles调整后
          inlineStyleUrls,                //
          styleUrls,
          ngContentSelectors: visitor.ngContentSelectors,   //选择器？？？
        };
```

###### _htmlParser.parse

```typescript
`_htmlParser调用的是 Parser`
export class Parser {
  constructor(public getTagDefinition: (tagName: string) => TagDefinition) {}

  parse(source: string, url: string, options?: lex.TokenizeOptions): ParseTreeResult {
    const tokenizeResult = lex.tokenize(source, url, this.getTagDefinition, options);
    const parser = new _TreeBuilder(tokenizeResult.tokens, this.getTagDefinition);
    parser.build();
    return new ParseTreeResult(
        parser.rootNodes,
        (tokenizeResult.errors as ParseError[]).concat(parser.errors),
    );
  }
}
`tokenizeResult`：调用lex.tokenize，生成html分类token。
`parser.build`:将解析的token，合成节点树
`new ParseTreeResult(...)`:{rootNodes}
```

lex.tokenize

```typescript
export function tokenize(
    source: string, url: string, getTagDefinition: (tagName: string) => TagDefinition,
    options: TokenizeOptions = {}): TokenizeResult {
  const tokenizer = new _Tokenizer(new ParseSourceFile(source, url), getTagDefinition, options);
  tokenizer.tokenize();
  return new TokenizeResult(
      mergeTextTokens(tokenizer.tokens), tokenizer.errors, tokenizer.nonNormalizedIcuExpressions);
}
`new ParseSourceFile(source, url)`:
    export class ParseSourceFile {
      constructor(public content: string, public url: string) {}
    }
`_Tokenizer`
```

###### _Tokenizer

```typescript
`解析html文件`
class _Tokenizer{
      private _cursor: CharacterCursor;                      //光标
      private _tokenizeIcu: boolean;                         //是否标记 ICU 信息？？？？？？
      private _interpolationConfig: InterpolationConfig;     //插值表达式的分隔符
      private _leadingTriviaCodePoints: number[]|undefined;
      private _currentTokenStart: CharacterCursor|null = null; //当前语法块
      private _currentTokenType: TokenType|null = null;        //当前语法块类别
      private _expansionCaseStack: TokenType[] = [];
      private _inInterpolation: boolean = false;
      private readonly _preserveLineEndings: boolean;        //是否统一替换换行符 CRLF -> LF
      private readonly _escapedString: boolean;              //是否对字符串进行转义
      private readonly _i18nNormalizeLineEndingsInICUs: boolean;  //规范化结尾
      tokens: Token[] = [];                                   `存放解析完毕的块`
      errors: TokenError[] = [];
      nonNormalizedIcuExpressions: Token[] = [];
    constructor(
          _file: ParseSourceFile, private _getTagDefinition: (tagName: string) => TagDefinition,
          options: TokenizeOptions) {
        this._tokenizeIcu = options.tokenizeExpansionForms || false;
        this._interpolationConfig = options.interpolationConfig || DEFAULT_INTERPOLATION_CONFIG;
        this._leadingTriviaCodePoints =
            options.leadingTriviaChars && options.leadingTriviaChars.map(c => c.codePointAt(0) || 0);
        const range =
            options.range || {endPos: _file.content.length, startPos: 0, startLine: 0, startCol: 0};
        this._cursor = options.escapedString ? new EscapedCharacterCursor(_file, range) :
                                               new PlainCharacterCursor(_file, range);
        this._preserveLineEndings = options.preserveLineEndings || false;
        this._escapedString = options.escapedString || false;
        this._i18nNormalizeLineEndingsInICUs = options.i18nNormalizeLineEndingsInICUs || false;
        try {
          this._cursor.init();
        } catch (e) {
          this.handleError(e);
        }
      }
}
`range`{endPos: '', startPos: 0, startLine: 0, startCol: 0}【假设无template，有模板就是模板的长度】
`this._cursor.init()`👇【PlainCharacterCursor】
```

###### PlainCharacterCursor

```typescript
class PlainCharacterCursor implements CharacterCursor {
  protected state: CursorState;
  protected file: ParseSourceFile;
  protected input: string;
  protected end: number;

  constructor(fileOrCursor: PlainCharacterCursor);
  constructor(fileOrCursor: ParseSourceFile, range: LexerRange);
  constructor(fileOrCursor: ParseSourceFile|PlainCharacterCursor, range?: LexerRange) {
    if (fileOrCursor instanceof PlainCharacterCursor) {
      this.file = fileOrCursor.file;
      this.input = fileOrCursor.input;
      this.end = fileOrCursor.end;

      const state = fileOrCursor.state;
      // Note: avoid using `{...fileOrCursor.state}` here as that has a severe performance penalty.
      // In ES5 bundles the object spread operator is translated into the `__assign` helper, which
      // is not optimized by VMs as efficiently as a raw object literal. Since this constructor is
      // called in tight loops, this difference matters.
      this.state = {
        peek: state.peek,
        offset: state.offset,
        line: state.line,
        column: state.column,
      };
    } else {
      if (!range) {
        throw new Error(
            'Programming error: the range argument must be provided with a file argument.');
      }
      this.file = fileOrCursor;
      this.input = fileOrCursor.content;
      this.end = range.endPos;
      this.state = {
        peek: -1,
        offset: range.startPos,
        line: range.startLine,
        column: range.startCol,
      };
    }
  }

  clone(): PlainCharacterCursor {
    return new PlainCharacterCursor(this);
  }

  peek() {
    return this.state.peek;
  }
  charsLeft() {
    return this.end - this.state.offset;
  }
  diff(other: this) {
    return this.state.offset - other.state.offset;
  }

  advance(): void {
    this.advanceState(this.state);
  }

  init(): void {
    this.updatePeek(this.state);
  }

  getSpan(start?: this, leadingTriviaCodePoints?: number[]): ParseSourceSpan {
    start = start || this;
    let fullStart = start;
    if (leadingTriviaCodePoints) {
      while (this.diff(start) > 0 && leadingTriviaCodePoints.indexOf(start.peek()) !== -1) {
        if (fullStart === start) {
          start = start.clone() as this;
        }
        start.advance();
      }
    }
    const startLocation = this.locationFromCursor(start);
    const endLocation = this.locationFromCursor(this);
    const fullStartLocation =
        fullStart !== start ? this.locationFromCursor(fullStart) : startLocation;
    return new ParseSourceSpan(startLocation, endLocation, fullStartLocation);
  }

  getChars(start: this): string {
    return this.input.substring(start.state.offset, this.state.offset);
  }

  charAt(pos: number): number {
    return this.input.charCodeAt(pos);
  }

  protected advanceState(state: CursorState) {
    if (state.offset >= this.end) {
      this.state = state;
      throw new CursorError('Unexpected character "EOF"', this);
    }
    const currentChar = this.charAt(state.offset);
    if (currentChar === chars.$LF) {
      state.line++;
      state.column = 0;
    } else if (!chars.isNewLine(currentChar)) {
      state.column++;
    }
    state.offset++;
    this.updatePeek(state);
  }

  protected updatePeek(state: CursorState): void {
    state.peek = state.offset >= this.end ? chars.$EOF : this.charAt(state.offset);
  }

  private locationFromCursor(cursor: this): ParseLocation {
    return new ParseLocation(
        cursor.file, cursor.state.offset, cursor.state.line, cursor.state.column);
  }
}
`fileOrCursor 是 ParseSourceFile 实例`：返回{
    file = {content:'',url:'******'};
    input = '';
    end = 0;
    state = {
        peek: -1,
        offset:0,
        line: 0,
        column: 0,
    };
}
```

