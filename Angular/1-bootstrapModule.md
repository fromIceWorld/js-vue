## bootstrapModule

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
主要是合并编译配置【初始阶段未传入编译配置】，运行compileNgModuleFactory【初始化阶段无编译配置】
compileNgModuleFactory(this.injector, {}, moduleType) 
//this指向 PlatformRef 实例【_platform】，this.injector 就是第一步中的 StaticInjector实例
```

#### 1-compileNgModuleFactory

```typescript
function compileNgModuleFactory<M>(
    injector: Injector, options: CompilerOptions,
    moduleType: Type<M>): Promise<NgModuleFactory<M>> {
  const compilerFactory: CompilerFactory = injector.get(CompilerFactory);【调用 CompilerFactory 依赖】
  const compiler = compilerFactory.createCompiler([options]);  //返回的是[CompilerImpl实例]
  return compiler.compileModuleAsync(moduleType);
}

`调用injector.get(CompilerFactory);在【0-begin】中有返回值 JitCompilerFactory 实例`
然后运行实例原型方法JitCompilerFactory的createCompiler,提供JIT编译需要的依赖。【附录compiler依赖】
在createCompiler最后调用 injector.get(Compiler)【使用 Compiler 依赖】
最终compiler.compileModuleAsync(moduleType)
`实例化 CompilerImpl 的同时 实例化了 JitCompiler，存储在 CompilerImpl 实例 `
【运行 CompilerImpl 的 compileModuleAsync】也就是进行 【异步的编译模块】，参数是`AppModule`
```

##### 1.1-CompilerImpl

```typescript
@params  injector               injector依赖
@params  _metadataResolver		【元数据解析器】
@params  templateParser		    【模板解析器】
@params  styleCompiler			【styles解析器】
@params  viewCompiler           【视图解析器】
@params  ngModuleCompiler       【视图解析器】
@params  summaryResolver	    【摘要解析器】
@params  compileReflector       【编译反射器】
@params  jitEvaluator           【jit 求值程序】
@params  compilerConfig         【编译配置】
@params	 console                【console】


export class CompilerImpl implements Compiler {
  private _delegate: JitCompiler;
  public readonly injector: Injector;
  constructor(
      injector: Injector, private _metadataResolver: CompileMetadataResolver,
      templateParser: TemplateParser, styleCompiler: StyleCompiler, viewCompiler: ViewCompiler,
      ngModuleCompiler: NgModuleCompiler, summaryResolver: SummaryResolver<Type<any>>,
      compileReflector: CompileReflector, jitEvaluator: JitEvaluator,
      compilerConfig: CompilerConfig, console: Console) {
          //
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

`生成 CompilerImpl 类，其中一些方法是 JitCompiler 的代理方法`
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
`调用 compileModuleAsync 方法 其实是代理的 JitCompiler 的 compileModuleAsync`
```

##### 1.2-JitCompiler

```typescript
`下面的步骤基本在 JitCompiler 类中😪`
compileModuleAsync的参数是`AppModule`

class JitCompiler {
  private _compiledTemplateCache = new Map<Type, CompiledTemplate>();            //编译后的模板缓存
  private _compiledHostTemplateCache = new Map<Type, CompiledTemplate>();        //编译后的主模板缓存
  private _compiledDirectiveWrapperCache = new Map<Type, Type>();
  private _compiledNgModuleCache = new Map<Type, object>();                      //编译后的模块缓存
  private _sharedStylesheetCount = 0;
  private _addedAotSummaries = new Set<() => any[]>();

  constructor(
      private _metadataResolver: CompileMetadataResolver, private _templateParser: TemplateParser,
      private _styleCompiler: StyleCompiler, private _viewCompiler: ViewCompiler,
      private _ngModuleCompiler: NgModuleCompiler, private _summaryResolver: SummaryResolver<Type>,
      private _reflector: CompileReflector, private _jitEvaluator: JitEvaluator,
      private _compilerConfig: CompilerConfig, private _console: Console,
      private getExtraNgModuleProviders: (ngModule: any) => CompileProviderMetadata[]) {}
    // 调用 _compileModuleAndComponents函数；
  compileModuleAsync(moduleType: Type): Promise<object> {
    return Promise.resolve(this._compileModuleAndComponents(moduleType, false));
  }
    // 分为三步【2.1，2.2，2.3】
  private _compileModuleAndComponents(moduleType: Type, isSync: boolean): SyncAsync<object> {
    return SyncAsync.then(this._loadModules(moduleType, isSync), () => {
          this._compileComponents(moduleType, null);
          return this._compileModule(moduleType);
        });
  }
}    
注：
`_compileModuleAndComponents 函数的返回值 就是 bootstrapModule 的返回值，是下一步 then 函数的参数`
```

**接下来的三步是，加载模块，编译组件，编译模块。都在 CompilerImpl 和  JitCompiler 下执行。**

------

#### 2.1-_loadModules(第一步)

```typescript
`加载依赖模块，缓存依赖模块中的指令及摘要信息 到 CompileMetadataResolver实例 _metadataResolver `
@params mainModule:模块类class;
@params isSync:加载方式[同步还是异步],同步加载;

private _loadModules(mainModule: any, isSync: boolean): SyncAsync<any> {
    const loading: Promise<any>[] = [];
	// 获取根模块的元数据【2.1.1返回数据】
    const mainNgModule = this._metadataResolver.getNgModuleMetadata(mainModule)!;
//过滤根模块的 依赖模块的AOT模块
    this._filterJitIdentifiers(mainNgModule.transitiveModule.modules).forEach((nestedNgModule) => {
      const moduleMeta = this._metadataResolver.getNgModuleMetadata(nestedNgModule)!;
//过滤根模块的 依赖模块的AOT指令        
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
终：loading为[]。
```

##### 2.1.1-getNgModuleMetadata

```typescript
`获取模块的编译元数据`
const declaredDirectives: cpl.CompileIdentifierMetadata[] = [];
const exportedNonModuleIdentifiers: cpl.CompileIdentifierMetadata[] = [];
const declaredPipes: cpl.CompileIdentifierMetadata[] = [];
const importedModules: cpl.CompileNgModuleSummary[] = [];
const exportedModules: cpl.CompileNgModuleSummary[] = [];
const providers: cpl.CompileProviderMetadata[] = [];
const entryComponents: cpl.CompileEntryComponentMetadata[] = [];
const bootstrapComponents: cpl.CompileIdentifierMetadata[] = [];
const schemas: SchemaMetadata[] = [];

`CompileMetadataResolver 的 getNgModuleMetadata 函数 200行😫，只放伪代码`
//获取模块的annotations
const meta = this._ngModuleResolver.resolve(moduleType, throwIfNotFound = true);【下2.1.2】
//获取导入模块的摘要信息，如果导入模块还有对应的导入模块，继续获取，最后缓存并返回摘要信息存入【importedModules数组】
if(meta.imports){...}
//获取导出模块的摘要信息，如果导入模块还有对应的导出模块，继续获取，最后缓存并返回摘要信息存入【importedModules数组】,如果不存在摘要信息，将其存入[exportedNonModuleIdentifiers]
if(meta.exports){...}
// 
const transitiveModule = this._getTransitiveNgModuleMetadata(importedModules, exportedModules);
//将组件/指令/管道存入 《transitiveModule》 和 declaredDirectives               
if(meta.declarations){...}

if(meta.providers){...}
//组件元数据 存入【entryComponents】
if(meta.entryComponents){...}
//bootstrapComponents元数据，存入bootstrapComponents,再存到 entryComponents。
if(meta.bootstrap){...}
//schemas数据，存入schemas
if(meta.schemas){...}

//生成模块的编译元数据。参数是下面的1-7
compileMeta = new cpl.CompileNgModuleMetadata(...)
return compileMeta; 

1-`importedModules[] 和 exportedModules[] 储存的 imports 和 exports 模块的摘要信息`：{
      summaryKind: 2,// 2代表模块 
      type: {reference:模块class,},
      entryComponents: 模块的entryComponents,
      providers:  模块的providers,
      modules:  模块引入的modules,
      exportedDirectives:  模块的导出的指令,
      exportedPipes: 模块的导出的管道
}                                              
2-`exportedNonModuleIdentifiers[]存入的 导出模块信息`：{
    reference: 导出模块class
}
3-`declaredDirectives[] 储存该模块需要的指令/组件/管道`：{
    reference: 指令/组件/管道 class
}
4-`providers[<ProviderMeta实例>] 数据`：{
    token: provider.provide;
    useClass: provider.useClass;
    useValue: provider.useValue;
    useExisting: provider.useExisting;
    useFactory:provider.useFactory;
    dependencies: provider.dependencies;
    multi: provider.multi;
}                   
5-`entryComponents[] 数据`：{
    {componentType: 组件class, componentFactory: dirSummary.componentFactory!}
    {componentType: bootstrapComponents组件, componentFactory: dirSummary.componentFactory!}
} 
6-`bootstrapComponents[] 数据`：{
    reference: 组件class
}                   
7-`schemas[] 数据`：{
    schemas
} 
8-`type`:{
    reference: 模块class,
    diDeps: 依赖
    lifecycleHooks: 生命周期
}                         
将 1-7 解析出的元数据，经过 new cpl.CompileNgModuleMetadata(...)生成实例，返回实例【实例有toSummary 原型函数，可生成该模块的摘要信息。】                  
compileMeta = new cpl.CompileNgModuleMetadata({
      type: this._getTypeMetadata(moduleType),                  //8
      providers,                                  				//4
      entryComponents,                            				//5
      bootstrapComponents,                       				//6
      schemas,                                    				//7
      declaredDirectives,                         				//3
      exportedDirectives,                        			 	//4
      declaredPipes,
      exportedPipes,
      importedModules,                                          //1
      exportedModules,                                          //1
      transitiveModule[TransitiveCompileNgModuleMetadata实例2.1.1.1],  //如下：
    `**** transitiveModule 的 modules 只存储了当前模块`
  //将compileMeta中的 type 存入 【TransitiveCompileNgModuleMetadata实例中的modules】 
  //将1中的 entryComponents 存入 【TransitiveCompileNgModuleMetadata实例中的entryComponents】
  //将1中的 exportedDirectives 存入 【TransitiveCompileNgModuleMetadata实例中的exportedDirectives】
 //将1中的 exportedPipes 存入 【TransitiveCompileNgModuleMetadata实例中的exportedPipes】
 //将1中的 importedModules 中的指令/管道 存入 【TransitiveCompileNgModuleMetadata实例中的addDirective, addPipe】
    
      id: meta.id || null,
    });  
                                                 
                                                 
                   
`_ngModuleResolver用到了NgModuleResolver依赖【模块解析器】😐` 
                                              
终：`解析出@NgModule装饰器的参数，生成 CompileNgModuleMetadata 实例并返回`                                         注：`CompileNgModuleMetadata`  是收集所有参数信息的集合,有 toSummary 方法，返回元数据的 摘要信息。  
```

###### 2.1.1.1-_getTransitiveNgModuleMetadata

```typescript
`从所有的导入/导出模块中 收集 providers/entryComponents 和导入导出模块`
`返回的是数据集【transitiveModule】`
 transitiveModule 收集了 @NgModule({...}) 参数的摘要信息 
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
返回数据 result 【2.1.1.1.1】
`返回 存储模块中的指令/管道/模块数据的 实例`
```

###### 2.1.1.1.1-TransitiveCompileNgModuleMetadata

```typescript
`用于存储模块中的 指令/管道/模块`
class TransitiveCompileNgModuleMetadata{
	  directivesSet = new Set<any>();
      directives: CompileIdentifierMetadata[] = [];
      exportedDirectivesSet = new Set<any>();
      exportedDirectives: CompileIdentifierMetadata[] = [];
      pipesSet = new Set<any>();
      pipes: CompileIdentifierMetadata[] = [];
      exportedPipesSet = new Set<any>();
      exportedPipes: CompileIdentifierMetadata[] = [];
      modulesSet = new Set<any>();
      modules: CompileTypeMetadata[] = [];
      entryComponentsSet = new Set<any>();
      entryComponents: CompileEntryComponentMetadata[] = [];

      providers: {  token: provider.provide;
                    useClass: provider.useClass;
                    useValue: provider.useValue;
                    useExisting: provider.useExisting;
                    useFactory:provider.useFactory;
                    dependencies: provider.dependencies;
                    multi: provider.multi;}[] = [];
}

```

###### 2.1.1.3-loadDirectiveMetadata

```typescript
`主模块下的子模块`

`加载指令元数据【组件是指令的子类，包含在指令中】`
`ngModuleType`:主模块下的子模块
`directiveType`：子模块下的指令{
    type：指令class
}

 loadDirectiveMetadata(ngModuleType: any, directiveType: any, isSync: boolean): SyncAsync<null> {
    if (this._directiveCache.has(directiveType)) {
      return null;
    }
    directiveType = resolveForwardRef(directiveType);
// 返回 { 经过处理的指令元数据, 当前组件的annotation }
    const {annotation, metadata} = this.getNonNormalizedDirectiveMetadata(directiveType)!;

    const createDirectiveMetadata = (templateMetadata: cpl.CompileTemplateMetadata|null) => {
      const normalizedDirMeta = new cpl.CompileDirectiveMetadata({
        isHost: false,
        type: metadata.type,//{reference: 模块class, diDeps: 依赖,lifecycleHooks: 生命周期}
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
        template: templateMetadata【`下templateMeta`】
      });
      if (templateMetadata) {
        this.initComponentFactory(metadata.componentFactory!, templateMetadata.ngContentSelectors);
      }
      this._directiveCache.set(directiveType, normalizedDirMeta);
      this._summaryCache.set(directiveType, normalizedDirMeta.toSummary());
      return null;
    };

    if (metadata.isComponent) {
      const template = metadata.template !;
        //1.1-template解析
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
`加载组件和指令 走不同的处理生成相似的数据; 【指令无模板数据，组件有模板数据】 `  
```

###### 2.1.1.4-getNonNormalizedDirectiveMetadata

```typescript
{`获取非标准指令元数据`
`directiveType`：组件及指令

getNonNormalizedDirectiveMetadata(directiveType: any):
      {annotation: Directive, metadata: cpl.CompileDirectiveMetadata}|null {
    directiveType = resolveForwardRef(directiveType);
    if (!directiveType) {
      return null;
    }
    let cacheEntry = this._nonNormalizedDirectiveCache.get(directiveType);
    if (cacheEntry) {
      return cacheEntry;
    }
      //获取当前指令的 annotations 和 父类的 annotations 合并成数组 [annotations, Parentannotations]返回
    const dirMeta = this._directiveResolver.resolve(directiveType, false);
    if (!dirMeta) {
      return null;
    }
    let nonNormalizedTemplateMetadata: cpl.CompileTemplateMetadata = undefined!;
//组件逻辑
    if (createComponent.isTypeOf(dirMeta)) {
      // component
      const compMeta = dirMeta as Component;
      assertArrayOfStrings('styles', compMeta.styles);
      assertArrayOfStrings('styleUrls', compMeta.styleUrls);
      assertInterpolationSymbols('interpolation', compMeta.interpolation);

      const animations = compMeta.animations;

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
    }

    let changeDetectionStrategy: ChangeDetectionStrategy = null!;
    let viewProviders: cpl.CompileProviderMetadata[] = [];
    let entryComponentMetadata: cpl.CompileEntryComponentMetadata[] = [];
    let selector = dirMeta.selector;
//组件逻辑
    if (createComponent.isTypeOf(dirMeta)) {
      // Component
      const compMeta = dirMeta as Component;
      changeDetectionStrategy = compMeta.changeDetection!;
      if (compMeta.viewProviders) {
        viewProviders = this._getProvidersMetadata(
            compMeta.viewProviders, entryComponentMetadata,
            `viewProviders for "${stringifyType(directiveType)}"`, [], directiveType);
      }
      if (compMeta.entryComponents) {
        entryComponentMetadata = flattenAndDedupeArray(compMeta.entryComponents)
                                     .map((type) => this._getEntryComponentMetadata(type)!)
                                     .concat(entryComponentMetadata);
      }
      if (!selector) {
        selector = this._schemaRegistry.getDefaultComponentElementName();
      }
    } else {
      // Directive
      if (!selector) {
        selector = null!;
      }
    }

    let providers: cpl.CompileProviderMetadata[] = [];
    if (dirMeta.providers != null) {
      providers = this._getProvidersMetadata(
          dirMeta.providers, entryComponentMetadata,
          `providers for "${stringifyType(directiveType)}"`, [], directiveType);
    }
    let queries: cpl.CompileQueryMetadata[] = [];
    let viewQueries: cpl.CompileQueryMetadata[] = [];
     //如果配置查询 生成 普通查询和视图查询：[{selector,first,descendants,propertyName,read,static}]
    if (dirMeta.queries != null) {
      queries = this._getQueriesMetadata(dirMeta.queries, false, directiveType);
      viewQueries = this._getQueriesMetadata(dirMeta.queries, true, directiveType);
    }

    const metadata = cpl.CompileDirectiveMetadata.create({
      isHost: false,
      selector: selector,
      exportAs: noUndefined(dirMeta.exportAs),
      isComponent: !!nonNormalizedTemplateMetadata,
      type: this._getTypeMetadata(directiveType),
      template: nonNormalizedTemplateMetadata,【组件的模板相关数据,template，style，】
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
       //规范化的指令元数据【2.1.1.3】 
      rendererType: nonNormalizedTemplateMetadata ? this.getDirectiveMetadata(directiveType) : null,
        //
      componentFactory: null
    });
    if (nonNormalizedTemplateMetadata) {
      metadata.componentFactory =
          this.getComponentFactory(selector, directiveType, metadata.inputs, metadata.outputs);
    }
    cacheEntry = {metadata, annotation: dirMeta};
    this._nonNormalizedDirectiveCache.set(directiveType, cacheEntry);
    return cacheEntry;
  }
`最终返回 { 经过处理的指令元数据 metadata, 当前组件的annotation }`
const metadata = cpl.CompileDirectiveMetadata.create({
      isHost: false,
      selector: selector,
      exportAs: noUndefined(dirMeta.exportAs),
      isComponent: !!nonNormalizedTemplateMetadata,   //组件/指令 标志
      type: this._getTypeMetadata(directiveType),     // 
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
      componentFactory: nonNormalizedTemplateMetadata ? 
    			this.getComponentFactory(selector, directiveType, metadata.inputs, metadata.outputs)
    			:null
    });
`componentViewType`：代理类？？【2.1.0-getComponentViewClass】
`rendererType`:{},将空对象作为代理，后续编译会填充？？？？【2.1.1.6-getRendererType】
`componentFactory`:{
    selector,      //组件选择器
    componentType, //组件类class
    _inputs,       //组件的inputs
    _outputs,      //组件的outputs
    ngContentSelectors:[]    
    viewDefFactory:【类似 componentViewType 的代理类？？？】
}}
```

###### 2.1.1.5-getComponentViewClass

```typescript
private getComponentViewClass(dirType: any): StaticSymbol|cpl.ProxyClass {
    return this.getGeneratedClass(dirType, cpl.viewClassName(dirType, 0));
  }

function viewClassName(compType: any, embeddedTemplateIndex: number): string {
  return `View_${identifierName({reference: compType})}_${embeddedTemplateIndex}`;
}

function identifierName(compileIdentifier: CompileIdentifierMetadata|null|undefined): string|
    null {
  if (!compileIdentifier || !compileIdentifier.reference) {
    return null;
  }
  const ref = compileIdentifier.reference;
  if (ref instanceof StaticSymbol) {
    return ref.name;
  }
  if (ref['__anonymousType']) {
    return ref['__anonymousType'];
  }
  let identifier = stringify(ref);
  if (identifier.indexOf('(') >= 0) {
    // case: anonymous functions!
    identifier = `anonymous_${_anonymousTypeIndex++}`;
    ref['__anonymousType'] = identifier;
  } else {
    identifier = sanitizeIdentifier(identifier);
  }
  return identifier;
}
private getGeneratedClass(dirType: any, name: string): StaticSymbol|cpl.ProxyClass {
    if (dirType instanceof StaticSymbol) {
      return this._staticSymbolCache.get(ngfactoryFilePath(dirType.filePath), name);
    } else {
      return this._createProxyClass(dirType, name);
    }
  }

private _createProxyClass(baseType: any, name: string): cpl.ProxyClass {
    let delegate: any = null;
    const proxyClass: cpl.ProxyClass = <any>function(this: unknown) {
      if (!delegate) {
        throw new Error(
            `Illegal state: Class ${name} for type ${stringify(baseType)} is not compiled yet!`);
      }
      return delegate.apply(this, arguments);
    };
    proxyClass.setDelegate = (d) => {
      delegate = d;
      (<any>proxyClass).prototype = d.prototype;
    };
    // Make stringify work correctly
    (<any>proxyClass).overriddenName = name;
    return proxyClass;
  }
`最终返回的是 proxyClass`
```

###### 2.1.1.6-getRendererType

```typescript
  private getRendererType(dirType: any): StaticSymbol|object {
    if (dirType instanceof StaticSymbol) {
      return this._staticSymbolCache.get(
          ngfactoryFilePath(dirType.filePath), cpl.rendererTypeName(dirType));
    } else {
      // returning an object as proxy,
      // that we fill later during runtime compilation.
      return <any>{};
    }
  }
```

###### 2.1.1.7-getComponentFactory

```typescript
  private getComponentFactory(
      selector: string, dirType: any, inputs: {[key: string]: string}|null,
      outputs: {[key: string]: string}): StaticSymbol|object {
    if (dirType instanceof StaticSymbol) {
      return this._staticSymbolCache.get(
          ngfactoryFilePath(dirType.filePath), cpl.componentFactoryName(dirType));
    } else {
      const hostView = this.getHostComponentViewClass(dirType);
      // Note: ngContentSelectors will be filled later once the template is
      // loaded.
        //返回 createComponentFactory函数 ，调用
        //new ComponentFactory_(selector, componentType, viewDefFactory, inputs, outputs, ngContentSelectors)
      const createComponentFactory =
          this._reflector.resolveExternalReference(Identifiers.createComponentFactory);
      return createComponentFactory(selector, dirType, <any>hostView, inputs, outputs, []);
    }
  }
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
`编译反射器`
{provide: CompileReflector, useValue: new JitReflector()},
用的是JitReflector实例
`见附录 CompileReflector依赖`
```

##### 2.1.4-ReflectionCapabilities

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

#### 2.2-_compileComponents（第二步编译组件）

```typescript
`编译组件` 
@params mainModule: 组件class
@params allComponentFactories: null

_compileComponents(mainModule: Type, allComponentFactories: object[]|null) {
    const ngModule = this._metadataResolver.getNgModuleMetadata(mainModule)!;
    const moduleByJitDirective = new Map<any, CompileNgModuleMetadata>();
    const templates = new Set<CompiledTemplate>();
//编译依赖模块中的组件【只处理JIT,过滤AOT】,将结果存储到 templates中；transJitModules只有当前模块
    const transJitModules = this._filterJitIdentifiers(ngModule.transitiveModule.modules);
    transJitModules.forEach((localMod) => {
        //在 _loadModules 步骤已经处理过，因此拿缓存
      const localModuleMeta = this._metadataResolver.getNgModuleMetadata(localMod)!;
      this._filterJitIdentifiers(localModuleMeta.declaredDirectives).forEach((dirRef) => {
          //存储 指令->模块 的映射关系
        moduleByJitDirective.set(dirRef, localModuleMeta);
          //dirMeta 是 2.1.1.3中 【normalizedDirMeta】 在 _loadModules 步骤已经处理过，因此拿缓存
        const dirMeta = this._metadataResolver.getDirectiveMetadata(dirRef);
        if (dirMeta.isComponent) {
            //编译组件并收集到templates【CompiledTemplate实例2.2.1】
          templates.add(this._createCompiledTemplate(dirMeta, localModuleMeta));
            //编译组件不走
          if (allComponentFactories) {
            const template =
                this._createCompiledHostTemplate(dirMeta.type.reference, localModuleMeta);
            templates.add(template);
            allComponentFactories.push(dirMeta.componentFactory as object);
          }
        }
      });
    });
//编译 entryComponentType   
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
    templates.forEach((template) => this._compileTemplate(template));【调用2.2.3，循环处理 template】
  }
`ngModule 和2.1.1相同，获取参数`
`过滤掉AOT，将组件保存到 tenplates`
templates:[2.2.2, 2.2.1.0]  【一种是指令元数据，一种是entryComponents主视图元数据】
`dirMeta 是 2.1.3中 【normalizedDirMeta】`
调用2.2.3，循环处理 template
```

##### 2.2.1-_createCompiledTemplate【编译普通指令】

```typescript
@params compMeta:组件元数据，是 2.1.1.3中 【normalizedDirMeta】
@params ngModule:组件所在的模块的元数据

private _createCompiledTemplate(
      compMeta: CompileDirectiveMetadata, ngModule: CompileNgModuleMetadata): CompiledTemplate {
    let compiledTemplate = this._compiledTemplateCache.get(compMeta.type.reference);
    if (!compiledTemplate) {
      assertComponent(compMeta);
      compiledTemplate = new CompiledTemplate(
          false, compMeta.type, compMeta, ngModule, ngModule.transitiveModule.directives);
      this._compiledTemplateCache.set(compMeta.type.reference, compiledTemplate);
    }
    return compiledTemplate;
  }
`返回 CompiledTemplate 实例【2.2.2】`
```

###### 2.2.1.0-_createCompiledHostTemplate【编译entrycomponent】

```typescript
  private _createCompiledHostTemplate(compType: Type, ngModule: CompileNgModuleMetadata):
      CompiledTemplate {
    if (!ngModule) {
      throw new Error(`Component ${
          stringify(
              compType)} is not part of any NgModule or the module has not been imported into your module.`);
    }
    let compiledTemplate = this._compiledHostTemplateCache.get(compType);
    if (!compiledTemplate) {
        //指令元数据
      const compMeta = this._metadataResolver.getDirectiveMetadata(compType);
      assertComponent(compMeta);
		//主视图指令元数据
      const hostMeta = this._metadataResolver.getHostComponentMetadata(
          compMeta, (compMeta.componentFactory as any).viewDefFactory);
      compiledTemplate =
          new CompiledTemplate(true, compMeta.type, hostMeta, ngModule, [compMeta.type]);
      this._compiledHostTemplateCache.set(compType, compiledTemplate);
    }
    return compiledTemplate;
  }
```

###### 2.2.1.1-getHostComponentMetadata

```typescript
  getHostComponentMetadata(
      compMeta: cpl.CompileDirectiveMetadata,
      hostViewType?: StaticSymbol|cpl.ProxyClass): cpl.CompileDirectiveMetadata {
      //代理类
    const hostType = this.getHostComponentType(compMeta.type.reference);
    if (!hostViewType) {
      hostViewType = this.getHostComponentViewClass(hostType);
    }
    // Note: ! is ok here as this method should only be called with normalized directive
    // metadata, which always fills in the selector.
      //生成 `<${tagName}${classAttr}${attrs}></${tagName}>`
    const template = CssSelector.parse(compMeta.selector!)[0].getMatchingElementTemplate();
    const templateUrl = '';
      //生成 AST【附录-HtmlParser解析器】
    const htmlAst = this._htmlParser.parse(template, templateUrl);
    return cpl.CompileDirectiveMetadata.create({
      isHost: true,
      type: {reference: hostType, diDeps: [], lifecycleHooks: []},
      template: new cpl.CompileTemplateMetadata({
        encapsulation: ViewEncapsulation.None,
        template,
        templateUrl,
        htmlAst,
        styles: [],
        styleUrls: [],
        ngContentSelectors: [],
        animations: [],
        isInline: true,
        externalStylesheets: [],
        interpolation: null,
        preserveWhitespaces: false,
      }),
      exportAs: null,
      changeDetection: ChangeDetectionStrategy.Default,
      inputs: [],
      outputs: [],
      host: {},
      isComponent: true,
      selector: '*',
      providers: [],
      viewProviders: [],
      queries: [],
      guards: {},
      viewQueries: [],
      componentViewType: hostViewType,
      rendererType: {id: '__Host__', encapsulation: ViewEncapsulation.None, styles: [], data: {}} as
          object,
      entryComponents: [],
      componentFactory: null
    });
  }
`entryComponent 生成的指令元数据`
```



##### 2.2.2-CompiledTemplate【第二部终运行 compiled】

```typescript
@params isHost:false【是否是主视图,entryComponents中的指令为true】
@params compType:{reference: 模块class,diDeps: 依赖,lifecycleHooks: 生命周期}
@params compMeta:组件元数据，是 2.1.1.3中 【normalizedDirMeta】
@params ngModule:组件所在的模块的元数据
@params directives:组件所在的模块的指令


class CompiledTemplate {
  private _viewClass: Function = null!;
  isCompiled = false;
  constructor(
      public isHost: boolean, public compType: CompileIdentifierMetadata,
      public compMeta: CompileDirectiveMetadata, public ngModule: CompileNgModuleMetadata,
      public directives: CompileIdentifierMetadata[]) {}

  compiled(viewClass: Function, rendererType: any) {
    this._viewClass = viewClass;
    (<ProxyClass>this.compMeta.componentViewType).setDelegate(viewClass);
    for (let prop in rendererType) {
      (<any>this.compMeta.rendererType)[prop] = rendererType[prop];
    }
    this.isCompiled = true;
  }
}
`返回实例`：{
    _viewClass:null,
    isCompiled:false
    isHost：false,
    compType: 组件class【是 2.1.3中 normalizedDirMeta.type】,{reference:组件}
    compMeta: 组件编译数据【是 2.1.3中 normalizedDirMeta】
    ngModule: 组件所属模块
    directives: 组件模块的指令/管道/组件
}
2.2.3调用 compiled 函数，传入参数，调整实例数据。
```

##### 2.2.3-_compileTemplate

```typescript
`编译模板`：传入的参数是2.2.3返回的实例
`compMeta.template`是 【是 2.1.1.3中 templateMeta】
@params template: 2.2.2实例;

  private _compileTemplate(template: CompiledTemplate) {
    if (template.isCompiled) {
      return;
    }
    const compMeta = template.compMeta;【组件编译数据，是 2.1.3中 normalizedDirMeta】
    //外部样式表和模块url的映射
    const externalStylesheetsByModuleUrl = new Map<string, CompiledStylesheet>();
      //2.2.3.1的返回值
    const outputContext = createOutputContext();【2.2.3.1】
      //【见附录StyleCompiler】返回 【CompiledStylesheet】 实例
    const componentStylesheet = this._styleCompiler.compileComponent(outputContext, compMeta);
      
    compMeta.template !.externalStylesheets.forEach((stylesheetMeta) => {
      const compiledStylesheet =
          this._styleCompiler.compileStyles(createOutputContext(), compMeta, stylesheetMeta);
      externalStylesheetsByModuleUrl.set(stylesheetMeta.moduleUrl!, compiledStylesheet);
    });
      //将 externalStylesheetsByModuleUrl 存到 componentStylesheet
    this._resolveStylesCompileResult(componentStylesheet, externalStylesheetsByModuleUrl);
      
    const pipes = template.ngModule.transitiveModule.pipes.map(
        pipe => this._metadataResolver.getPipeSummary(pipe.reference));
      //编译模板【附录_parseTemplate】
    const {template: parsedTemplate, pipes: usedPipes} =
        this._parseTemplate(compMeta, template.ngModule, template.directives);
      // 生成 ViewCompileResult 实例 
      // {viewClassVar: `View_组件名_数字`, rendererTypeVar: {name:`RenderType_组件名`,builtin:null}}
    const compileResult = this._viewCompiler.compileComponent(
        outputContext, compMeta, parsedTemplate, ir.variable(componentStylesheet.stylesVar),
        usedPipes);
      // templateJitUrl 生成 url==> 'ng:///模块名称/组件名称.ngfactory.js'
      // _viewCompiler 见2.2.3.2; 运行函数的返回值
    const evalResult = this._interpretOrJit(
        templateJitUrl(template.ngModule.type, template.compMeta), outputContext.statements);
    const viewClass = evalResult[compileResult.viewClassVar]; 【代理类】
    const rendererType = evalResult[compileResult.rendererTypeVar];
    template.compiled(viewClass, rendererType);
  }
`运行_interpretOrJit函数【2.2.3.2】`
`最终运行的是 2.2.2-CompiledTemplate 中的compiled函数`传入两个参数，填充实例
```

###### 2.2.3.1-createOutputContext

```typescript
function createOutputContext(): OutputContext {
  const importExpr = (symbol: any) =>
      ir.importExpr({name: identifierName(symbol), moduleName: null, runtime: symbol});
  return {statements: [], genFilePath: '', importExpr, constantPool: new ConstantPool()};
}
ir.importExpr = export function importExpr(
    id: ExternalReference, typeParams: Type[]|null = null,
    sourceSpan?: ParseSourceSpan|null): ExternalExpr {
  return new ExternalExpr(id, null, typeParams, sourceSpan);
}
class ExternalExpr{
  constructor(
      public value: ExternalReference, type?: Type|null, public typeParams: Type[]|null = null,
      sourceSpan?: ParseSourceSpan|null) {
    super(type, sourceSpan);
  }
}

`返回值`:
export interface OutputContext {
  genFilePath: string;
  statements: o.Statement[];
  constantPool: ConstantPool; //常数池？？？
  importExpr(reference: any, typeParams?: o.Type[]|null, useSummaries?: boolean): o.Expression;
}
```

###### 2.2.3.2-_interpretOrJit【属于 JitCompiler 类】

```typescript
  private _interpretOrJit(sourceUrl: string, statements: ir.Statement[]): any {
    if (!this._compilerConfig.useJit) {
      return interpretStatements(statements, this._reflector);
    } else {
      return this._jitEvaluator.evaluateStatements(
          sourceUrl, statements, this._reflector, this._compilerConfig.jitDevMode);
    }
  }
`//--->执行【_jitEvaluator.evaluateStatements】`
  evaluateStatements(
      sourceUrl: string, statements: o.Statement[], reflector: CompileReflector,
      createSourceMaps: boolean): {[key: string]: any} {
    const converter = new JitEmitterVisitor(reflector);【2.2.3.3】
    const ctx = EmitterVisitorContext.createRoot();【2.2.3.4】
    // Ensure generated code is in strict mode
    if (statements.length > 0 && !isUseStrictStatement(statements[0])) {
      statements = [
        o.literal('use strict').toStmt(),
        ...statements,
      ];
    }
    converter.visitAllStatements(statements, ctx);【JitEmitterVisitor 父函数 2.2.3.6】
    converter.createReturnStmt(ctx);
    return this.evaluateCode(sourceUrl, ctx, converter.getArgs(), createSourceMaps);//运行函数
  }
`converter`：2.2.3.3实例：{
    private _evalArgNames: string[] = [];
    private _evalArgValues: any[] = [];
    private _evalExportedVars: string[] = [];
    _escapeDollarInStrings:false【继承自父】
}
`ctx`：2.2.3.4返回值：{
    _lines:[{
      partsLength = 0;
      parts: string[] = [];
      srcSpans: (ParseSourceSpan|null)[] = [];
      indent：传入值
}]
}
`给函数添加严格环境`

`生成并运行函数; 返回有value格式的内容`
 evaluateCode(
      sourceUrl: string, ctx: EmitterVisitorContext, vars: {[key: string]: any},
      createSourceMap: boolean): any {
    let fnBody = `"use strict";${ctx.toSource()}\n//# sourceURL=${sourceUrl}`;
    const fnArgNames: string[] = [];
    const fnArgValues: any[] = [];
    for (const argName in vars) {
      fnArgValues.push(vars[argName]);
      fnArgNames.push(argName);
    }
    if (createSourceMap) {
      // using `new Function(...)` generates a header, 1 line of no arguments, 2 lines otherwise
      // E.g. ```
      // function anonymous(a,b,c
      // /**/) { ... }```
      // We don't want to hard code this fact, so we auto detect it via an empty function first.
      const emptyFn = newTrustedFunctionForJIT(...fnArgNames.concat('return null;')).toString();
      const headerLines = emptyFn.slice(0, emptyFn.indexOf('return null;')).split('\n').length - 1;
      fnBody += `\n${ctx.toSourceMapGenerator(sourceUrl, headerLines).toJsComment()}`;
    }
    const fn = newTrustedFunctionForJIT(...fnArgNames.concat(fnBody));
    return this.executeFunction(fn, fnArgValues);
  }
```

###### 2.2.3.3-JitEmitterVisitor

```typescript
`将AST节点数据转换为 javascript代码 `
生成实例：{
    private _evalArgNames: string[] = [];
    private _evalArgValues: any[] = [];
    private _evalExportedVars: string[] = [];
    _escapeDollarInStrings:false【继承自父】
}
```

###### 2.2.3.4-EmitterVisitorContext

```typescript
export class EmitterVisitorContext {
  static createRoot(): EmitterVisitorContext {
    return new EmitterVisitorContext(0);
  }
      constructor(private _indent: number) {
    this._lines = [new _EmittedLine(_indent)];
  }
}   
返回:[2.2.3.5]
```

###### 2.2.3.5-_EmittedLine

```typescript
class _EmittedLine {
  partsLength = 0;
  parts: string[] = [];
  srcSpans: (ParseSourceSpan|null)[] = [];
  constructor(public indent: number) {}
}
`返回`{
      partsLength = 0;
      parts: string[] = [];
      srcSpans: (ParseSourceSpan|null)[] = [];
      indent：传入值
}
```

###### 2.2.3.6-visitAllStatements

```typescript
  visitAllStatements(statements: o.Statement[], ctx: EmitterVisitorContext): void {
    statements.forEach((stmt) => stmt.visitStatement(this, ctx));
  }
`statements 循环执行`visitor.visitReturnStmt(this, context);  
```

###### 2.2.3.7-_parseTemplate【JitCompiler类属性】

```typescript
  private _parseTemplate(
      compMeta: CompileDirectiveMetadata, ngModule: CompileNgModuleMetadata,
      directiveIdentifiers: CompileIdentifierMetadata[]):
      {template: TemplateAst[], pipes: CompilePipeSummary[]} {
    // Note: ! is ok here as components always have a template.
    const preserveWhitespaces = compMeta.template !.preserveWhitespaces;
    const directives =
        directiveIdentifiers.map(dir => this._metadataResolver.getDirectiveSummary(dir.reference));
    const pipes = ngModule.transitiveModule.pipes.map(
        pipe => this._metadataResolver.getPipeSummary(pipe.reference));
    return this._templateParser.parse(
        compMeta, compMeta.template !.htmlAst!, directives, pipes, ngModule.schemas,
        templateSourceUrl(ngModule.type, compMeta, compMeta.template !), preserveWhitespaces);
  }
```



#### 2.3-_compileModule(第二步的返回值)

```typescript
  private _compileModule(moduleType: Type): object {
    let ngModuleFactory = this._compiledNgModuleCache.get(moduleType)!;
    if (!ngModuleFactory) {
      const moduleMeta = this._metadataResolver.getNgModuleMetadata(moduleType)!;
      // Always provide a bound Compiler
      const extraProviders = this.getExtraNgModuleProviders(moduleMeta.type.reference);
        
      const outputCtx = createOutputContext();【2.2.3.1】
        //【附录模块编译器】生成{ngModuleFactoryVar}
      const compileResult = this._ngModuleCompiler.compile(outputCtx, moduleMeta, extraProviders);
        
      ngModuleFactory = this._interpretOrJit(
          ngModuleJitUrl(moduleMeta), outputCtx.statements)[compileResult.ngModuleFactoryVar];
      this._compiledNgModuleCache.set(moduleMeta.type.reference, ngModuleFactory);
    }
    return ngModuleFactory;
  }
`获取 ngModuleFactory【无缓存就生成 ngModuleFactory】`
`moduleMeta 是模块的元数据【2.1.1.2步骤】`
`extraProviders` Compiler的 provider【？？？？？】
`compileResult` 用到【2.3.2-NgModuleCompiler】
`ngModuleJitUrl(moduleMeta)` 是 `ng:///` + `${identifierName(moduleMeta.type)}/module.ngfactory.js`

最终返回 {key：value}映射后获取其中的value。key为模块名
```

##### 2.3.1-_interpretOrJit

```typescript
`sourceUrl`: `ng:///` + `${identifierName(moduleMeta.type)}/module.ngfactory.js`
private _interpretOrJit(sourceUrl: string, statements: ir.Statement[]): any {
    if (!this._compilerConfig.useJit) {
      return interpretStatements(statements, this._reflector);
    } else {
      return this._jitEvaluator.evaluateStatements(
          sourceUrl, statements, this._reflector, this._compilerConfig.jitDevMode);
    }
  }
```

###### 2.3.1.1-_jitEvaluator

```typescript
class JitEvaluator{
      evaluateStatements(
          sourceUrl: string, statements: o.Statement[], reflector: CompileReflector,
          createSourceMaps: boolean): {[key: string]: any} {
              
        const converter = new JitEmitterVisitor(reflector);
        const ctx = EmitterVisitorContext.createRoot();
        // Ensure generated code is in strict mode
        if (statements.length > 0 && !isUseStrictStatement(statements[0])) {
          statements = [
            o.literal('use strict').toStmt(),
            ...statements,
          ];
        }
        converter.visitAllStatements(statements, ctx);
        converter.createReturnStmt(ctx);
        return this.evaluateCode(sourceUrl, ctx, converter.getArgs(), createSourceMaps);
      }
}
```

##### 



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

#### JitCompiler【本模块关于编译都是这个class】

##### _parseTemplate

```typescript
@params compMeta:
@params ngModule
@params directiveIdentifiers

	private _parseTemplate(
      compMeta: CompileDirectiveMetadata, ngModule: CompileNgModuleMetadata,
      directiveIdentifiers: CompileIdentifierMetadata[]):
      {template: TemplateAst[], pipes: CompilePipeSummary[]} {
    // Note: ! is ok here as components always have a template.
    const preserveWhitespaces = compMeta.template !.preserveWhitespaces;//是否移除空白符
          //指令摘要集合
    const directives =
        directiveIdentifiers.map(dir => this._metadataResolver.getDirectiveSummary(dir.reference));
          //管道摘要集合
    const pipes = ngModule.transitiveModule.pipes.map(
        pipe => this._metadataResolver.getPipeSummary(pipe.reference));
    return this._templateParser.parse(
        compMeta, compMeta.template !.htmlAst!, directives, pipes, ngModule.schemas,
        templateSourceUrl(ngModule.type, compMeta, compMeta.template !), preserveWhitespaces);
  }
`用到了 _templateParser依赖【TemplateParser】`
```

##### TemplateParser

```typescript
@params  component: CompileDirectiveMetadata, 
@params  template: string|ParseTreeResult,
@params  directives: CompileDirectiveSummary[],
@params  pipes: CompilePipeSummary[], 
@params  schemas: SchemaMetadata[],
@params  templateUrl: string,
@params  preserveWhitespaces: boolean

class TemplateParser{
    parse(
      component: CompileDirectiveMetadata, template: string|ParseTreeResult,
      directives: CompileDirectiveSummary[], pipes: CompilePipeSummary[], schemas: SchemaMetadata[],
      templateUrl: string,
      preserveWhitespaces: boolean): {template: t.TemplateAst[], pipes: CompilePipeSummary[]} {
    const result = this.tryParse(
        component, template, directives, pipes, schemas, templateUrl, preserveWhitespaces);
    return {template: result.templateAst!, pipes: result.usedPipes!};
  }  
    tryParse(
      component: CompileDirectiveMetadata, template: string|ParseTreeResult,
      directives: CompileDirectiveSummary[], pipes: CompilePipeSummary[], schemas: SchemaMetadata[],
      templateUrl: string, preserveWhitespaces: boolean): TemplateParseResult {
    let htmlParseResult = typeof template === 'string' ?
        this._htmlParser!.parse(template, templateUrl, {
          tokenizeExpansionForms: true,
          interpolationConfig: this.getInterpolationConfig(component)
        }) :
        template;

    if (!preserveWhitespaces) {
      htmlParseResult = removeWhitespaces(htmlParseResult);
    }

    return this.tryParseHtml(
        this.expandHtml(htmlParseResult), component, directives, pipes, schemas);
  }  
   tryParseHtml(
      htmlAstWithErrors: ParseTreeResult, component: CompileDirectiveMetadata,
      directives: CompileDirectiveSummary[], pipes: CompilePipeSummary[],
      schemas: SchemaMetadata[]): TemplateParseResult {
    let result: t.TemplateAst[];
    const errors = htmlAstWithErrors.errors;
    const usedPipes: CompilePipeSummary[] = [];
    if (htmlAstWithErrors.rootNodes.length > 0) {
        //去除重复的指令的管道
      const uniqDirectives = removeSummaryDuplicates(directives);
      const uniqPipes = removeSummaryDuplicates(pipes);
        //生成ProviderViewContext实例👇 :
        //{viewQueries: Map<any, QueryWithId[]>,viewProviders: Map<any, boolean>}
      const providerViewContext = new ProviderViewContext(this._reflector, component);
      let interpolationConfig: InterpolationConfig = undefined!;
        //提取插值表达式配置符号
      if (component.template && component.template.interpolation) {
        interpolationConfig = {
          start: component.template.interpolation[0],
          end: component.template.interpolation[1]
        };
      }
        //解析模板和指令区域内的绑定值
      const bindingParser = new BindingParser(
          this._exprParser, interpolationConfig!, this._schemaRegistry, uniqPipes, errors);
        
      const parseVisitor = new TemplateParseVisitor(
          this._reflector, this._config, providerViewContext, uniqDirectives, bindingParser,
          this._schemaRegistry, schemas, errors);
      result = html.visitAll(parseVisitor, htmlAstWithErrors.rootNodes, EMPTY_ELEMENT_CONTEXT);
      errors.push(...providerViewContext.errors);
      usedPipes.push(...bindingParser.getUsedPipes());
    } else {
      result = [];
    }
    this._assertNoReferenceDuplicationOnTemplate(result, errors);

    if (errors.length > 0) {
      return new TemplateParseResult(result, usedPipes, errors);
    }

    if (this.transforms) {
      this.transforms.forEach((transform: t.TemplateAstVisitor) => {
        result = t.templateVisitAll(transform, result);
      });
    }

    return new TemplateParseResult(result, usedPipes, errors);
  }
}
`返回 TemplateParseResult实例`:{
    templateAst?: t.TemplateAst[], 
    usedPipes?: CompilePipeSummary[],
    errors?: ParseError[]
}
```

###### ProviderViewContext

```typescript
export class ProviderViewContext {
  /**
   * @internal
   */
  viewQueries: Map<any, QueryWithId[]>;
  /**
   * @internal
   */
  viewProviders: Map<any, boolean>;
  errors: ProviderError[] = [];

  constructor(public reflector: CompileReflector, public component: CompileDirectiveMetadata) {
    this.viewQueries = _getViewQueries(component);
    this.viewProviders = new Map<any, boolean>();
    component.viewProviders.forEach((provider) => {
      if (this.viewProviders.get(tokenReference(provider.token)) == null) {
        this.viewProviders.set(tokenReference(provider.token), true);
      }
    });
  }
}
function _getViewQueries(component: CompileDirectiveMetadata): Map<any, QueryWithId[]> {
  // Note: queries start with id 1 so we can use the number in a Bloom filter!
  let viewQueryId = 1;
  const viewQueries = new Map<any, QueryWithId[]>();
  if (component.viewQueries) {
    component.viewQueries.forEach(
        (query) => _addQueryToTokenMap(viewQueries, {meta: query, queryId: viewQueryId++}));
  }
  return viewQueries;
}
```



#### compiler依赖

```typescript
const COMPILER_PROVIDERS__PRE_R3__ = <StaticProvider[]>[
    //编译反射器
  {provide: CompileReflector, useValue: new JitReflector()},
    //资源加载器
  {provide: ResourceLoader, useValue: _NO_RESOURCE_LOADER},
    //JIT摘要解析器
  {provide: JitSummaryResolver, deps: []},
    //摘要解析器
  {provide: SummaryResolver, useExisting: JitSummaryResolver},
  {provide: Console, deps: []},
    //语法解析器
  {provide: Lexer, deps: []},
  {provide: Parser, deps: [Lexer]},
    //基本的HTML解析器
  {
    provide: baseHtmlParser,
    useClass: HtmlParser,
    deps: [],
  },
    // 国际化的HTML解析器
  {
    provide: I18NHtmlParser,
    useFactory:
        (parser: HtmlParser, translations: string|null, format: string, config: CompilerConfig,
         console: Console) => {
          translations = translations || '';
          const missingTranslation =
              translations ? config.missingTranslation! : MissingTranslationStrategy.Ignore;
          return new I18NHtmlParser(parser, translations, format, missingTranslation, console);
        },
    deps: [
      baseHtmlParser,
      [new Optional(), new Inject(TRANSLATIONS)],
      [new Optional(), new Inject(TRANSLATIONS_FORMAT)],
      [CompilerConfig],
      [Console],
    ]
  },
  {
    provide: HtmlParser,
    useExisting: I18NHtmlParser,
  },
    // 模板解析器
  {
    provide: TemplateParser,
    deps: [CompilerConfig, CompileReflector, Parser, ElementSchemaRegistry, I18NHtmlParser, Console]
  },
  {provide: JitEvaluator, useClass: JitEvaluator, deps: []},
    // 指令规范器
  {provide: DirectiveNormalizer, deps: [ResourceLoader, UrlResolver, HtmlParser, CompilerConfig]},
  {
    provide: CompileMetadataResolver,
    deps: [
      CompilerConfig, HtmlParser, NgModuleResolver, DirectiveResolver, PipeResolver,
      SummaryResolver, ElementSchemaRegistry, DirectiveNormalizer, Console,
      [Optional, StaticSymbolCache], CompileReflector, [Optional, ERROR_COLLECTOR_TOKEN]
    ]
  },
  DEFAULT_PACKAGE_URL_PROVIDER,
    // 样式编译器
  {provide: StyleCompiler, deps: [UrlResolver]},
    // view 编译器
  {provide: ViewCompiler, deps: [CompileReflector]},
    // NgModule编译器
  {provide: NgModuleCompiler, deps: [CompileReflector]},
    // 注编译器配置
  {provide: CompilerConfig, useValue: new CompilerConfig()},
    // 编译器
  {
    provide: Compiler,
    useClass: CompilerImpl,
    deps: [
      Injector, CompileMetadataResolver, TemplateParser, StyleCompiler, ViewCompiler,
      NgModuleCompiler, SummaryResolver, CompileReflector, JitEvaluator, CompilerConfig, Console
    ]
  },
    // DOM schema
  {provide: DomElementSchemaRegistry, deps: []},
    // Element schema
  {provide: ElementSchemaRegistry, useExisting: DomElementSchemaRegistry},
    // URL解析器
  {provide: UrlResolver, deps: [PACKAGE_ROOT_URL]},
    // 指令解析器
  {provide: DirectiveResolver, deps: [CompileReflector]},
    // 管道解析器
  {provide: PipeResolver, deps: [CompileReflector]},
    // 模块解析器
  {provide: NgModuleResolver, deps: [CompileReflector]},
];
{
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
      }
```

##### CompileMetadataResolver【元数据解析器】

```typescript
class CompileMetadataResolver{
  private _nonNormalizedDirectiveCache =
      new Map<Type, {annotation: Directive, metadata: cpl.CompileDirectiveMetadata}>(); //非标准指令缓存 
  private _directiveCache = new Map<Type, cpl.CompileDirectiveMetadata>();              // 指令->元数据 缓存
  private _summaryCache = new Map<Type, cpl.CompileTypeSummary|null>();                 //摘要->摘要 缓存
  private _pipeCache = new Map<Type, cpl.CompilePipeMetadata>();                        // 管道->元数据 缓存
  private _ngModuleCache = new Map<Type, cpl.CompileNgModuleMetadata>();                //模块->元数据 缓存
  private _ngModuleOfTypes = new Map<Type, Type>();
  private _shallowModuleCache = new Map<Type, cpl.CompileShallowModuleMetadata>();

  constructor(
      private _config: CompilerConfig, private _htmlParser: HtmlParser,
      private _ngModuleResolver: NgModuleResolver, private _directiveResolver: DirectiveResolver,
      private _pipeResolver: PipeResolver, private _summaryResolver: SummaryResolver<any>,
      private _schemaRegistry: ElementSchemaRegistry,
      private _directiveNormalizer: DirectiveNormalizer, private _console: Console,
      private _staticSymbolCache: StaticSymbolCache, private _reflector: CompileReflector,
      private _errorCollector?: ErrorCollector) {}

}
 getNgModuleMetadata()函数【2.1.1】
```

##### NgModuleCompiler【模块编译器】

```typescript
class NgModuleCompiler{
      compile(
          ctx: OutputContext, ngModuleMeta: CompileNgModuleMetadata,
          extraProviders: CompileProviderMetadata[]): NgModuleCompileResult {
              //范围？？ 
        //生成{start:{file:{content:'',url:`in ${kind} ${identifierName(type)} in ${moduleUrl}`}},end,}
        const sourceSpan = typeSourceSpan('NgModule', ngModuleMeta.type);
              //获取模块的entryComponents，bootstrapComponents
        const entryComponentFactories = ngModuleMeta.transitiveModule.entryComponents;
        const bootstrapComponents = ngModuleMeta.bootstrapComponents;
              //解析provider,生成实例，存储provider数据
        const providerParser =
            new NgModuleProviderAnalyzer(this.reflector, ngModuleMeta, extraProviders, sourceSpan);
             //生成 [{fn,args:}]
        const providerDefs = [{fn:,args:componentFactoryResolverProviderDef返回值}]
            [componentFactoryResolverProviderDef(
                 this.reflector, ctx, NodeFlags.None, entryComponentFactories)]
                .concat(providerParser.parse().map((provider) => providerDef(ctx, provider)))
                .map(({providerExpr, depsExpr, flags, tokenExpr}) => {
                  return o.importExpr(Identifiers.moduleProviderDef).callFn([
                    o.literal(flags), tokenExpr, providerExpr, depsExpr
                  ]);
                });
			//生成模块def【？？？】
        const ngModuleDef = o.importExpr(Identifiers.moduleDef).callFn([o.literalArr(providerDefs)]);
              //函数表达式
        const ngModuleDefFactory =
            o.fn([new o.FnParam(LOG_VAR.name!)], [new o.ReturnStatement(ngModuleDef)], o.INFERRED_TYPE);

        const ngModuleFactoryVar = `${identifierName(ngModuleMeta.type)}NgFactory`;
        this._createNgModuleFactory(
            ctx, ngModuleMeta.type.reference, o.importExpr(Identifiers.createModuleFactory).callFn([
              ctx.importExpr(ngModuleMeta.type.reference),
              o.literalArr(bootstrapComponents.map(id => ctx.importExpr(id.reference))),
              ngModuleDefFactory
            ]));

        if (ngModuleMeta.id) {
          const id = typeof ngModuleMeta.id === 'string' ? o.literal(ngModuleMeta.id) :
                                                           ctx.importExpr(ngModuleMeta.id);
          const registerFactoryStmt = o.importExpr(Identifiers.RegisterModuleFactoryFn)
                                          .callFn([id, o.variable(ngModuleFactoryVar)])
                                          .toStmt();
          ctx.statements.push(registerFactoryStmt);
        }

        return new NgModuleCompileResult(ngModuleFactoryVar);
      }
}
```

###### componentFactoryResolverProviderDef

```typescript
export function componentFactoryResolverProviderDef(
    reflector: CompileReflector, ctx: OutputContext, flags: NodeFlags,
    entryComponents: CompileEntryComponentMetadata[]): {
  providerExpr: o.Expression,
  flags: NodeFlags,
  depsExpr: o.Expression,
  tokenExpr: o.Expression
} {
    //entryComponent的 componentFactory
  const entryComponentFactories =
      entryComponents.map((entryComponent) => ctx.importExpr(entryComponent.componentFactory));
    //生成 {identifier: {reference: ComponentFactoryResolver}}
  const token = createTokenForExternalReference(reflector, Identifiers.ComponentFactoryResolver);
  const classMeta = {
    diDeps: [
      {isValue: true, value: o.literalArr(entryComponentFactories)},
      {token: token, isSkipSelf: true, isOptional: true},
      {token: createTokenForExternalReference(reflector, Identifiers.NgModuleRef)},
    ],
    lifecycleHooks: [],
    reference: CodegenComponentFactoryResolver
  };
  const {providerExpr, flags: providerFlags, depsExpr} =
      singleProviderDef(ctx, flags, ProviderAstType.PrivateService, {
        token,
        multi: false,
        useClass: classMeta,
      });
  return {providerExpr, flags: providerFlags, depsExpr, tokenExpr: tokenExpr(ctx, token)};
}
`返回的数据是下层的`再加一个tokenExpr
```

###### singleProviderDef

```typescript

function singleProviderDef(
    ctx: OutputContext, flags: NodeFlags, providerType: ProviderAstType,
    providerMeta: CompileProviderMetadata):
    {providerExpr: o.Expression, flags: NodeFlags, depsExpr: o.Expression} {
  let providerExpr: o.Expression;
  let deps: CompileDiDependencyMetadata[];
  if (providerType === ProviderAstType.Directive || providerType === ProviderAstType.Component) {
    providerExpr = ctx.importExpr(providerMeta.useClass!.reference);
    flags |= NodeFlags.TypeDirective;
    deps = providerMeta.deps || providerMeta.useClass!.diDeps;
  } else {
    if (providerMeta.useClass) {
      providerExpr = ctx.importExpr(providerMeta.useClass.reference);
      flags |= NodeFlags.TypeClassProvider;
      deps = providerMeta.deps || providerMeta.useClass.diDeps;
    } else if (providerMeta.useFactory) {
      providerExpr = ctx.importExpr(providerMeta.useFactory.reference);
      flags |= NodeFlags.TypeFactoryProvider;
      deps = providerMeta.deps || providerMeta.useFactory.diDeps;
    } else if (providerMeta.useExisting) {
      providerExpr = o.NULL_EXPR;
      flags |= NodeFlags.TypeUseExistingProvider;
      deps = [{token: providerMeta.useExisting}];
    } else {
      providerExpr = convertValueToOutputAst(ctx, providerMeta.useValue);
      flags |= NodeFlags.TypeValueProvider;
      deps = [];
    }
  }
  const depsExpr = o.literalArr(deps.map(dep => depDef(ctx, dep)));
  return {providerExpr, flags, depsExpr};
}
`返回`：{
    providerExpr:CodegenComponentFactoryResolver
    flags:NodeFlags.TypeClassProvider,
    depsExpr:上层diDeps
}
```



###### NgModuleProviderAnalyzer【模块provider解析器】

```typescript
class NgModuleProviderAnalyzer {
   constructor(
      private reflector: CompileReflector, ngModule: CompileNgModuleMetadata,
      extraProviders: CompileProviderMetadata[], sourceSpan: ParseSourceSpan) {
    this._allProviders = new Map<any, ProviderAst>();
    ngModule.transitiveModule.modules.forEach((ngModuleType: CompileTypeMetadata) => {
      const ngModuleProvider = {token: {identifier: ngModuleType}, useClass: ngModuleType};
      _resolveProviders(
          [ngModuleProvider], ProviderAstType.PublicService, true, sourceSpan, this._errors,
          this._allProviders, /* isModule */ true);
    });
    _resolveProviders(
        ngModule.transitiveModule.providers.map(entry => entry.provider).concat(extraProviders),
        ProviderAstType.PublicService, false, sourceSpan, this._errors, this._allProviders,
        /* isModule */ false);
  }
}
循环解析模块；_resolveProviders,将生成的数据存储到 _allProviders<Map>:
{identifier: ngModuleType}：{
      token: CompileTokenMetadata,
      multiProvider: boolean,
      eager: boolean,
      providers: CompileProviderMetadata[], 
      providerType: ProviderAstType,
      lifecycleHooks: LifecycleHooks[], 
      sourceSpan: ParseSourceSpan,
      isModule: boolean
}
```

###### _resolveProviders【处理provider】

```typescript
function _resolveProviders(
    providers: CompileProviderMetadata[], providerType: ProviderAstType, eager: boolean,
    sourceSpan: ParseSourceSpan, targetErrors: ParseError[],
    targetProvidersByToken: Map<any, ProviderAst>, isModule: boolean) {
  providers.forEach((provider) => {
    let resolvedProvider = targetProvidersByToken.get(tokenReference(provider.token));
    if (resolvedProvider != null && !!resolvedProvider.multiProvider !== !!provider.multi) {
      targetErrors.push(new ProviderError(
          `Mixing multi and non multi provider is not possible for token ${
              tokenName(resolvedProvider.token)}`,
          sourceSpan));
    }
    if (!resolvedProvider) {
      const lifecycleHooks = provider.token.identifier &&
              (<CompileTypeMetadata>provider.token.identifier).lifecycleHooks ?
          (<CompileTypeMetadata>provider.token.identifier).lifecycleHooks :
          [];
      const isUseValue = !(provider.useClass || provider.useExisting || provider.useFactory);
      resolvedProvider = new ProviderAst(
          provider.token, !!provider.multi, eager || isUseValue, [provider], providerType,
          lifecycleHooks, sourceSpan, isModule);
      targetProvidersByToken.set(tokenReference(provider.token), resolvedProvider);
    } else {
      if (!provider.multi) {
        resolvedProvider.providers.length = 0;
      }
      resolvedProvider.providers.push(provider);
    }
  });
}
`解析provider中的模块，将解析结果【👇】存入targetProvidersByToken，也就是上层的_allProviders`
```

###### ProviderAst【provider生成的AST】

```typescript
export class ProviderAst implements TemplateAst {
  constructor(
      public token: CompileTokenMetadata, public multiProvider: boolean, public eager: boolean,
      public providers: CompileProviderMetadata[], public providerType: ProviderAstType,
      public lifecycleHooks: LifecycleHooks[], public sourceSpan: ParseSourceSpan,
      readonly isModule: boolean) {}

  visit(visitor: TemplateAstVisitor, context: any): any {
    // No visit method in the visitor for now...
    return null;
  }
}
```



##### DirectiveResolver【指令解析器】

```typescript
class DirectiveResolver{
    constructor(private _reflector: CompileReflector) {}
      resolve(type: Type): Directive;
      resolve(type: Type, throwIfNotFound: true): Directive;
      resolve(type: Type, throwIfNotFound: boolean): Directive|null;
      resolve(type: Type, throwIfNotFound = true): Directive|null {
        const typeMetadata = this._reflector.annotations(resolveForwardRef(type));
        if (typeMetadata) {
          const metadata = findLast(typeMetadata, isDirectiveMetadata);
          if (metadata) {
            const propertyMetadata = this._reflector.propMetadata(type);
            const guards = this._reflector.guards(type);
            return this._mergeWithPropertyMetadata(metadata, propertyMetadata, guards, type);
          }
        }

        if (throwIfNotFound) {
          throw new Error(`No Directive annotation found on ${stringify(type)}`);
        }

        return null;
      }
}
```

##### CompileReflector【编译反射器】，用到的是 JitReflector

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
  parameters(typeOrFunc: /*Type*/ any): any[][] {
    return this.reflectionCapabilities.parameters(typeOrFunc);
  }
    
  ......
}

`用到的函数 annotations ; 主要用到 ReflectionCapabilities实例的 annotations`【附录ReflectionCapabilities】
```

##### CompileMetadataResolver【编译元数据解析器】

```typescript
实例：_metadataResolver
`解析及缓存 模块/管道/指令/模块/摘要信息`
```

##### StyleCompiler【样式编译器】

```typescript
`shim`:设置组件样式的范围【样式隔离[只影响自身，默认], 样式不隔离[影响上下], 样式只影响子组件,】，有四种，通过设置组件的encapsulation值来配置
class StyleCompiler{
    compileComponent(outputCtx: OutputContext, comp: CompileDirectiveMetadata): CompiledStylesheet {
        const template = comp.template !;【2.1.1.3 中的 templateMetadata】
        return this._compileStyles(
            outputCtx, comp, new CompileStylesheetMetadata({
              styles: template.styles,
              styleUrls: template.styleUrls,
              moduleUrl: identifierModuleUrl(comp.type)
            }),
            this.needsStyleShim(comp), true);
      }
  private _compileStyles(
      outputCtx: OutputContext, comp: CompileDirectiveMetadata,
      stylesheet: CompileStylesheetMetadata, shim: boolean,
      isComponentStylesheet: boolean): CompiledStylesheet {
          //解析组件中 styles 数据 放入 【styleExpressions】
    const styleExpressions: o.Expression[] =
        stylesheet.styles.map(plainStyle => o.literal(this._shimIfNeeded(plainStyle, shim)));
          //解析 组件中 styleUrls 数据 保存在 dependencies中【？？？？】
    const dependencies: StylesCompileDependency[] = [];
    stylesheet.styleUrls.forEach((styleUrl) => {
      const exprIndex = styleExpressions.length;
      styleExpressions.push(null!);
      dependencies.push(new StylesCompileDependency(
          getStylesVarName(null), styleUrl,
          (value) => styleExpressions[exprIndex] = outputCtx.importExpr(value)));
    });
    //isComponentStylesheet 为 true,stylesVar是样式名称 `styles_组件名称`
    const stylesVar = getStylesVarName(isComponentStylesheet ? comp : null);
     // 生成style变量表达式
    const stmt = o.variable(stylesVar)
                     .set(o.literalArr(
                         styleExpressions, new o.ArrayType(o.DYNAMIC_TYPE, [o.TypeModifier.Const])))
                     .toDeclStmt(null, isComponentStylesheet ? [o.StmtModifier.Final] : [
                       o.StmtModifier.Final, o.StmtModifier.Exported
                     ]);
    outputCtx.statements.push(stmt);
    return new CompiledStylesheet(outputCtx, stylesVar, dependencies, shim, stylesheet);
  }    
}
`styleExpressions`:组件中 styles 中的样式【可能加入scope作用域】
`生成编译样式表`：{
     outputCtx: OutputContext,
     stylesVar: `styles_组件名`,
     dependencies: [{name:'style', 
                     moduleUrl,【组件的styleUrls】
                     setValue:(value) => styleExpressions[exprIndex] = outputCtx.importExpr(value) }], 
     isShimmed: boolean,【样式范围】
     meta: {
          moduleUrl: string|null;
          styles: string[];
          styleUrls: string[];
     }
}
`dependencies`:{
     public name: `styles`,
     public moduleUrl: string, //组件 styleUrls 数据
     public setValue: (value) => styleExpressions[exprIndex] = outputCtx.importExpr(value)
}
`stmt`:{
    name:`style_组件名`,
    value:    
    type: {
        of：{
            name:0,
            modifiers:[]},
        modifiers:[0]} 
    modifiers: StmtModifier[] = [],
    sourceSpan: ParseSourceSpan|null = null,
    leadingComments?: LeadingComment[]
}
`最终返回编译完成的样式表`
```

###### o.variable

```typescript
@params name `style_组件名称`
export class ReadVarExpr extends Expression {
  public name: string|null;
  public builtin: BuiltinVar|null;

  constructor(name: string|BuiltinVar, type?: Type|null, sourceSpan?: ParseSourceSpan|null) {
    super(type, sourceSpan);
    if (typeof name === 'string') {
      this.name = name;
      this.builtin = null;
    } else {
      this.name = null;
      this.builtin = name;
    }
  }
    set(value: Expression): WriteVarExpr {
    if (!this.name) {
      throw new Error(`Built in variable ${this.builtin} can not be assigned to.`);
    }
    return new WriteVarExpr(this.name, value, null, this.sourceSpan);
  }
}  
class Expression{
      constructor(type: Type|null|undefined, sourceSpan?: ParseSourceSpan|null) {
    this.type = type || null;
    this.sourceSpan = sourceSpan || null;
  }
}
`生成`:{
    name:
    builtin:null,
    type:null,
    builtin:null
}
set函数 走 WriteVarExpr
参数{
    entries:[styles表达式],
    type:{
        of：{
            name:0,
            modifiers:[]},
        modifiers:[0]}
    sourceSpan:null
}
```

###### o.DYNAMIC_TYPE

```typescript
export const DYNAMIC_TYPE = new BuiltinType(BuiltinTypeName.Dynamic = 0);
export class BuiltinType extends Type {
  constructor(public name: BuiltinTypeName, modifiers?: TypeModifier[]) {
    super(modifiers);
  }
  visitType(visitor: TypeVisitor, context: any): any {
    return visitor.visitBuiltinType(this, context);
  }
}
export abstract class Type {
  constructor(public modifiers: TypeModifier[] = []) {}
  abstract visitType(visitor: TypeVisitor, context: any): any;

  hasModifier(modifier: TypeModifier): boolean {
    return this.modifiers.indexOf(modifier) !== -1;
  }
}
`返回`：{
    name:0,
    modifiers:[]    
}
```

###### o.ArrayType

```typescript
`2.2.3-_compileTemplate步骤 参数来自上层`
@params of:
@params modifiers:[0]
export class ArrayType extends Type {
  constructor(public of: Type, modifiers?: TypeModifier[]) {
    super(modifiers);
  }
  visitType(visitor: TypeVisitor, context: any): any {
    return visitor.visitArrayType(this, context);
  }
}
export abstract class Type {
  constructor(public modifiers: TypeModifier[] = []) {}
  abstract visitType(visitor: TypeVisitor, context: any): any;

  hasModifier(modifier: TypeModifier): boolean {
    return this.modifiers.indexOf(modifier) !== -1;
  }
}
`返回`：{
    of：{
        name:0,
        modifiers:[]},
    modifiers:[0]        
}
```

###### o.literalArr

```typescript
`2.2.3-_compileTemplate步骤`
@params values:styles表达式
@params type:上层
@params sourceSpan:该步骤无
export function literalArr(
    values: Expression[], type?: Type|null, sourceSpan?: ParseSourceSpan|null): LiteralArrayExpr {
  return new LiteralArrayExpr(values, type, sourceSpan);
}

export class LiteralArrayExpr extends Expression {
  public entries: Expression[];
  constructor(entries: Expression[], type?: Type|null, sourceSpan?: ParseSourceSpan|null) {
    super(type, sourceSpan);
    this.entries = entries;
  }
}
`返回`：{
    entries：[styles表达式],
    type： {【上层】
        of：{
            name:0,
            modifiers:[]},
        modifiers:[0]} ,  
    sourceSpan:null        
}
返回值是o.variable set函数的参数
```

###### WriteVarExpr

```typescript
`从o.variable的 set 函数来`
@params name:`style_组件名`
@params value
@params type
@params sourceSpan
export class WriteVarExpr extends Expression {
  public value: Expression;
  constructor(
      public name: string, value: Expression, type?: Type|null, sourceSpan?: ParseSourceSpan|null) {
    super(type || value.type, sourceSpan);
    this.value = value;
  }

  isEquivalent(e: Expression): boolean {
    return e instanceof WriteVarExpr && this.name === e.name && this.value.isEquivalent(e.value);
  }

  isConstant() {
    return false;
  }

  visitExpression(visitor: ExpressionVisitor, context: any): any {
    return visitor.visitWriteVarExpr(this, context);
  }

  toDeclStmt(type?: Type|null, modifiers?: StmtModifier[]): DeclareVarStmt {
    return new DeclareVarStmt(this.name, this.value, type, modifiers, this.sourceSpan);
  }

  toConstDecl(): DeclareVarStmt {
    return this.toDeclStmt(INFERRED_TYPE, [StmtModifier.Final]);
  }
}

```

###### DeclareVarStmt

```typescript
@params name:`style_组件名`
@params value
@params type:null
@params modifiers:[0]
@params leadingComments：无
class DeclareVarStmt extends Statement{
    constructor(
      public name: string, public value?: Expression, type?: Type|null, modifiers?: StmtModifier[],
      sourceSpan?: ParseSourceSpan|null, leadingComments?: LeadingComment[]) {
    super(modifiers, sourceSpan, leadingComments);
    this.type = type || (value && value.type) || null;
  }
}

export abstract class Statement {
  constructor(
      public modifiers: StmtModifier[] = [], public sourceSpan: ParseSourceSpan|null = null,
      public leadingComments?: LeadingComment[]) {}

  abstract isEquivalent(stmt: Statement): boolean;

  abstract visitStatement(visitor: StatementVisitor, context: any): any;

  hasModifier(modifier: StmtModifier): boolean {
    return this.modifiers.indexOf(modifier) !== -1;
  }

  addLeadingComment(leadingComment: LeadingComment): void {
    this.leadingComments = this.leadingComments ?? [];
    this.leadingComments.push(leadingComment);
  }
}
`返回值`：{
     name:`style_组件名`
	 value：
	 type:null
	 modifiers:[0]
	 leadingComments：无
}
返回值是styleCompiler【样式编译器】中的 stmt。
```



###### 解析组件 style 数据

```typescript
const COMPONENT_VARIABLE = '%COMP%';
export const HOST_ATTR = `_nghost-${COMPONENT_VARIABLE}`;
export const CONTENT_ATTR = `_ngcontent-${COMPONENT_VARIABLE}`;

private _shimIfNeeded(style: string, shim: boolean): string {
    return shim ? this._shadowCss.shimCssText(style, CONTENT_ATTR, HOST_ATTR) : style;
  }

shimCssText(cssText: string, selector: string, hostSelector: string = ''): string {
    const commentsWithHash = extractCommentsWithHash(cssText); //【sourceMappingurl，源映射】
    cssText = stripComments(cssText);   // 去除【/*...*/】注释
    cssText = this._insertDirectives(cssText);

    const scopedCssText = this._scopeCssText(cssText, selector, hostSelector);
    return [scopedCssText, ...commentsWithHash].join('\n');
  }
'根据 传入的 shim 解析 css 返回'
```

##### ViewCompiler【视图编译器】

```typescript
class ViewCompiler {
  constructor(public viewClassVar: string, public rendererTypeVar: string) {}
}
```

##### HtmlParser【html解析器】

```typescript
export class HtmlParser extends Parser {
  constructor() {
    super(getHtmlTagDefinition);
  }

  parse(source: string, url: string, options?: TokenizeOptions): ParseTreeResult {
    return super.parse(source, url, options);
  }
}
`实际调用class`
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
```

###### lex.tokenize【标记】

```typescript
export function tokenize(
    source: string, url: string, getTagDefinition: (tagName: string) => TagDefinition,
    options: TokenizeOptions = {}): TokenizeResult {
  const tokenizer = new _Tokenizer(new ParseSourceFile(source, url), getTagDefinition, options);
  tokenizer.tokenize();
  return new TokenizeResult(
      mergeTextTokens(tokenizer.tokens), tokenizer.errors, tokenizer.nonNormalizedIcuExpressions);
}
```

###### _Tokenizer【标记类】

```typescript
class _Tokenizer{
  private _cursor: CharacterCursor;
  private _tokenizeIcu: boolean;
  private _interpolationConfig: InterpolationConfig;
  private _leadingTriviaCodePoints: number[]|undefined;
  private _currentTokenStart: CharacterCursor|null = null;
  private _currentTokenType: TokenType|null = null;
  private _expansionCaseStack: TokenType[] = [];
  private _inInterpolation: boolean = false;
  private readonly _preserveLineEndings: boolean;
  private readonly _escapedString: boolean;
  private readonly _i18nNormalizeLineEndingsInICUs: boolean;
  tokens: Token[] = [];
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
```



#### ReflectionCapabilities

```typescript
export class ReflectionCapabilities implements PlatformReflectionCapabilities {
      private _reflect: any;

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
      parameters(type: Type<any>): any[][] {
        // Note: only report metadata if we have at least one class decorator
        // to stay in sync with the static reflector.
        if (!isType(type)) {
          return [];
        }
        const parentCtor = getParentCtor(type);
        let parameters = this._ownParameters(type, parentCtor);
        if (!parameters && parentCtor !== Object) {
          parameters = this.parameters(parentCtor);
        }
        return parameters || [];
      }
    .......
}
`getParentCtor`: 获取父类的构造函数
`ownAnnotations`: 获取自身 annotations
`parentAnnotations` 获取父类 annotations
返回 当前指令类的父类的 annotations
```

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

#### 

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

