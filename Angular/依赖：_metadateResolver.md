# _metadataResolver

**功能**：JitCompiler模式下解析模块，组件，指令，管道的依赖并缓存。

**依赖**：_ngModuleResolver，summaryResolver，_directiveResolver

- _ngModuleCache：缓存【模块类 -> 编译后数据的】映射
- _directiveCache： 缓存【指令 -> 标准指令元数据】
- _summaryCache：缓存【指令 -> 标准指令元数据的摘要数据】

`只分析初始化阶段，一个参数`moduleType

#### getNgModuleMetadata

```typescript
先从缓存[_ngModuleCache]中寻找，有就返回，没有就解析后缓存;
获取装饰器数据 annotation
const meta = this._ngModuleResolver.resolve(moduleType, throwIfNotFound);
从meta数据中解析数据:
--解析导入数据 meta.imports

```

##### 解析imports

```typescript
加入对模块和引入的校验，防止无效模块及引用自身;
构造 alreadyCollecting，防止循环收集

解析 import模块，生成摘要信息Summary
const importedModuleSummary =
              this.getNgModuleSummary(importedModuleType, alreadyCollecting);

返回信息是getNgModuleMetadata的返回值.toSummary()
将摘要信息存储到`importedModules`
```

##### 解析exports

```typescript
对导出模块校验;
解析导出模块：
const exportedModuleSummary = 		    
             this.getNgModuleSummary(exportedType,alreadyCollecting);

exportedModuleSummary 是getNgModuleMetadata的返回值.toSummary()
如果 exportedModuleSummary 存在 将摘要信息存储到`exportedModules`
不存在将 导出值 存入 `exportedNonModuleIdentifiers`【{reference：导出值}】
`exportedNonModuleIdentifiers`：导出的非模块标识符
```

##### transitiveModule

```typescript
获取imports 和 exports 模块数据中的 providers 和 entryComponents
const transitiveModule = 
   this._getTransitiveNgModuleMetadata(importedModules, exportedModules);

transitiveModule 中的【modules】存储了 imports  和exports 和 模块自身
```

##### 解析declarations

```typescript
解析本模块的 组件，指令，管道。

获取模块指令的标识符：指令有'__forward_ref__'属性的话，reference 是fn()，否则就是其本身
const declaredIdentifier = this._getIdentifierMetadata(declaredType);
 {reference：指令本身}

判断 declaration 类型【组件，指令，管道】存入 transitiveModule 对应位置
判断 declaration 类型【组件，指令，管道】存入 declaredDirectives，declaredPipes 中
存储 <declaration, 所属模块moduleType>映射关系

```

##### 解析providers

```typescript
解析 providers 生成 provider实例{
    this.token = provide;
    this.useClass = useClass || null;
    this.useValue = useValue;
    this.useExisting = useExisting;
    this.useFactory = useFactory || null;
    this.dependencies = deps || null;
    this.multi = !!multi;
}
如果 provider.provide 是 AnalyzeForEntryComponents,解析provider加入到 entryComponents
其他的provide 就 将provider解析后 缓存到  `providers`
{
      token: token,
      useClass: compileTypeMetadata,
      useValue: provider.useValue,
      useFactory: compileFactoryMetadata,
      useExisting: provider.useExisting ?                
                    this._getTokenMetadata(provider.useExisting) : undefined,
      deps: compileDeps,
      multi: provider.multi
    };
```

##### 解析entryComponents

```typescript
`getNonNormalizedDirectiveMetadata`解析 entryComponents 生成相关数据 :
{metadata, annotation}
处理后返回：
{componentType: 组件类, componentFactory: 组件构造函数}
存入 `entryComponents`
```

##### 解析bootstrap

```typescript
校验 bootstrap
解析 bootstrap 生成 {reference：bootstrap} 存入 `bootstrapComponents`
```

##### 将 bootstrap 解析后 放到entryComponents

```
为啥？？？
```

##### 将schemas 存入 schemas 缓存

```typescript
`schemas`
```



##### 生成 编译元数据 compileMeta

```typescript
compileMeta = new cpl.CompileNgModuleMetadata({
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

`将 module 和 compileMeta的映射存入 _ngModuleCache`

`compileMeta 就是 getNgModuleMetadata的返回值`

```



#### _getTypeMetadata

```typescript
_getTypeMetadata(type: Type, 
                 dependencies: any[]|null = null,
    			 throwOnUnknownDeps = true):cpl.CompileTypeMetadata {
    const identifier = this._getIdentifierMetadata(type);
    return {
      reference: identifier.reference,
      diDeps: this._getDependenciesMetadata(identifier.reference, dependencies, throwOnUnknownDeps),
      lifecycleHooks: getAllLifecycleHooks(this._reflector, identifier.reference),
    };
  }
返回模块数据：{
    reference:模块,
    diDeps:
    hasLifecycleHook:查找出模块包含的生命周期？？？？？
}
```



#### getNgModuleSummary

```typescript
`获取模块摘要信息`

加载模块摘要信息[_summaryCache]，如果没有，就从【_summaries】加载摘要信息，
再没有，就获取模块元数据生成摘要信息，并缓存到 _metadataResolver中的 _summaryCache
【_summaries 和 _summaryCache 区别？？？】

getNgModuleSummary(moduleType: any, alreadyCollecting: Set<any>|null = null):
      cpl.CompileNgModuleSummary|null {
    let moduleSummary: cpl.CompileNgModuleSummary|null =
        <cpl.CompileNgModuleSummary>this._loadSummary(moduleType, cpl.CompileSummaryKind.NgModule);
    if (!moduleSummary) {
      const moduleMeta = this.getNgModuleMetadata(moduleType, false, alreadyCollecting);
      moduleSummary = moduleMeta ? moduleMeta.toSummary() : null;
      if (moduleSummary) {
        this._summaryCache.set(moduleType, moduleSummary);
      }
    }
    return moduleSummary;
  }
没有摘要信息，就用 getNgModuleMetadata 解析 imports 模块，
getNgModuleMetadata 的返回值： moduleMeta
`moduleMeta.toSummary() 就是摘要信息。`
最后将摘要信息存储到 `importedModules` 中
```

#### _loadSummary

```typescript
`使用依赖《_summaryResolver:摘要解析器》解析模块`

_loadSummary(type: any, kind: cpl.CompileSummaryKind): cpl.CompileTypeSummary|null {
    let typeSummary = this._summaryCache.get(type);
    if (!typeSummary) {
      const summary = this._summaryResolver.resolveSummary(type);
      typeSummary = summary ? summary.type : null;
      this._summaryCache.set(type, typeSummary || null);
    }
    return typeSummary && typeSummary.summaryKind === kind ? typeSummary : null;
  }
在初始状态 summary 是空的 设置 _summaryCache<type, null>，返回null
`在初始状态是空的，什么时候有？？？？`
```

#### getNonNormalizedDirectiveMetadata

```typescript
`获取非标准化的指令元数据`
此处指令 指 `指令`和`组件`

对组件/指令进行解析【数据在后面】

如果是组件，生成组件对应的编译模板元数据：`nonNormalizedTemplateMetadata` = {
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
      }
对于指令类生成统一元数据：`metadata` = {
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
      componentViewType: nonNormalizedTemplateMetadata ? 	
    					      this.getComponentViewClass(directiveType) :
                              null,
      rendererType: nonNormalizedTemplateMetadata ? 
    						this.getRendererType(directiveType) : null,
      componentFactory: null
    }
    
指令和组件生成的元数据略有不同：
组件有 componentFactory，selector...等属性,指令有guards...

cacheEntry = {metadata, annotation: dirMeta}
_nonNormalizedDirectiveCache缓存 <directiveType, cacheEntry>
`最终返回` cacheEntry    

dirMeta是解析指令解析后生成的值 {
    ngMetadataName:'component'/'Directive',
    组件/指令解析后的属性,    
}

`组件解析后的数据`:{
    selector: comp.selector,
        inputs: mergedInputs,
        outputs: mergedOutputs,
        host: mergedHost,
        exportAs: comp.exportAs,
        moduleId: comp.moduleId,
        queries: mergedQueries,
        changeDetection: comp.changeDetection,
        providers: comp.providers,
        viewProviders: comp.viewProviders,
        entryComponents: comp.entryComponents,
        template: comp.template,
        templateUrl: comp.templateUrl,
        styles: comp.styles,
        styleUrls: comp.styleUrls,
        encapsulation: comp.encapsulation,
        animations: comp.animations,
        interpolation: comp.interpolation,
        preserveWhitespaces: directive.preserveWhitespaces,
}    
`指令解析后的数据`{
     	selector: directive.selector,
        inputs: mergedInputs,
        outputs: mergedOutputs,
        host: mergedHost,
        exportAs: directive.exportAs,
        queries: mergedQueries,
        providers: directive.providers,
        guards
}    
```

#### loadDirectiveMetadata

```typescript
根据 `getNonNormalizedDirectiveMetadata` 生成的非标准指令元数据生成 标准指令元数据
存入 _directiveCache 和 _summaryCache
```

#### getDirectiveMetadata

```typescript
从 _directiveCache 中获取标准指令元数据
```



### 依赖

#### _ngModuleResolver

```typescript
`模块解析器：返回模块的注释annotations/判断是否是模块`

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
```

#### summaryResolver

```
摘要解析器 在Jit模式下 JitSummaryResolver
```

#### JitSummaryResolver

```typescript
`存储摘要映射`什么时候存储的？？？？
class JitSummaryResolver implements SummaryResolver<Type> {
  private _summaries = new Map<Type, Summary<Type>>();

  isLibraryFile(): boolean {
    return false;
  }
  toSummaryFileName(fileName: string): string {
    return fileName;
  }
  fromSummaryFileName(fileName: string): string {
    return fileName;
  }
  resolveSummary(reference: Type): Summary<Type>|null {
    return this._summaries.get(reference) || null;
  }
  getSymbolsOf(): Type[] {
    return [];
  }
  getImportAs(reference: Type): Type {
    return reference;
  }
  getKnownModuleName(fileName: string) {
    return null;
  }
  addSummary(summary: Summary<Type>) {
    this._summaries.set(summary.symbol, summary);
  }
}
```

#### _directiveResolver

```typescript
`指令解析器`
```

