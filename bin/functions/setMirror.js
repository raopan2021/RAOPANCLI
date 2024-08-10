// 切换npm源
import { execSync } from 'child_process';
import inquirer from 'inquirer';
import print from '../utils/print.js';
import printError from '../utils/printError.js';

const mirrors = {
    'npm官方': 'https://registry.npmjs.org/',
    '淘宝源': 'https://registry.npmmirror.com/',
    '阿里源': 'https://npm.aliyun.com/',
    '腾讯源': 'https://mirrors.cloud.tencent.com/npm/',
    '华为源': 'https://mirrors.huaweicloud.com/repository/npm/',
    '清华源': 'https://mirrors.tuna.tsinghua.edu.cn/',
}

const findObj = (obj, str) => {
    for (const [key, value] of Object.entries(obj)) {
        if (key.includes(str) || String(value.split('//')[1]).includes(str.split('//')[1])) {
            return [key, value];
        }
    }
    return ['', ''];
};

// 查询当前源
const getNowMirror = () => {
    const npmNow = execSync('npm config get registry', { encoding: 'utf-8' }).trim();
    const [key, value] = findObj(mirrors, npmNow);
    if (key && value === npmNow) {
        print('\n' + '当前 npm 源为 - ' + key + ': ' + value + '\n');
        return key;
    } else {
        printError('您当前使用的npm源不在列表中');
        return '';
    }
};

const setMirror = async () => {
    // 查询当前源
    const npmKey = await getNowMirror();

    try {
        const res = await inquirer.prompt([{
            name: 'npm',
            type: 'list',
            message: '请选择npm源',
            choices: Object.keys(mirrors),
            default: npmKey,
        }]);
        // 修改源
        try {
            execSync('npm config set registry ' + findObj(mirrors, res.npm)[1], { encoding: 'utf-8', }).trim();
            print('切换成功');
        } catch (error) {
            print('切换失败');
        }

        // 再次查询当前源
        await getNowMirror();
    } catch (error) {
        print('切换失败');
    }
};

export default setMirror;
