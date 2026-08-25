import { exec } from 'node:child_process'
import path from 'node:path'
import { promisify } from 'node:util'
import { ZipArchive } from 'archiver'
import fs from 'fs-extra'
import inquirer from 'inquirer'
import { print, printError, printSuccess } from '../utils/print.js'
import addVersion from './addversion.js'

const execAsync = promisify(exec)

// 添加空格
function addSpaces(str, start, max) {
  let spaces = '   '
  let num = max - start
  while (num) {
    spaces += ' '
    num--
  }
  return str.slice(0, start) + spaces + str.slice(start)
}

// 处理字符串
function stringOptimization(arr) {
  let maxLength = 0
  const res = []
  arr.forEach((item) => {
    if (item.indexOf('_') > maxLength)
      maxLength = item.indexOf('_')
  })
  arr.forEach((item) => {
    res.push(addSpaces(item, item.indexOf('_'), maxLength))
  })
  return res
}

// 跨平台压缩目录为 zip（Windows/Linux/Mac 通用）
function zipFolder(src, dest) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(dest)
    const archive = new ZipArchive({ zlib: { level: 9 } })
    output.on('close', resolve)
    archive.on('error', reject)
    archive.pipe(output)
    archive.directory(src, false)
    archive.finalize()
  })
}

function run() {
  const cwd = process.cwd()
  if (
    !(
      fs.pathExistsSync(path.join(cwd, 'pnpm-lock.yaml'))
      || fs.pathExistsSync(path.join(cwd, 'package.json'))
    )
  ) {
    printError('未找到可执行脚本')
    return
  }

  const usePnpm = fs.pathExistsSync(path.join(cwd, 'pnpm-lock.yaml'))
  const action = [usePnpm ? 'pnpm' : 'npm run']

  const packageJson = fs.readJsonSync(path.join(cwd, 'package.json'))
  const scriptArr = Object.entries(packageJson.scripts).map(([key, value]) => `${key} _  ${value}`)

  const options = [
    {
      name: 'script',
      type: 'select',
      message: '请选择执行脚本',
      choices: stringOptimization(scriptArr),
    },
    {
      name: 'addVersion',
      type: 'confirm',
      message: 'package.json 的 version 是否加 1',
      default: true,
      when: answers => answers.script.includes('build'),
    },
  ]

  inquirer.prompt(options).then(async (res) => {
    if (res.addVersion)
      addVersion(1)

    action.push(res.script.split('_')[0])

    try {
      await execAsync(action.join(' ').trim())
      printSuccess('脚本执行成功')

      // build 后跨平台压缩 dist 为 dist.zip
      if (res.script.includes('build')) {
        const distPath = path.join(cwd, 'dist')
        const zipPath = path.join(cwd, 'dist.zip')

        if (fs.pathExistsSync(zipPath)) {
          fs.removeSync(zipPath)
          print('删除旧 dist.zip 成功')
        }

        if (!fs.pathExistsSync(distPath)) {
          printError('未找到 dist 目录，跳过压缩')
          return
        }

        await zipFolder(distPath, zipPath)
        printSuccess('压缩 dist 文件夹为 dist.zip 成功')
      }
    }
    catch {
      printError('脚本执行失败')
      if (res.addVersion)
        addVersion(-1)
    }
  }).catch(() => {
    print('操作已取消')
  })
}

export default run
