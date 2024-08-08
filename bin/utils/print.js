import chalk from 'chalk';

const print = (text) => {
    const arr = text.split(/[:]/g);
    let res = '';
    arr.forEach((item) => {
        // 是否有中文
        if (item.match(/[\u4e00-\u9fa5]/)) {
            res += chalk.blueBright(item);
        } else {
            res += chalk.green(item);
        }
    });
    console.log(res)
};

export default print;
