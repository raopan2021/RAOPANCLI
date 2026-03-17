import fs from 'fs-extra';
import inquirer from 'inquirer';
import { spawn } from 'child_process';
import ora from 'ora';
import { print, printSuccess, printError } from '../utils/print.js';

// 获取项目 dist 文件夹路径
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

// 跨平台 nginx 搜索目录
const getNginxSearchPaths = () => {
    if (process.platform === 'win32') {
        return ['C:/', 'D:/', 'E:/', 'F:/'];
    } else {
        // Linux 常用 nginx 安装路径
        return [
            '/usr/local/nginx',
            '/etc/nginx',
            '/opt/nginx',
            '/usr',
            '/opt',
            '/home',
        ];
    }
};

// 获取 nginx 二进制文件名
const getNginxBinaryName = () => {
    return process.platform === 'win32' ? 'nginx.exe' : 'nginx';
};

// 从根目录开始，遍历寻找 nginx
const serverList = [];
const spinner = ora('本机查找 nginx 服务器中...');

const searchNginxServer = async () => {
    try {
        spinner.start();
        const searchPaths = getNginxSearchPaths();
        
        if (process.platform === 'win32') {
            // Windows: 遍历盘符
            for (const disk of searchPaths) {
                await getServerUrl(disk, 0);
            }
        } else {
            // Linux: 遍历指定目录
            for (const dir of searchPaths) {
                if (fs.existsSync(dir)) {
                    await getServerUrl(dir, 0);
                }
            }
        }
        spinner.succeed('本机查找 nginx 服务器完成');
    } catch (error) {
        spinner.fail('本机查找 nginx 服务器失败');
    }
};

const getServerUrl = async (dir, index) => {
    // 查找的目录层级，最多5层
    if (index > 4) return;
    try {
        const files = await fs.readdir(dir);
        for (const file of files) {
            // 跳过一些文件夹
            if (['node_modules', '.git', 'dist', 'build', 'public', 'src', '.pnpm-store', 'cache'].includes(file))
                continue;
            const filePath = dir + '/' + file;
            spinner.text = '查找中...' + filePath;
            const stats = await fs.stat(filePath);
            const nginxBinary = getNginxBinaryName();
            if (stats.isFile() && file === nginxBinary) {
                serverList.push(dir);
            }
            if (stats.isDirectory()) {
                await getServerUrl(filePath, index + 1);
            }
        }
    } catch (error) {
        // 忽略权限不足等错误
    }
};

// 获取 memory/nginxServer.json 路径
const getNginxServerMemoryPath = () => {
    let jsonPath = import.meta.url.replace('file://', '').replace('/bin/functions/deploy.js', '');
    // 处理 Windows 和 Linux URL 格式差异
    if (process.platform === 'win32') {
        jsonPath = jsonPath.replace('/', '');
    }
    // 确保路径以 / 结尾
    if (!jsonPath.endsWith('/')) {
        jsonPath += '/';
    }
    return jsonPath + 'memory/nginxServer.json';
};

// 从 getServerUrl.json 获取存储 url 的 json 文件
const getNginxServerMemory = () => {
    try {
        const jsonPath = getNginxServerMemoryPath();
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

const nginxDirectories = {};

// 遍历 nginx/html 目录，获取项目列表
const getNginxHtml = async (nginxList) => {
    await nginxList.forEach(async (dirPath) => {
        try {
            const htmlPath = dirPath + '/html';
            if (fs.existsSync(htmlPath)) {
                nginxDirectories[dirPath] = [];
                const entries = await fs.readdir(htmlPath);
                for (const entry of entries) {
                    const entryPath = htmlPath + '/' + entry;
                    const stats = await fs.stat(entryPath);
                    if (stats.isDirectory()) {
                        nginxDirectories[dirPath].push(entryPath);
                    }
                }
            }
        } catch (error) {
            printError(dirPath + '目录读取失败');
        }
    });
};

// 获取项目默认部署目录
const getNginxHtmlDefault = async () => {
    try {
        let nginxServerMemory = getNginxServerMemory().nginxServerMemory;
        projectPath = nginxServerMemory[projectName];
        if (projectPath) {
            printSuccess(`项目默认部署目录：` + projectPath);
        }
    } catch (error) {
        printError('获取项目默认部署目录失败');
    }
};

// 保存项目默认部署目录
const setNginxHtmlDefault = async () => {
    try {
        let { jsonPath, nginxServerMemory } = getNginxServerMemory();
        nginxServerMemory[projectName] = projectPath;
        fs.writeFileSync(jsonPath, JSON.stringify(nginxServerMemory, null, 4), 'utf-8');
        printSuccess(`保存项目默认部署目录成功`);
    } catch (error) {
        printError('保存项目默认部署目录失败');
    }
};

// 复制 dist 文件夹到 nginx 服务器的 html 目录
const copyDist = async () => {
    try {
        await fs.copySync(distPath, projectPath);
        print('复制项目打包文件成功');
    } catch (error) {
        printError('复制项目打包文件失败');
    }
};

// 跨平台重启 nginx 服务
const restartNginx = async () => {
    if (process.platform === 'win32') {
        // Windows: 使用 bat 文件
        const bats = [
            `@echo off`,
            `chcp 65001`,
            `cd "${nginxServerPath}"`,
            `taskkill /f /t /im nginx.exe`,
            `start nginx.exe`,
            `nginx.exe -s reload`,
            `exit`,
        ];
        fs.writeFileSync('restart.bat', bats.join('\n'), 'utf-8');
        const result = spawn('cmd.exe', ['/c', 'restart.bat']);
        result.stdout.on('data', (data) => printSuccess(data.toString().trim()));
        result.stderr.on('data', (data) => printError(data.toString().trim()));
        result.on('exit', code => {
            print('执行完毕 with code ' + code);
            fs.removeSync('restart.bat');
            process.exit();
        });
    } else {
        // Linux: 使用 bash 命令
        const nginxBinary = nginxServerPath + '/sbin/nginx';
        const nginxConf = nginxServerPath + '/conf/nginx.conf';
        
        // 检查 nginx 是否在运行
        const checkNginx = () => {
            return new Promise((resolve) => {
                const result = spawn('pgrep', ['-f', 'nginx']);
                result.on('close', (code) => {
                    resolve(code === 0);
                });
            });
        };

        try {
            // 复制文件
            print('复制文件到 nginx html 目录...');
            
            // 测试 nginx 配置并 reload 或 start
            const isRunning = await checkNginx();
            
            if (isRunning) {
                print('重新加载 nginx 配置...');
                spawn('nginx', ['-s', 'reload', '-c', nginxConf], { 
                    cwd: nginxServerPath,
                    stdio: 'inherit'
                });
            } else {
                print('启动 nginx...');
                spawn('nginx', ['-c', nginxConf], { 
                    cwd: nginxServerPath,
                    stdio: 'inherit'
                });
            }
            
            printSuccess('nginx 重启成功');
            process.exit(0);
        } catch (error) {
            printError('nginx 重启失败: ' + error.message);
            process.exit(1);
        }
    }
};

let distPath = ""; // 项目打包文件路径
let nginxServerPath = ""; // nginx 服务器地址
let projectName = ""; // 项目名称
let projectPath = ""; // 项目部署目录

const deploy = async (skipConfirm = false) => {
    // 获取当前项目的 dist
    const distPath = await getDistPath();

    // 获取当前项目的名称
    await getProjectName();

    // 获取当前项目的默认部署目录
    await getNginxHtmlDefault();

    if (distPath === "") {
        printError('请先打包项目');
        print("raopancli -r");
        process.exit();
    }

    // 获取本地 nginx 服务器地址记录
    let nginxServerMemory = getNginxServerMemory().nginxServerMemory;
    
    // 本地记录里没有 nginx 地址
    if (nginxServerMemory.nginxList.length === 0) {
        await searchNginxServer();
        await setNginxServerMemory({ list: serverList });
        nginxServerMemory = getNginxServerMemory().nginxServerMemory;
    }

    if (nginxServerMemory.nginxList.length === 0) {
        printError('未找到 nginx 服务器，请手动配置');
        if (process.platform === 'win32') {
            print('请将 nginx 放置在 C:/, D:/ 等盘符根目录下');
        } else {
            print('请将 nginx 安装在 /usr/local/nginx, /etc/nginx 等目录下');
        }
        process.exit(1);
    }

    // 遍历 nginx/html 目录，获取所有项目文件夹
    await getNginxHtml(nginxServerMemory.nginxList);

    // 如果 skipConfirm，使用默认配置直接部署
    if (skipConfirm) {
        const defaultNginx = nginxServerMemory.nginxPath || nginxServerMemory.nginxList[0];
        const defaultHtml = projectPath || (nginxDirectories[defaultNginx] ? nginxDirectories[defaultNginx][0] : '');
        
        if (!defaultNginx) {
            printError('没有可用的 nginx 服务器');
            process.exit(1);
        }
        
        if (!defaultHtml) {
            printError('没有可用的部署目录');
            process.exit(1);
        }
        
        nginxServerPath = defaultNginx;
        projectPath = defaultHtml;
        
        print(`使用默认配置: ${defaultNginx} -> ${defaultHtml}`);
        
        // 保存项目默认部署目录
        await setNginxHtmlDefault();
        await setNginxServerMemory({ path: nginxServerPath });
        await copyDist();
        restartNginx();
        return;
    }

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
        choices: answer => nginxDirectories[answer.nginxServer] || [],
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
