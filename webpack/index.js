import module3 from './module3';
const a = require('./module1'),
    b = require('./module2');
a.module1(), module3();
console.log('index.js');
