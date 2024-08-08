// 从package.json中获取版本号，给最后一位加1
import fs from 'fs-extra';
import print from '../utils/print.js';

const addVersion = (num) => {
    print('package.json版本号加' + num);
    try {
        // 读取package.json
        const packageJsonPath = process.cwd() + '/package.json';
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

        // 修改version
        const version = packageJson.version.split('.');
        version[version.length - 1] =
            parseInt(version[version.length - 1]) + num;
        packageJson.version = version.join('.');

        // 更新package.json
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
        print(`\n版本更新到 ${packageJson.version}\n`)
    } catch (err) {
        printError('package.json版本号更新失败');
    }
};

export default addVersion;
