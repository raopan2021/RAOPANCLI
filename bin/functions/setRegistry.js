// 切换npm源
// import shell from 'shelljs';
// const { execSync } = require('child_process');
import { execSync } from 'child_process';

import inquirer from 'inquirer'
import chalk from 'chalk';
import find_index from '../utils/findIndex.js';

const setRegistry = async () => {
    const registrys = [
        { "npm官方": "npm config set registry https://registry.npmjs.org/" },
        { "淘宝源": "npm config set registry https://registry.npmmirror.com/" },
        { "阿里源": "npm config set registry https://npm.aliyun.com/" },
        { "腾讯源": "npm config set registry https://mirrors.cloud.tencent.com/npm/" },
        { "华为源": "npm config set registry https://mirrors.huaweicloud.com/repository/npm/" },
        { "清华源": "npm config set registry https://mirrors.tuna.tsinghua.edu.cn/" },
    ]

    let npmDefault = ''
    const res = execSync("npm config get registry",{ encoding: 'utf-8' }).trim()
    const index = find_index(registrys,res)
    if (index !== -1) {
        npmDefault = Object.keys(registrys[index]);
    } else {
        console.log("您当前使用的npm源不在列表中");
    }

    const options = [{
        name: 'npm',
        type: 'list',
        message: '请选择npm源',
        choices: ['npm官方','淘宝源','阿里源','腾讯源','华为源','清华源',],
        default: npmDefault
    }]

    setTimeout(() => {
        inquirer.prompt(options).then(res => {
            console.log('\n' + chalk.blue('npm源： ') + chalk.green(res.npm))
            console.log(registrys[res.npm]);

            try {
                execSync(registrys[res.npm],{ encoding: 'utf-8' }).trim()
                console.log(chalk.greenBright('切换成功'));
            } catch (error) {
                console.log(chalk.redBright('切换失败'));
            }

            try {
                execSync("npm config get registry",{ encoding: 'utf-8' }).trim()
                console.log(chalk.greenBright('查询npm源成功'));
            } catch (error) {
                console.log(chalk.redBright('查询npm源失败'));
                // console.log(chalk.redBright('切换失败'));
            }
        })
    },2000);
}

export default setRegistry;