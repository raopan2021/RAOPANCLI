import fs from 'fs-extra';
import inquirer from 'inquirer';
import shell from "shelljs";
import addVersion from './addversion.js';
import printError from '../utils/printError.js';
import stringOptimization from '../utils/stringOptimization.js';

const run = () => {
    if (!(fs.pathExistsSync(process.cwd() + '/pnpm-lock.yaml') && fs.pathExistsSync(process.cwd() + '/package.json'))) {
        printError('未找到可执行脚本');
        return;
    }

    const action = [];
    let npmWay = fs.pathExistsSync(process.cwd() + '/pnpm-lock.yaml') ? 'pnpm' : 'npm';
    action.push(npmWay === 'npm' ? 'npm run' : 'pnpm');

    const packageJson = fs.readJsonSync(process.cwd() + '/package.json');
    const scriptArr = [];

    Object.entries(packageJson.scripts).forEach(([key, value]) => {
        scriptArr.push(`${key} :  ${value}`);
    });

    const options = [
        {
            name: 'script',
            type: 'list',
            message: '请选择执行脚本',
            choices: stringOptimization(scriptArr),
        },
        {
            name: 'addVersion',
            type: 'confirm',
            message: 'package.json 的 version 是否加 1',
            default: true,
            when: (answers) => answers.script.includes('build'),
        },
    ];
    inquirer.prompt(options).then((res) => {
        if (res.addVersion) addVersion(1);

        action.push(res.script.split(':')[0]);

        shell.exec(
            action.join(' '),
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
