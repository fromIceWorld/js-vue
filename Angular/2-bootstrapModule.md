#### bootstrapModule

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

##### 1-compileNgModuleFactory

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

##### 2-compileModuleAsync

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

##### 2.1-_loadModules(第一步)

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
```

###### 2.1.1-getNgModuleMetadata

```typescript
`CompileMetadataResolver依赖的getNgModuleMetadata函数 200行😫，只放伪代码`
const meta = this._ngModuleResolver.resolve(moduleType, throwIfNotFound = true);
if(meta.imports){...}
if(meta.exports){...}
if(meta.declarations){...}
if(meta.providers){...}
if(meta.entryComponents){...}
if(meta.bootstrap){...}
if(meta.schemas){...}
compileMeta = new cpl.CompileNgModuleMetadata(...)
return compileMeta; 

`_ngModuleResolver用到了NgModuleResolver依赖😐` 
                                              
终：`解析出@NgModule装饰器的参数，对参数内容进行编译。`                                              
```

###### 2.1.2-NgModuleResolver

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
最终返回的是 @NgModule 的参数。回到2.1.1
```

###### 2.1.3-CompileReflector

```typescript
{provide: CompileReflector, useValue: new JitReflector()},
用的是JitReflector实例    
```

###### 2.1.4-JitReflector

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

###### 2.1.5-ReflectionCapabilities

```typescript
`200行😫，只放伪代码`
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
`合并返回 annotations [装饰器解析参数然后挂到class上的__annotations__；《Angular中的装饰器》文档有] `
回到2.1.2步骤。
```

##### 2.2-_compileComponents（第二步）

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
```



#### 附录

##### JitCompilerFactory

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

##### CompilerImpl

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

##### SyncAsync

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

##### flattenAndDedupeArray

```typescript
将 tree 类型的数据扁平并去除重复数据
```

