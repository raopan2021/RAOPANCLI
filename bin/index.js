#!/usr/bin/env node

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Command } from 'commander'
import fs from 'fs-extra'
import create from './functions/create.js'
import deleteNodeModules from './functions/delete_node_modules.js'
import deploy, { deployRestore } from './functions/deploy.js'
import run from './functions/run.js'
import setMirror from './functions/setMirror.js'
import { printError } from './utils/print.js'
import printLogo from './utils/printLogo.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pkg = fs.readJsonSync(path.join(__dirname, '../package.json'))

const program = new Command()

program
  .name('raopancli')
  .description('raopan 的 JavaScript 脚手架工具')
  .version(pkg.version, '-v, --version', '查看脚手架版本号')
  .helpOption('-h, --help', '查看帮助信息')
  .option('-r, --run', '本地启动项目或打包项目')
  .option('-D, --delete', '删除当前目录的 node_modules')
  .option('-n, --deploy', '部署当前项目到本机 nginx（自动备份）')
  .option('-N, --restore', '恢复部署备份（从最近的备份恢复）')
  .option('-c, --create', '生成 vite 项目')
  .option('-s, --setMirror', '切换 npm 源')
  .action(async (options) => {
    if (options.run) {
      printLogo()
      run()
    }
    else if (options.delete) {
      deleteNodeModules()
    }
    else if (options.deploy) {
      deploy().catch(() => printError('部署操作已取消'))
    }
    else if (options.restore) {
      deployRestore().catch(() => printError('恢复操作已取消'))
    }
    else if (options.create) {
      printLogo()
      create()
    }
    else if (options.setMirror) {
      setMirror()
    }
    else if (Object.keys(options).length === 0) {
      printLogo()
    }
  })

program.parse()
