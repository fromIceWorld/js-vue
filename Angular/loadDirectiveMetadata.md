### loadDirectiveMetadata

属于启动第一步 【_loadModules】

在【getNgModuleMetadata】解析本模块及依赖模块后，加载指令

```typescript
`加载指令元数据【组件是指令的子类，包含在指令中】`
`ngModuleType`:主模块下的子模块
`directiveType`：子模块下的指令{
    type：指令class
}

_directiveCache:缓存解析后的指令

 loadDirectiveMetadata(ngModuleType: any, 
                       directiveType: any, 
                       isSync: boolean): SyncAsync<null> {
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

