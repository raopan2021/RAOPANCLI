#! /usr/bin/env node

import {Command} from 'commander';
import fs from 'fs-extra';
import print from './utils/print.js';
import printLogo from './utils/printLogo.js';
import deleteNodeModules from './functions/delete_node_modules.js';
import deploy from './functions/deploy.js';
import create from './functions/create.js';
import run from './functions/run.js';
import setMirror from './functions/setMirror.js';
import printHelp from './functions/printHelp.js';

const program = new Command();

let fileDirTemp = import.meta.url.replace('file:///', '').replace('bin/index.js', '');

program
    .name('raopancli 脚手架')
    .description('raopan 的 JavaScript 脚手架工具')
    .option('-h --help', '查看帮助信息')
    .option('-v --version', '查看脚手架版本号')
    .option('-r --run', '本地启动项目或打包项目')
    .option('-dn --delete', '删除当前目录的 node_modules')
    .option('-d --deploy', '部署当前项目到本机 nginx')
    .option('-c --create', '生成 vite 项目')
    .option('-s --setMirror', '切换 npm 源')
    .action(async (options) => {
        if (options.version) {
            print(JSON.parse(fs.readFileSync(fileDirTemp + 'package.json', 'utf-8')).version);
        } else if (options.run) {
            printLogo();
            run();
        } else if (options.delete) {
            deleteNodeModules();
        } else if (options.deploy) {
            deploy();
        } else if (options.create) {
            printLogo();
            create();
        } else if (options.setMirror) {
            setMirror();
        } else if (options.help) {
            printHelp(program.name(), program.description(), program.helpCommand().options);
        }
        if (JSON.stringify(options) == '{}') {
            printLogo();
        }
    });

program.parse();
