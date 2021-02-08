interface Observer {
    next?: Function;
    complate?: Function;
    error?: Function;
}

//观察者
class Observable {
    fn: Function;
    subscribeFn: Observer = {
        next: () => {},
        complate: () => {},
        error: () => {},
    };
    observer = {
        next: function (value) {
            this.subscribeFn.next(value);
        },
        complate: function () {
            this.subscribeFn.complate();
            this.subscribeFn = {
                next: () => {},
                complate: () => {},
                error: () => {},
            };
        },
        error: function (error) {
            this.subscribeFn.error(error);
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
    }
    static create(fn) {
        return new Observable(fn);
    }
}

var ob = Observable.create(function (observer: Observer) {
    observer.next('base1');
    observer.complate();
    observer.next('base2');
});
ob.subscribe((value) => {
    console.log(value);
});

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
