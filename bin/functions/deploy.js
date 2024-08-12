import fs from 'fs-extra';
import inquirer from 'inquirer';
import { spawn } from 'child_process';
import ora from 'ora';
import { print, printSuccess, printError } from '../utils/print.js';

// 从当前目录，获取 dist 文件夹路径
const getDistPath = () => {
    const path = process.cwd() + '/dist';
    try {
        if (fs.access(path) && fs.lstatSync(path)?.isDirectory()) {
            printSuccess('当前项目的 dist 文件夹：' + path);
            return path;
        }
        return '';
    } catch (error) {
        return '';
    }
};
// 获取项目名称
const getProjectName = () => {
    try {
        const packageJsonPath = process.cwd() + '/package.json';
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        projectName = packageJson.name;
        printSuccess('项目名称：' + projectName);
    } catch (error) {
        printError('获取项目名称失败');
    }

}


// 从C盘开始，遍历寻找 nginx.exe
const serverList = [];
const spinner = ora('本机查找 nginx 服务器中...');
const searchNginxServer = async () => {
    try {
        spinner.start();
        await getDisk('C');
        spinner.succeed('本机查找 nginx 服务器完成');
    } catch (error) {
        spinner.fail('本机查找 nginx 服务器失败');
    }
};
const getDisk = async (dist) => {
    dist += ':/';
    while (fs.existsSync(dist)) {
        await getServerUrl(dist, 0);
        dist = String.fromCharCode(dist.charCodeAt(0) + 1); //C加1，就是D（遍历C盘，D盘）
        await getDisk(dist); // 递归调用
    }
};
const getServerUrl = async (dir, index) => {
    // 查找的目录层级，最多5层
    if (index > 4) return;
    try {
        const files = await fs.readdir(dir);
        for (const file of files) {
            // 跳过一些文件夹
            if (['node_modules', '.git', 'dist', 'build', 'public', 'src', '.pnpm-store',].includes(file))
                continue;
            const filePath = dir + '/' + file;
            spinner.text = '查找中...' + filePath;
            const stats = await fs.stat(filePath);
            if (stats.isFile() && file === 'nginx.exe') {
                serverList.push(dir);
            }
            if (stats.isDirectory()) {
                await getServerUrl(filePath, index + 1);
            }
        }
    } catch (error) {
        printError(dir + '目录读取失败');
    }
};


// 从 getServerUrl.json 获取存储 url 的 json 文件
const getNginxServerMemory = () => {
    try {
        const jsonPath = import.meta.url.replace('file:///', '').replace('functions/deploy.js', 'memory/nginxServer.json');
        const nginxServerMemory = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        return { jsonPath, nginxServerMemory };
    } catch (error) {
        printError('获取 nginx 目录失败');
    }
};
const setNginxServerMemory = ({ path = '', list = [] }) => {
    try {
        // 读取存储 getServerUrl.json 文件
        let { jsonPath, nginxServerMemory } = getNginxServerMemory();
        if (path !== '') nginxServerMemory.nginxPath = path;
        if (list.length > 0) nginxServerMemory.nginxList = list;
        fs.writeFileSync(jsonPath, JSON.stringify(nginxServerMemory, null, 4), 'utf-8');
        printSuccess(`写入 nginx 目录成功`);
    } catch (error) {
        printError('写入 nginx 目录失败');
    }
};


const nginxDirectories = {
    // "D://APP/nginx-1.22.0-tlias/nginx.exe": ["vite", "react", "vue", "angular"],
}
// 遍历 nginx/html 目录，获取项目列表
const getNginxHtml = async (nginxList) => {
    await nginxList.forEach(async (dirPath) => {
        try {
            nginxDirectories[dirPath] = []; // D://APP/nginx-1.22.0-tlias/nginx.exe
            const entries = await fs.readdir(dirPath + '/html');
            for (const entry of entries) {
                const entryPath = dirPath + '/html/' + entry;
                const stats = await fs.stat(entryPath);
                if (stats.isDirectory) {
                    nginxDirectories[dirPath].push(entryPath); // D://APP/nginx-1.22.0-tlias/html/vite  :["vite"]
                }
            }
        } catch (error) {
            printError(dirPath + '目录读取失败');
        }
    })
}
// 获取项目默认部署目录
const getNginxHtmlDefault = async () => {
    try {
        // 读取存储 getServerUrl.json 文件
        let nginxServerMemory = getNginxServerMemory().nginxServerMemory;
        projectPath = nginxServerMemory[projectName];
        printSuccess(`项目默认部署目录：` + projectPath);
    } catch (error) {
        printError('获取项目默认部署目录失败');
    }
}
// 保存项目默认部署目录
const setNginxHtmlDefault = async () => {
    try {
        // 读取存储 getServerUrl.json 文件
        let { jsonPath, nginxServerMemory } = getNginxServerMemory();
        nginxServerMemory[projectName] = projectPath;
        fs.writeFileSync(jsonPath, JSON.stringify(nginxServerMemory, null, 4), 'utf-8');
        printSuccess(`保存项目默认部署目录成功`);
    } catch (error) {
        printError('保存项目默认部署目录失败');
    }
}


// 复制 dist 文件夹到 nginx 服务器的 html 目录
const copyDist = async () => {
    try {
        await fs.copySync(distPath, projectPath);
        print('复制项目打包文件成功');
    } catch (error) {
        printError('复制项目打包文件失败');
    }
}


// 重启 nginx 服务
const restartNginx = async () => {
    const bats = [
        `@echo off`,
        `chcp 65001`,
        `cd ${nginxServerPath}`,
        `taskkill /f /t /im nginx.exe`,
        `start nginx.exe`,
        `nginx.exe -s reload`,
        `exit`,
    ];
    // 创建restart.bat文件
    fs.writeFileSync('restart.bat', bats.join('\n'), 'utf-8');
    // 执行restart.bat文件
    const result = spawn('cmd.exe', ['/c', 'restart.bat']);
    result.stdout.on('data', (data) => printSuccess(data.toString().trim())); //输出正常情况下的控制台信息
    result.stderr.on('data', (data) => printError(data.toString().trim())); //输出报错信息
    result.on('exit', code => {
        print('执行完毕 with code ' + code) //当程序执行完毕后的回调，那个code一般是0
        fs.removeSync('restart.bat') // 清除bat文件
        process.exit(); // 退出程序
    });
};


let distPath = "" // 项目打包文件路径
let nginxServerPath = "" // nginx 服务器地址
let projectName = "" // 项目名称
let projectPath = "" // 项目部署目录


const deploy = async () => {
    // 获取当前项目的 dist
    const distPath = await getDistPath();

    // 获取当前项目的名称
    await getProjectName();

    // 获取当前项目的默认部署目录
    await getNginxHtmlDefault();

    if (distPath === "") {
        printError('请先打包项目');
        print("raopancli -r")
        process.exit(); // 退出程序
    }

    // 获取本地 nginx.exe 服务器地址 记录
    let nginxServerMemory = getNginxServerMemory().nginxServerMemory;
    // 本地记录里没有 nginx.exe 的地址
    if (nginxServerMemory.nginxList.length === 0) {
        await searchNginxServer(); // 搜索 nginx.exe
        await setNginxServerMemory({ list: serverList });
        nginxServerMemory = getNginxServerMemory().nginxServerMemory;
    }

    // 遍历 nginx/html 目录，获取所有项目文件夹
    await getNginxHtml(nginxServerMemory.nginxList);

    await inquirer.prompt([{
        name: 'nginxServer',
        type: 'list',
        message: '请选择 nginx 服务器',
        default: nginxServerMemory.nginxPath,
        choices: nginxServerMemory.nginxList,
    }, {
        name: 'html',
        type: 'list',
        message: '请选择项目部署目录',
        default: projectPath,
        choices: answer => nginxDirectories[answer.nginxServer],
    }])
        .then(async (res) => {
            nginxServerPath = res.nginxServer;
            projectPath = res.html;

            // 保存项目默认部署目录
            await setNginxHtmlDefault();

            // 保存 nginx 默认服务器地址
            await setNginxServerMemory({ path: nginxServerPath });

            // 复制 dist 文件夹到 nginx 服务器的 html 目录
            await copyDist();

            // 重启 nginx
            restartNginx();
        });
};

export default deploy;
