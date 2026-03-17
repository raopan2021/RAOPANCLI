import fs from "fs-extra";
import inquirer from "inquirer";
import shell from "shelljs";
import { spawn } from "child_process";
import { print, printError } from "../utils/print.js";
import addVersion from "./addversion.js";

// 添加空格
const addSpaces = (str, start, max) => {
    let spaces = "   ";
    let num = max - start;
    while (num) {
        spaces += " ";
        num--;
    }
    return str.slice(0, start) + spaces + str.slice(start);
};

// 处理字符串
const stringOptimization = (arr) => {
    let maxLength = 0;
    const res = [];
    arr.forEach((item) => {
        if (item.indexOf("_") > maxLength) {
            maxLength = item.indexOf("_");
        }
    });
    arr.forEach((item) => {
        res.push(addSpaces(item, item.indexOf("_"), maxLength));
    });
    return res;
};

// 打开浏览器
const openBrowser = (url) => {
    const browserCmd = process.platform === 'win32' ? 'start' : 
                       process.platform === 'darwin' ? 'open' : 'xdg-open';
    spawn(browserCmd, [url], { detached: true, stdio: 'ignore' });
};

// 检测 dev 服务器并打开浏览器
const waitForServer = (url, timeout = 30000) => {
    return new Promise((resolve) => {
        const startTime = Date.now();
        const check = () => {
            // 简单延迟后打开浏览器
            setTimeout(() => {
                print(`正在打开浏览器: ${url}`);
                openBrowser(url);
                resolve();
            }, 2000);
        };
        check();
    });
};

const run = (skipConfirm = false, autoOpen = false) => {
    try {
        if (
            !(
                fs.pathExistsSync(process.cwd() + "/pnpm-lock.yaml") ||
                fs.pathExistsSync(process.cwd() + "/package.json")
            )
        ) {
            printError("未找到可执行脚本，请确保当前目录是项目根目录");
            return;
        }

        const action = [];
        let npmWay = 'npm';
        
        // 自动检测包管理器优先级: pnpm > yarn > bun > npm
        if (fs.pathExistsSync(process.cwd() + "/pnpm-lock.yaml")) {
            npmWay = "pnpm";
        } else if (fs.pathExistsSync(process.cwd() + "/yarn.lock")) {
            npmWay = "yarn";
        } else if (fs.pathExistsSync(process.cwd() + "/bun.lockb")) {
            npmWay = "bun";
        }
        
        // 检查 npm/pnpm/yarn/bun 是否可用
        if (!shell.which(npmWay)) {
            printError(`未找到 ${npmWay}，请先安装`);
            return;
        }
        
        const runCmd = npmWay === 'yarn' ? 'yarn' : 
                       npmWay === 'bun' ? 'bun run' : 
                       (npmWay === "npm" ? "npm run" : "pnpm");
        action.push(runCmd);

        const packageJson = fs.readJsonSync(process.cwd() + "/package.json");
        
        if (!packageJson.scripts || Object.keys(packageJson.scripts).length === 0) {
            printError("package.json 中未找到 scripts");
            return;
        }
        
        const scriptArr = [];

        Object.entries(packageJson.scripts).forEach(([key, value]) => {
            scriptArr.push(`${key} _  ${value}`);
        });

        const options = [
            {
                name: "script",
                type: "list",
                message: "请选择执行脚本",
                default: scriptArr[0],
                choices: stringOptimization(scriptArr),
            },
            {
                name: "addVersion",
                type: "confirm",
                message: "package.json 的 version 是否加 1",
                default: false,
                when: () => !skipConfirm,
            },
        ];

        // 如果 skipConfirm 为 true，自动选择第一个脚本
        if (skipConfirm) {
            const defaultScript = scriptArr[0];
            const isDev = defaultScript.includes("dev") || defaultScript.includes("serve");
            const isBuild = defaultScript.includes("build");
            
            if (isBuild) {
                addVersion(1);
            }
            
            const scriptName = defaultScript.split("_")[0];
            action.push(scriptName);
            
            print('执行脚本: ' + scriptName);
            
            // 如果是 dev 命令且 autoOpen 为 true，使用 spawn 以保持进程
            if (isDev && autoOpen) {
                const devCmd = npmWay === 'yarn' ? 'yarn' : 
                               npmWay === 'bun' ? 'bun' : 
                               (npmWay === "npm" ? 'npm' : 'pnpm');
                const args = npmWay === 'yarn' ? [scriptName] : 
                             npmWay === 'bun' ? ['run', scriptName] : 
                             ['run', scriptName];
                
                const child = spawn(devCmd, args, {
                    cwd: process.cwd(),
                    stdio: 'inherit',
                    shell: true
                });
                
                child.on('close', (code) => {
                    if (code !== 0) {
                        printError(`脚本执行失败，退出码: ${code}`);
                    }
                });
                
                // 等待服务启动后打开浏览器
                setTimeout(() => {
                    const url = packageJson.devServer?.host ? 
                        `http://${packageJson.devServer.host}:${packageJson.devServer.port || 5173}` :
                        'http://localhost:5173';
                    waitForServer(url);
                }, 3000);
                
                return;
            }
            
            // 否则使用 shell.exec（原有逻辑）
            shell.exec(action.join(" ").trim(), (code) => {
                if (code !== 0) {
                    printError("脚本执行失败");
                    if (isBuild) addVersion(-1);
                } else if (isBuild) {
                    // 跨平台压缩 dist 文件夹
                    if (fs.pathExistsSync(process.cwd() + "/dist.zip")) {
                        print("删除dist.zip文件成功");
                        fs.removeSync(process.cwd() + "/dist.zip");
                    }

                    if (process.platform === 'win32') {
                        shell.exec(
                            "powershell -command Compress-Archive -Path dist -DestinationPath dist.zip"
                        );
                    } else {
                        shell.exec(
                            "zip -r dist.zip dist"
                        );
                    }
                    print("压缩dist文件夹成功");
                }
            });
            return;
        }

        inquirer.prompt(options).then((res) => {
            if (res.addVersion) addVersion(1);

            const scriptName = res.script.split("_")[0];
            const isDev = res.script.includes("dev") || res.script.includes("serve");
            const isBuild = res.script.includes("build");
            
            action.push(scriptName);
            
            print('执行脚本: ' + scriptName);

            // 如果是 dev 命令且 autoOpen 为 true
            if (isDev && autoOpen) {
                const devCmd = npmWay === 'yarn' ? 'yarn' : 
                               npmWay === 'bun' ? 'bun' : 
                               (npmWay === "npm" ? 'npm' : 'pnpm');
                const args = npmWay === 'yarn' ? [scriptName] : 
                             npmWay === 'bun' ? ['run', scriptName] : 
                             ['run', scriptName];
                
                const child = spawn(devCmd, args, {
                    cwd: process.cwd(),
                    stdio: 'inherit',
                    shell: true
                });
                
                child.on('close', (code) => {
                    if (code !== 0) {
                        printError(`脚本执行失败，退出码: ${code}`);
                    }
                });
                
                setTimeout(() => {
                    const url = packageJson.devServer?.host ? 
                        `http://${packageJson.devServer.host}:${packageJson.devServer.port || 5173}` :
                        'http://localhost:5173';
                    waitForServer(url);
                }, 3000);
                return;
            }

            shell.exec(action.join(" ").trim(), (code) => {
                if (code !== 0) {
                    printError("脚本执行失败");
                    if (res.addVersion) addVersion(-1);
                }

                // 跨平台压缩 dist 文件夹
                if (isBuild) {
                    // 看目录是否有dist.zip文件，有则删除
                    if (fs.pathExistsSync(process.cwd() + "/dist.zip")) {
                        print("删除dist.zip文件成功");
                        fs.removeSync(process.cwd() + "/dist.zip");
                    }

                    // 跨平台压缩命令
                    if (process.platform === 'win32') {
                        shell.exec(
                            "powershell -command Compress-Archive -Path dist -DestinationPath dist.zip"
                        );
                    } else {
                        shell.exec(
                            "zip -r dist.zip dist"
                        );
                    }
                    print("压缩dist文件夹成功");
                }
            });
        });
    } catch (error) {
        printError('运行错误: ' + error.message);
    }
};

export default run;
