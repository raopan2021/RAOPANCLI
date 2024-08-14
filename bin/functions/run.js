import fs from 'fs-extra';
import inquirer from 'inquirer';
import shell from "shelljs";
import addVersion from './addversion.js';
import { printError } from '../utils/print.js';

// 添加空格
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
        if (item.indexOf('_') > maxLength) {
            maxLength = item.indexOf('_');
        }
    });
    arr.forEach((item) => {
        res.push(addSpaces(item, item.indexOf('_'), maxLength));
    });
    return res;
};


const run = () => {
    if (!(fs.pathExistsSync(process.cwd() + '/pnpm-lock.yaml') || fs.pathExistsSync(process.cwd() + '/package.json'))) {
        printError('未找到可执行脚本');
        return;
    }

    const action = [];
    let npmWay = fs.pathExistsSync(process.cwd() + '/pnpm-lock.yaml') ? 'pnpm' : 'npm';
    action.push(npmWay === 'npm' ? 'npm run' : 'pnpm');

    const packageJson = fs.readJsonSync(process.cwd() + '/package.json');
    const scriptArr = [];

    Object.entries(packageJson.scripts).forEach(([key, value]) => {
        scriptArr.push(`${key} _  ${value}`);
    });

    const options = [{
        name: 'script',
        type: 'list',
        message: '请选择执行脚本',
        choices: stringOptimization(scriptArr),
    }, {
        name: 'addVersion',
        type: 'confirm',
        message: 'package.json 的 version 是否加 1',
        default: true,
        when: (answers) => answers.script.includes('build'),
    }];
    inquirer.prompt(options).then((res) => {
        if (res.addVersion) addVersion(1);

        action.push(res.script.split('_')[0]);

        shell.exec(
            action.join(' ').trim(),
            code => {
                if (code !== 0) {
                    printError('脚本执行失败')
                    if (res.addVersion) addVersion(-1)
                }
            }
        )
    });
};

export default run;
