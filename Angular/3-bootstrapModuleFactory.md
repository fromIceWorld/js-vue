## bootstrapModuleFactory

在 bootstrapModuleFactory 获取 ngZone ，将对应代码运行在  ngZone  上下文，对代码中的异步操作进行拦截。

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
`主要是 ngZone.run中的函数`
`Injector.create 走《0-begin》中的 【2.2-Injector】`:生成对应_record<Map>{
    NgZone : {deps:[],value:ngZone,fn:IDENT, useNew:false}
}
```

