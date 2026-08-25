import path from 'node:path'
import fs from 'fs-extra'
import { print, printError } from '../utils/print.js'

// 从 package.json 中获取版本号，给最后一位加 num
function addVersion(num) {
  print(`package.json 版本号加${num}`)
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json')
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))

    // 修改 version
    const version = packageJson.version.split('.')
    version[version.length - 1] = parseInt(version[version.length - 1]) + num
    packageJson.version = version.join('.')

    // 更新 package.json
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))
    print(`版本更新到 ${packageJson.version}`)
  }
  catch {
    printError('package.json 版本号更新失败')
  }
}

export default addVersion
