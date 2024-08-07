import chalk from "chalk";

const print = (text) => {
    // 使用正则表达式将字符串分割成数组
    // \p{Script=Han} 匹配中文字符
    // [a-zA-Z0-9] 匹配英文和数字
    const arr = text.split(/(\p{Script=Han}|[a-zA-Z0-9]+)/u);
    let res = ''
    arr.forEach((item) => {
        if (item.match(/[\u4e00-\u9fa5]/)) {
            res += chalk.cyan.bold(item);
        } else {
            res += chalk.green(item);
        }
    })
    console.log(res);
}

export default print