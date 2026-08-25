import { execSync } from 'node:child_process'
import inquirer from 'inquirer'
import { print, printError } from '../utils/print.js'

const mirrors = {
  npm官方: 'https://registry.npmjs.org/',
  淘宝源: 'https://registry.npmmirror.com/',
  阿里源: 'https://npm.aliyun.com/',
  腾讯源: 'https://mirrors.cloud.tencent.com/npm/',
  华为源: 'https://mirrors.huaweicloud.com/repository/npm/',
  清华源: 'https://mirrors.tuna.tsinghua.edu.cn/',
}

function findObj(obj, str) {
  for (const [key, value] of Object.entries(obj)) {
    if (key.includes(str) || String(value.split('//')[1]).includes(str.split('//')[1]))
      return [key, value]
  }
  return ['', '']
}

// 查询当前源
function getNowMirror() {
  const npmNow = execSync('npm config get registry', { encoding: 'utf-8' }).trim()
  const [key, value] = findObj(mirrors, npmNow)
  if (key && value === npmNow) {
    print(`当前 npm 源为 - ${key}: ${value}`)
    return key
  }
  printError('您当前使用的 npm 源不在列表中')
  return ''
}

async function setMirror() {
  // 查询当前源
  const npmKey = getNowMirror()

  try {
    const res = await inquirer.prompt([{
      name: 'npm',
      type: 'select',
      message: '请选择 npm 源',
      choices: Object.keys(mirrors),
      default: npmKey,
    }])
    // 修改源
    try {
      const [, url] = findObj(mirrors, res.npm)
      if (!url) {
        print('切换失败')
        return
      }
      execSync(`npm config set registry ${url}`, { encoding: 'utf-8' }).trim()
      print('切换成功')
    }
    catch {
      print('切换失败')
    }

    // 再次查询当前源
    getNowMirror()
  }
  catch {
    print('切换失败')
  }
}

export default setMirror
