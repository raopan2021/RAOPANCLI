// 切换npm源
import shell from 'shelljs';
import inquirer from 'inquirer'
import chalk from 'chalk';

const options = [
    {
        name: 'npm',
        type: 'list',
        message: '请选择npm源',
        choices: [
            'npm官方',
            '淘宝源',
            '阿里源',
            '腾讯源',
            '华为源',
            '清华源',
        ],
        default: '淘宝源'
    },
]

const registrys = {
    "npm官方": "npm config set registry https://registry.npmjs.org/",
    "淘宝源": "npm config set registry https://registry.npmmirror.com/",
    "阿里源": "npm config set registry https://npm.aliyun.com/",
    "腾讯源": "npm config set registry https://mirrors.cloud.tencent.com/npm/",
    "华为源": "npm config set registry https://mirrors.huaweicloud.com/repository/npm/",
    "清华源": "npm config set registry https://mirrors.tuna.tsinghua.edu.cn/",
}

const setRegistry = () => {
    inquirer.prompt(options).then(res => {
        console.log('\n' + chalk.blue('npm源： ') + chalk.green(res.npm))
        console.log(registrys[res.npm]);

        setTimeout(() => {
            shell.exec(
                registrys[res.npm],
                code => {
                    if (code === 0) {
                        console.log(chalk.greenBright('切换成功'));
                    } else {
                        console.log(chalk.redBright('切换失败'));
                    }
                })
        }, 0);

        setTimeout(() => {
            shell.exec(
                "npm config get registry",
                code => {
                    if (code === 0) {
                        console.log(chalk.greenBright('查询npm源成功'));
                    } else {
                        console.log(chalk.redBright('查询npm源失败'));
                    }
                })
        }, 1500);
    })
}

export default setRegistry;