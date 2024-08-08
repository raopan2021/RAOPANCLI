// .option('-h --help','查看帮助信息')
import print from '../utils/print.js';
import stringOptimization from '../utils/stringOptimization.js';

const printHelp = (name, description, options) => {
    print(name, 'rgb(120, 100, 200');
    print(description + '\n');

    const opts = [];
    options.forEach((item) => {
        opts.push(item.flags + ':' + item.description);
    });
    stringOptimization(opts).forEach((item) => {
        print(item);
    });
};

export default printHelp;
