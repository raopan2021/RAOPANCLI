// .option('-h --help','查看帮助信息')
import { print } from '../utils/print.js';

const addSpaces = (str, start, max) => {
    let spaces = '   ';
    let num = max - start;
    while (num) {
        spaces += ' ';
        num--;
    }
    return str.slice(0, start) + spaces + str.slice(start);
};

// 处理字符串
const stringOptimization = (arr) => {
    let maxLength = 0;
    const res = [];
    arr.forEach((item) => {
        if (item.indexOf(':') > maxLength) {
            maxLength = item.indexOf(':');
        }
    });
    arr.forEach((item) => {
        res.push(addSpaces(item, item.indexOf(':'), maxLength));
    });
    return res;
};

const printHelp = (name, description, options) => {
    print(name, 'rgb(120, 100, 200');
    print(description);

    const opts = [];
    options.forEach((item) => {
        opts.push(item.flags + ':' + item.description);
    });
    stringOptimization(opts).forEach((item) => {
        print(item);
    });
};

export default printHelp;
