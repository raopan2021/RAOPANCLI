// 切换npm源
import { execSync } from 'child_process';
import inquirer from 'inquirer';
import shell from 'shelljs';
import { print, printError } from '../utils/print.js';

const mirrors = {
    npm官方: 'https://registry.npmjs.org/',
    淘宝源: 'https://registry.npmmirror.com/',
    阿里源: 'https://npm.aliyun.com/',
    腾讯源: 'https://mirrors.cloud.tencent.com/npm/',
    华为源: 'https://mirrors.huaweicloud.com/repository/npm/',
    清华源: 'https://mirrors.tuna.tsinghua.edu.cn/',
};

const findObj = (obj, str) => {
    for (const [key, value] of Object.entries(obj)) {
        if (key.includes(str) || String(value.split('//')[1]).includes(str.split('//')[1])) {
            return [key, value];
        }
    }
    return ['', ''];
};

// 查询当前源
const getNowMirror = (pm) => {
    const pmCmd = pm || 'npm';
    try {
        const npmNow = execSync(`${pmCmd} config get registry`, { encoding: 'utf-8', stdio: 'pipe' }).trim();
        const [key, value] = findObj(mirrors, npmNow);
        if (key && value === npmNow) {
            print(`当前 ${pmCmd} 源为 - ` + key + ': ' + value);
            return key;
        } else {
            printError(`您当前使用的${pmCmd}源不在列表中`);
            return '';
        }
    } catch (error) {
        printError(`获取 ${pmCmd} 源失败`);
        return '';
    }
};

// 设置源
const setRegistry = (pm, registry) => {
    try {
        execSync(`${pm} config set registry ${registry}`, { encoding: 'utf-8', stdio: 'pipe' });
        return true;
    } catch (error) {
        return false;
    }
};

const setMirror = async () => {
    // 检测可用的包管理器
    const availablePM = [];
    if (shell.which('npm')) availablePM.push('npm');
    if (shell.which('pnpm')) availablePM.push('pnpm');
    if (shell.which('yarn')) availablePM.push('yarn');
    if (shell.which('bun')) availablePM.push('bun');

    if (availablePM.length === 0) {
        printError('未找到任何包管理器');
        return;
    }

    // 选择要设置的包管理器
    const { pm } = await inquirer.prompt([{
        name: 'pm',
        type: 'list',
        message: '请选择包管理器',
        choices: availablePM,
        default: 'npm',
    }]);

    // 查询当前源
    const npmKey = getNowMirror(pm);

    const { mirror } = await inquirer.prompt([{
        name: 'mirror',
        type: 'list',
        message: '请选择npm源',
        choices: Object.keys(mirrors),
        default: npmKey || '淘宝源',
    }]);

    // 修改源
    const registry = findObj(mirrors, mirror)[1];
    const success = setRegistry(pm, registry);
    
    if (success) {
        print(`${pm} 源切换成功`);
    } else {
        printError(`${pm} 源切换失败`);
    }

    // 再次查询当前源
    getNowMirror(pm);
};

export default setMirror;
