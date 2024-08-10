import fs from "fs-extra";
import inquirer from "inquirer";
import { spawn } from "child_process";
import print from "../utils/print.js";
import printError from "../utils/printError.js";

// 从当前目录，获取 dist 文件夹路径
const getDistUrl = () => {
    const url = process.cwd() + '/dist';
    if (fs.lstatSync(url).isDirectory()) {
        print('\n当前目录的 dist 文件夹：' + url + '\n');
        return url;
    }
    return '';
}

// 从C盘开始，遍历寻找 nginx.exe
const serverList = []
const getDisk = async (dist) => {
    dist += ':/'
    while (fs.existsSync(dist)) {
        await getServerUrl(dist, 0)
        dist = String.fromCharCode(dist.charCodeAt(0) + 1) //C加1，就是D（遍历C盘，D盘）
        await getDisk(dist) // 递归调用
    }
    if (serverList.length > 0) {
        print(`\n${dist}盘 查找 nginx 服务器结束\n`)
    } else {
        print(`\n${dist}盘 未找到 nginx 服务器\n`)
    }
}
const getServerUrl = async (dir, index) => {
    try {
        const files = await fs.readdir(dir)
        for (const file of files) {
            const filePath = dir + '/' + file
            const stats = await fs.stat(filePath)
            if (stats.isFile() && file == 'nginx.exe') {
                serverList.push(filePath)
            }
            if (stats.isDirectory()) {
                await getServerUrl(filePath, index + 1)
            }
        }
    } catch (error) {

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
    // 创建restart.bat文件
    fs.writeFileSync('restart.bat', `cd ${path}\ntaskkill /f /t /im nginx.exe\nstart nginx.exe\nnginx.exe -s reload\ntimeout /t 3\nexit`);

    // 执行restart.bat文件
    const result = spawn("cmd.exe", ['/c', 'restart.bat']);

    //输出正常情况下的控制台信息
    result.stdout.on("data", function (data) {
        print('Success: ' + data);
    });
    //输出报错信息
    result.stderr.on("data", function (data) {
        printError("Error: " + data);
    });
    //当程序执行完毕后的回调，那个code一般是0
    result.on("exit", function (code) {
        print("执行完毕 with code " + code);
        fs.removeSync('restart.bat') // 清除bat文件
    });
}

const deploy = async () => {
    // 获取当前目录的dist
    const distPath = await getDistUrl()

    let urlMemory = getUrlMemory()

    // 本地记录里没有 nginx.exe 的地址
    if (urlMemory.urlList.length === 0) {
        await getDisk('C')

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