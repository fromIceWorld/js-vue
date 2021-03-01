interface Observer {
    next?: Function;
    complate?: Function;
    error?: Function;
}
//pipes
//take
function take(num) {
    return function (stream) {
        return stream.slice(0, num);
    };
}
//takeUntil
function takeUntil(observable) {
    return function (stream) {
        observable.subscribe(($event) => {
            stream = [];
        });
        return stream;
    };
}

//观察者
class Observable {
    fn: Function;
    pipes: any[];
    stream: any[];
    subscribeFn: Observer = {
        next: () => {},
        complate: () => {},
        error: () => {},
    };
    observer = {
        next: function (value) {
            this.stream.push(['next', value]);
        },
        complate: function () {
            this.stream.push(['complate']);
        },
        error: function (error) {
            this.stream.push(['error', error]);
        },
    };
    constructor(fn) {
        this.fn = fn;
    }
    subscribe(subscribeOrFn) {
        let type = typeof subscribeOrFn;
        if (type == 'function') {
            this.subscribeFn.next = subscribeOrFn;
        } else if (type == 'object') {
            this.subscribeFn = subscribeOrFn;
        } else {
            throw Error('回调函数不正确！！');
        }
        Object.setPrototypeOf(this.observer, this);

        this.fn(this.observer);
        let stream = this.pipes.reduce((pre, next) => {
            return next(pre(this.stream));
        });
        stream.map((item) => {
            if (item[0] == 'next') {
                this.subscribeFn.next(item[1]);
            } else if (item[0] == 'complate') {
                this.subscribeFn.complate();
                this.subscribeFn = {
                    next: () => {},
                    complate: () => {},
                    error: () => {},
                };
                return;
            } else {
                this.subscribeFn.error(item[1]);
            }
        });
    }
    pipe(...arg) {
        this.pipes = [...arg];
    }
    static create(fn) {
        return new Observable(fn);
    }
}
//Observable.create
var ob = Observable.create(function (observer: Observer) {
    observer.next('base1');
    observer.complate();
    observer.next('base2');
});
ob.subscribe((value) => {
    console.log(value);
});

//of 操作符
function of(...params) {
    let arg = [...params],
        fn = function (observer: Observer) {
            arg.map((item) => observer.next(item));
        };
    return new Observable(fn);
}

var ob1 = of('of1', 'of2', 'of3', 'of4') as Observable;
ob1.subscribe((value) => {
    console.log(value);
});

//from操作符 参数是类数组
function from(arg) {
    const fn = function (observer: Observer) {
        [...arg].map((item) => observer.next(item));
    };
    return new Observable(fn);
}

//fromPromise 参数是promise
function fromPromise(promise) {
    if (promise instanceof Promise) {
        return promise.then((value) => {
            const fn = function (observer) {
                observer.next(value);
            };
            return new Observable(fn);
        });
    }
}

//fromEvent
function fromEvent(dom, type) {
    const ob = new Observable(() => {});
    dom.addEventListener(type, function ($event) {
        ob.observer.next($event);
    });
    return ob;
}
function interval(time) {
    const ob = new Observable((observer) => {
        let i = 0;
        setInterval(() => observer.next(i++), time);
    });
    return ob;
}

//
