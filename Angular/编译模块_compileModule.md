#### _compileComponents

在 1 阶段启动分为三个步骤：_loadModules，__compileComponents，_compileModule

这篇是第二步 **_compileComponents**



获取模块元素据 ngModule =【getNgModuleMetadata】

获取 ngModule  中的 transitiveModule.modules

```
transitiveModule.modules 是 imports模块 和 exports 模块和其自身模块
```

获取 imports，exports，自身 包含的  【*declaredDirectives*】

```typescript
由于在 `_loadModules` 阶段 已经处理指令存在_directiveCache，在这一步可以直接获取 normalizedDirMeta
```

根据 标准指令元数据 及 模块元数据创建<编译模板实例> **放入 templates**

```typescript
标准指令元数据：normalizedDirMeta

new CompiledTemplate(false, 指令类, 标准指令元数据, 模块, 模块指令 )

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
```

根据 entryComponents 元数据生成 <主编译模板实例> **放入 templates**

```typescript

_createCompiledHostTemplate(compType: Type, ngModule: CompileNgModuleMetadata):
      CompiledTemplate {
    if (!ngModule) {
      throw new Error(`Component ${
          stringify(
              compType)} is not part of any NgModule or the module has not been imported into your module.`);
    }
    let compiledTemplate = this._compiledHostTemplateCache.get(compType);
    if (!compiledTemplate) {
      const compMeta = this._metadataResolver.getDirectiveMetadata(compType);
      assertComponent(compMeta);

      const hostMeta = this._metadataResolver.getHostComponentMetadata(
          compMeta, (compMeta.componentFactory as any).viewDefFactory);
      compiledTemplate =
          new CompiledTemplate(true, compMeta.type, hostMeta, ngModule, [compMeta.type]);
      this._compiledHostTemplateCache.set(compType, compiledTemplate);
    }
    return compiledTemplate;
  }
```

循环执行 templates 编译

```typescript
templates.forEach((template) => this._compileTemplate(template));
```

##### _compileTemplate

```typescript
  private _compileTemplate(template: CompiledTemplate) {
    if (template.isCompiled) {
      return;
    }
    const compMeta = template.compMeta;
    const externalStylesheetsByModuleUrl = new Map<string, CompiledStylesheet>();
    const outputContext = createOutputContext();
    const componentStylesheet = this._styleCompiler.compileComponent(outputContext, compMeta);
    compMeta.template !.externalStylesheets.forEach((stylesheetMeta) => {
      const compiledStylesheet =
          this._styleCompiler.compileStyles(createOutputContext(), compMeta, stylesheetMeta);
      externalStylesheetsByModuleUrl.set(stylesheetMeta.moduleUrl!, compiledStylesheet);
    });
    this._resolveStylesCompileResult(componentStylesheet, externalStylesheetsByModuleUrl);
    const pipes = template.ngModule.transitiveModule.pipes.map(
        pipe => this._metadataResolver.getPipeSummary(pipe.reference));
    const {template: parsedTemplate, pipes: usedPipes} =
        this._parseTemplate(compMeta, template.ngModule, template.directives);
    const compileResult = this._viewCompiler.compileComponent(
        outputContext, compMeta, parsedTemplate, ir.variable(componentStylesheet.stylesVar),
        usedPipes);
    const evalResult = this._interpretOrJit(
        templateJitUrl(template.ngModule.type, template.compMeta), outputContext.statements);
    const viewClass = evalResult[compileResult.viewClassVar];
    const rendererType = evalResult[compileResult.rendererTypeVar];
    template.compiled(viewClass, rendererType);
  }
```

##### _compileTemplate

```typescript
创建输出上下文:OutputContext = {
	statements: [], 
	genFilePath: '', 
	importExpr, 
	constantPool: new ConstantPool()
}
根据styles 生成组件样式表：[LiteralExpr类]
根据styleUrls 生成对应实例`StylesCompileDependency`数组dependencies【可根据传入值进行处理放入styles生成的样式表里】
获取样式名：组件名
生成 DeclareVarStmt：{
    name:
    value:[styles 生成组件样式表]
}
将 DeclareVarStmt 放入 statements
生成编译style样式表的实例：{
     outputCtx: OutputContext, 
     stylesVar: 样式名【组件名】,
     dependencies: StylesCompileDependency[], 
     isShimmed: boolean,
     meta: {styles,styleUrls,moduleUrl}
}
合并【styles 生成组件样式表】和【externalStylesheets】
解析出编译后的template 和 用到的 pipe【对于template 中间过程会编译成:{rootNodes, errors}】

```

