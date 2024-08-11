import fs from "fs-extra";
import inquirer from "inquirer";
import { spawn } from "child_process";
import ora from 'ora';
import { print, printSuccess, printError } from "../utils/print.js";

// 从当前目录，获取 dist 文件夹路径
const getDistUrl = () => {
    const url = process.cwd() + '/dist';
    if (fs.lstatSync(url).isDirectory()) {
        print('\n当前项目的 dist 文件夹：' + url + '\n');
        return url;
    }
    return '';
}


// 从C盘开始，遍历寻找 nginx.exe
const serverList = []
const spinner = ora('本机查找 nginx 服务器中...')
const searchNginxServer = async () => {
    try {
        spinner.start()
        await getDisk('C')
        spinner.succeed("本机查找 nginx 服务器完成");
    } catch (error) {
        spinner.fail("本机查找 nginx 服务器失败");
    }
}
const getDisk = async (dist) => {
    dist += ':/'
    while (fs.existsSync(dist)) {
        await getServerUrl(dist, 0)
        dist = String.fromCharCode(dist.charCodeAt(0) + 1) //C加1，就是D（遍历C盘，D盘）
        await getDisk(dist) // 递归调用
    }
}
const getServerUrl = async (dir, index) => {
    // 查找的目录层级，最多5层
    if (index > 4) return
    try {
        const files = await fs.readdir(dir)
        for (const file of files) {
            // 跳过一些文件夹
            if (['node_modules', '.git', 'dist', 'build', 'public', 'src'].includes(file)) continue
            const filePath = dir + '/' + file
            spinner.text = '查找中...' + filePath;
            const stats = await fs.stat(filePath)
            if (stats.isFile() && file == 'nginx.exe') {
                serverList.push(filePath)
            }
            if (stats.isDirectory()) {
                await getServerUrl(filePath, index + 1)
            }
        }
    } catch (error) {
        printError(dir + '目录读取失败')
    }
}

// 从 getServerUrl.json 获取存储 url 的 json 文件
const getUrlMemory = () => {
    try {
        const jsonPath = import.meta.url.replace('file:///', '').replace('functions/deploy.js', 'memory/serverUrl.json')
        const { urlDefault, urlList } = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
        return { jsonPath, urlDefault, urlList }
    } catch (error) {
        printError('获取 nginx 目录失败')
    }
}
const setUrlMemory = ({ url = '', list = [] }) => {
    try {
        // 读取存储 getServerUrl.json 文件
        let { jsonPath, urlDefault, urlList } = getUrlMemory()
        if (url !== '') urlDefault = url
        if (list.length > 0) urlList = list
        fs.writeFileSync(jsonPath, JSON.stringify({ urlDefault, urlList }, null, 4), 'utf-8')
        print(`写入 nginx 目录成功`)
    } catch (error) {
        printError('写入 nginx 目录失败')
    }
}

// 重启 nginx 服务
const restartNginx = async (path) => {
    const bats = [
        `@echo off\nchcp 65001`,
        `cd ${path}`,
        `taskkill /f /t /im nginx.exe`,
        `start nginx.exe`,
        `nginx.exe -s reload`,
        `timeout /t 3`,
        `exit`
    ]
    // 创建restart.bat文件
    fs.writeFileSync('restart.bat', bats.join('\n'), 'utf-8');
    // 执行restart.bat文件
    const result = spawn("cmd.exe", ['/c', 'restart.bat']);
    result.stdout.on("data", data => printSuccess(data + '')); //输出正常情况下的控制台信息
    result.stderr.on("data", data => printError("" + data)); //输出报错信息
    result.on("exit", code => print("执行完毕 with code " + code)); //当程序执行完毕后的回调，那个code一般是0
    result.on("close", () => fs.removeSync('restart.bat')); // 清除bat文件
}

const deploy = async () => {
    // 获取当前项目的 dist
    const distPath = await getDistUrl()

    // 获取本地 nginx.exe 服务器地址 记录
    let urlMemory = getUrlMemory()
    // 本地记录里没有 nginx.exe 的地址
    if (urlMemory.urlList.length === 0) {
        await searchNginxServer() // 搜索 nginx.exe
        await setUrlMemory({ list: serverList })
        urlMemory = getUrlMemory()
    }

    inquirer.prompt([{
        name: 'nginxServer',
        type: 'list',
        message: '请选择 nginx 服务器',
        default: urlMemory.urlDefault,
        choices: urlMemory.urlList
    }]).then(async (res) => {
        // 保存 nginx 默认服务器地址
        await setUrlMemory({ url: res.nginxServer })

        // 复制 dist 文件夹到 nginx 服务器的 html 目录
        try {
            fs.copySync(distPath, res.nginxServer.replace('nginx.exe', 'html/vite'))
            print('\n复制 dist 成功\n')
        } catch (error) {
            printError('\n复制 dist 失败\n')
        }

        // 重启 nginx
        restartNginx(res.nginxServer.replace('/nginx.exe', ''))
    })
}

export default deploy