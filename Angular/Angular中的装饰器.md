#### @NgModule

```typescript
export const NgModule: NgModuleDecorator = makeDecorator(
    'NgModule', (ngModule: NgModule) => ngModule, undefined, undefined,
    /**
     * Decorator that marks the following class as an NgModule, and supplies
     * configuration metadata for it.
     *
     * * The `declarations` and `entryComponents` options configure the compiler
     * with information about what belongs to the NgModule.
     * * The `providers` options configures the NgModule's injector to provide
     * dependencies the NgModule members.
     * * The `imports` and `exports` options bring in members from other modules, and make
     * this module's members available to others.
     */
    (type: Type<any>, meta: NgModule) => SWITCH_COMPILE_NGMODULE(type, meta));
```

##### makeDecorator

```typescript
export function makeDecorator<T>(
    name: string, props?: (...args: any[]) => any, parentClass?: any,
    additionalProcessing?: (type: Type<T>) => void,
    typeFn?: (type: Type<T>, ...args: any[]) => void):
    {new (...args: any[]): any; (...args: any[]): any; (...args: any[]): (cls: any) => any;} {
  return noSideEffects(() => {
    const metaCtor = makeMetadataCtor(props);

    function DecoratorFactory(
        this: unknown|typeof DecoratorFactory, ...args: any[]): (cls: Type<T>) => any {
      if (this instanceof DecoratorFactory) {
        metaCtor.call(this, ...args);
        return this as typeof DecoratorFactory;
      }

      const annotationInstance = new (DecoratorFactory as any)(...args);
      return function TypeDecorator(cls: Type<T>) {
        if (typeFn) typeFn(cls, ...args);
        // Use of Object.defineProperty is important since it creates non-enumerable property which
        // prevents the property is copied during subclassing.
        const annotations = cls.hasOwnProperty(ANNOTATIONS) ?
            (cls as any)[ANNOTATIONS] :
            Object.defineProperty(cls, ANNOTATIONS, {value: []})[ANNOTATIONS];
        annotations.push(annotationInstance);


        if (additionalProcessing) additionalProcessing(cls);

        return cls;
      };
    }

    if (parentClass) {
      DecoratorFactory.prototype = Object.create(parentClass.prototype);
    }

    DecoratorFactory.prototype.ngMetadataName = name;
    (DecoratorFactory as any).annotationCls = DecoratorFactory;
    return DecoratorFactory as any;
  });
}

**备注
noSideEffects 会执行 参数(fn)

**
返回装饰器工厂DecoratorFactory,就是我们的 NgModel 装饰器，arg就是传入的参数，(this是ts一种限制，不是参数🙄)

在编译ts时，生成注释实例 annotationInstance = {...arg},由于 annotationInstance 是 DecoratorFactory 的实例，因此集成了 ngMetadataName 属性【标识】，在其他步骤用，最后 返回 TypeDecorator。
在后续装饰时对class AppModule{} 进行操作，
AppModule.__annotations__ = [{providers,import,declarations,bootstrap...}].
`NgModule装饰器为class上添加注释__annotations__，注释是装饰器的参数`
```

