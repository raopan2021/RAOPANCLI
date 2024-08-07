// .option('-h --help','查看帮助信息')
import print from '../utils/print.js';

const printHelp = (name, description, options) => {
    print(name, 'rgb(120, 100, 200');
    print(description + '\n');

    let maxLength = 0
    const res = []
    options.forEach((item) => {
        if (item.flags.length > maxLength) {
            maxLength = item.flags.length
        }
    })
    options.forEach((item) => {
        while (item.flags.length < maxLength) {
            item.flags += ' '
        }
        res.push(item.flags + '   ' + item.description)
    })
    res.forEach((item) => {
        print(item)
    })
}

export default printHelp