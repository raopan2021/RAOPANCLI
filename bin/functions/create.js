import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'fs-extra'
import inquirer from 'inquirer'
import ora from 'ora'
import { print, printError } from '../utils/print.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// lib 目录位于 bin/functions 的上级两级
const libDir = path.resolve(__dirname, '../../lib')

const options = [
  {
    name: 'project',
    type: 'input',
    message: 'Project name',
    default: 'rpcli-demo',
  },
  {
    name: 'framework',
    type: 'select',
    message: 'Select a framework',
    choices: [
      'lit',
      'preact',
      'qwik',
      'react',
      'solid',
      'svelte',
      'vanilla',
      'vue',
    ],
  },
  {
    name: 'variant',
    type: 'select',
    message: 'Select a variant',
    choices: ['TypeScript', 'JavaScript'],
  },
]

function create() {
  inquirer.prompt(options).then((res) => {
    print(`项目名称： ${res.project}`)
    print(`项目框架： ${res.framework}`)
    print(`${res.variant === 'JavaScript' ? '不 ' : ''}使用ts`)

    let fileDir = path.join(libDir, `template-${res.framework}`)
    if (res.variant === 'TypeScript')
      fileDir += '-ts'

    const targetDir = path.join(process.cwd(), res.project)
    if (fs.pathExistsSync(targetDir)) {
      printError(`目标目录已存在：${targetDir}`)
      return
    }

    const spinner = ora('正在创建项目').start()
    fs.copySync(fileDir, targetDir)
    spinner.succeed('项目创建成功')

    // 修改 package.json 的 name 字段
    const packageJsonPath = path.join(targetDir, 'package.json')
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
    packageJson.name = res.project
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))

    print(`cd ${res.project}`)
    print('pnpm i')
    print('pnpm dev')
  }).catch(() => {
    print('操作已取消')
  })
}

export default create
