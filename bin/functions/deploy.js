import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'fs-extra'
import inquirer from 'inquirer'
import ora from 'ora'
import { print, printError, printSuccess } from '../utils/print.js'

const isWindows = process.platform === 'win32'
const nginxName = isWindows ? 'nginx.exe' : 'nginx'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const memoryPath = path.join(__dirname, '../memory/nginxServer.json')
const backupDir = path.join(__dirname, '../memory/deploy-backups')

// 供测试注入自定义路径
let _memoryPath = memoryPath
let _backupDir = backupDir
function _setPaths({ memoryPath: mp, backupDir: bd } = {}) {
  if (mp)
    _memoryPath = mp
  if (bd)
    _backupDir = bd
}

let distPath = ''
let projectName = ''

// ─── 内存读写 ───
function readMemory() {
  try {
    return JSON.parse(fs.readFileSync(_memoryPath, 'utf-8'))
  }
  catch {
    return { nginxPath: '', nginxList: [], projects: {} }
  }
}

function writeMemory(memory) {
  fs.writeFileSync(_memoryPath, JSON.stringify(memory, null, 2), 'utf-8')
}

// ─── 提示辅助 ───
// inquirer 的 catch 由调用方处理，这里统一包装
async function ask(questions) {
  return inquirer.prompt(questions)
}

// ─── 获取 dist / 项目名 ───
function getDistPath() {
  const dist = path.join(process.cwd(), 'dist')
  if (fs.pathExistsSync(dist)) {
    printSuccess(`当前项目的 dist 文件夹：${dist}`)
    return dist
  }
  return ''
}

function getProjectName() {
  try {
    const packageJson = fs.readJsonSync(path.join(process.cwd(), 'package.json'))
    projectName = packageJson.name
    printSuccess(`项目名称：${projectName}`)
  }
  catch {
    printError('获取项目名称失败')
  }
}

// ─── 本机查找 nginx ───
const serverList = []
const spinner = ora('本机查找 nginx 服务器中...')

async function searchNginxServer() {
  try {
    spinner.start()
    const roots = isWindows ? getWindowsDrives() : ['/']
    for (const root of roots)
      await getServerUrl(root, 0)
    spinner.succeed('本机查找 nginx 服务器完成')
  }
  catch {
    spinner.fail('本机查找 nginx 服务器失败')
  }
}

function getWindowsDrives() {
  const drives = []
  for (let i = 65; i <= 90; i++) {
    const drive = `${String.fromCharCode(i)}:/`
    if (fs.existsSync(drive))
      drives.push(drive)
  }
  return drives
}

async function getServerUrl(dir, index) {
  if (index > 5)
    return
  try {
    const files = await fs.readdir(dir)
    for (const file of files) {
      if (['node_modules', '.git', 'dist', 'build', 'public', 'src', '.pnpm-store'].includes(file))
        continue
      const filePath = path.join(dir, file)
      spinner.text = `查找中...${filePath}`
      const stats = await fs.stat(filePath)
      if (stats.isFile() && file === nginxName)
        serverList.push(dir)
      if (stats.isDirectory())
        await getServerUrl(filePath, index + 1)
    }
  }
  catch {
    // 忽略无权限读取的目录
  }
}

// 遍历 nginx/html 目录，获取项目文件夹列表
async function getNginxHtml(nginxServerPath) {
  const htmlDir = path.join(nginxServerPath, 'html')
  const dirs = []
  if (!fs.pathExistsSync(htmlDir))
    return dirs
  const entries = await fs.readdir(htmlDir)
  for (const entry of entries) {
    const entryPath = path.join(htmlDir, entry)
    const stats = await fs.stat(entryPath)
    if (stats.isDirectory())
      dirs.push(entryPath)
  }
  return dirs
}

// ─── 步骤一：选择 / 输入 nginx 服务器地址 ───
async function selectNginxServer(memory) {
  // 已有记录：提供"继续使用 + 重新选择 + 手动输入"
  const knownList = [...new Set(memory.nginxList)]
  const actions = ['✏️ 手动输入其他地址', '🔍 重新自动搜索本机']
  const choices = knownList.length ? [...knownList, ...actions] : actions

  const { nginxServer } = await ask({
    name: 'nginxServer',
    type: 'select',
    message: '请选择 nginx 服务器目录（含 nginx 可执行文件）',
    default: memory.nginxPath || knownList[0],
    choices,
  })

  if (nginxServer === '✏️ 手动输入其他地址') {
    const { manual } = await ask({
      name: 'manual',
      type: 'input',
      message: '请输入 nginx 目录（如 C:/nginx 或 /usr/local/nginx）:',
      validate: (v) => {
        if (!v.trim())
          return '不能为空'
        const target = path.resolve(v.trim())
        if (!fs.existsSync(target))
          return `目录不存在：${target}`
        const bin = path.join(target, nginxName)
        if (!fs.existsSync(bin))
          return `该目录下未找到 ${nginxName}，请确认是 nginx 安装目录`
        return true
      },
    })
    return path.resolve(manual.trim())
  }

  if (nginxServer === '🔍 重新自动搜索本机') {
    serverList.length = 0
    await searchNginxServer()
    return await selectNginxServer({ ...memory, nginxList: serverList })
  }

  return nginxServer
}

// ─── 步骤二：选择 / 创建 / 重命名 部署文件夹 ───
async function selectOrCreateFolder(nginxServerPath, memory) {
  const htmlDirs = await getNginxHtml(nginxServerPath)
  // 相对 html 目录展示
  const htmlRoot = path.join(nginxServerPath, 'html')
  const saved = memory.projects?.[projectName]?.target

  // 组装选择项：已存在的文件夹（相对路径）+ 动作
  const existRelative = htmlDirs.map(dir => path.relative(htmlRoot, dir))
  const actions = [
    '＋ 新建文件夹并部署',
    '📛 重命名已有文件夹',
    '↩ 返回上一步重新选择服务器',
  ]
  const choices = [...existRelative, ...actions]

  const { target } = await ask({
    name: 'target',
    type: 'select',
    message: '请选择部署目标文件夹（相对 html 目录）',
    default: saved ? path.relative(htmlRoot, saved) : existRelative[0],
    choices,
  })

  // 返回上一步
  if (target === '↩ 返回上一步重新选择服务器') {
    return { action: 'back' }
  }

  // 重命名已有文件夹
  if (target === '📛 重命名已有文件夹') {
    if (existRelative.length === 0) {
      printError('当前 html 目录下没有可重命名的文件夹')
      return selectOrCreateFolder(nginxServerPath, memory)
    }
    const { oldName } = await ask({
      name: 'oldName',
      type: 'select',
      message: '请选择要重命名的文件夹',
      choices: existRelative,
    })
    const { newName } = await ask({
      name: 'newName',
      type: 'input',
      message: '请输入新文件夹名:',
      validate: (v) => {
        const name = v.trim()
        if (!name)
          return '不能为空'
        if (name.includes('..') || name.includes('/') || name.includes('\\'))
          return '文件夹名不能包含路径分隔符或 ..'
        const targetPath = path.join(htmlRoot, name)
        if (fs.existsSync(targetPath))
          return `已存在同名文件夹：${name}`
        return true
      },
    })
    const oldTarget = path.join(htmlRoot, oldName)
    const newTarget = path.join(htmlRoot, newName.trim())
    try {
      fs.moveSync(oldTarget, newTarget)
      printSuccess(`重命名成功：${oldName} → ${newName.trim()}`)
      // 更新记忆中的目标
      if (memory.projects?.[projectName]?.target === oldTarget)
        memory.projects[projectName].target = newTarget
    }
    catch (e) {
      printError(`重命名失败：${e.message}`)
    }
    return selectOrCreateFolder(nginxServerPath, memory)
  }

  // 新建文件夹
  if (target === '＋ 新建文件夹并部署') {
    const { newPath } = await ask({
      name: 'newPath',
      type: 'input',
      message: '请输入要新建的文件夹路径（可含多层，如 a/b/c）:',
      default: projectName,
      validate: (v) => {
        if (!v.trim())
          return '不能为空'
        const targetPath = path.resolve(htmlRoot, v.trim())
        if (fs.existsSync(targetPath))
          return `目标已存在：${targetPath}`
        return true
      },
    })
    const targetPath = path.resolve(htmlRoot, newPath.trim())
    try {
      fs.ensureDirSync(targetPath)
      printSuccess(`已创建文件夹（支持多层）：${targetPath}`)
    }
    catch (e) {
      printError(`创建文件夹失败：${e.message}`)
      return selectOrCreateFolder(nginxServerPath, memory)
    }
    return { action: 'deploy', target: targetPath }
  }

  // 选择已存在文件夹
  const targetPath = path.resolve(htmlRoot, target)
  return { action: 'deploy', target: targetPath }
}

// ─── 步骤三：确认部署信息 ───
async function confirmDeploy(nginxServerPath, target) {
  const { ok } = await ask({
    name: 'ok',
    type: 'confirm',
    message: `确认部署到：\n  服务器：${nginxServerPath}\n  目录：${target}\n  是否继续？`,
    default: true,
  })
  return ok
}

// ─── 备份 ───
function makeBackup(target) {
  if (!fs.pathExistsSync(target))
    return null
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const backupName = `${projectName || 'project'}_${path.basename(target)}_${timestamp}`
  const dest = path.join(_backupDir, backupName)
  try {
    fs.ensureDirSync(_backupDir)
    fs.copySync(target, dest)
    printSuccess(`已自动备份原目录 → ${dest}`)
    return dest
  }
  catch (e) {
    printError(`备份失败：${e.message}`)
    return null
  }
}

// 列出备份
function listBackups() {
  if (!fs.existsSync(_backupDir))
    return []
  return fs.readdirSync(_backupDir).filter(name => fs.statSync(path.join(_backupDir, name)).isDirectory())
}

// 恢复备份
async function restoreBackup(target) {
  const backups = listBackups()
  if (backups.length === 0) {
    printError('没有可恢复的备份')
    return false
  }
  const { backupName } = await ask({
    name: 'backupName',
    type: 'select',
    message: '请选择要恢复的备份',
    choices: backups,
  })
  const { doRestore } = await ask({
    name: 'doRestore',
    type: 'confirm',
    message: `恢复 ${backupName} 会覆盖当前目录 ${target}，是否继续？`,
    default: false,
  })
  if (!doRestore) {
    print('已取消恢复')
    return false
  }
  const src = path.join(_backupDir, backupName)
  try {
    fs.emptyDirSync(target)
    fs.copySync(src, target)
    printSuccess(`已恢复备份：${backupName}`)
    return true
  }
  catch (e) {
    printError(`恢复失败：${e.message}`)
    return false
  }
}

// ─── 复制 dist ───
function copyDist(target) {
  fs.copySync(distPath, target)
  print('复制项目打包文件成功')
}

// ─── 重启 nginx ───
function restartNginx(nginxServerPath) {
  const nginxBin = path.join(nginxServerPath, nginxName)

  if (isWindows) {
    const bats = [
      '@echo off',
      'chcp 65001',
      `cd /d ${nginxServerPath}`,
      'taskkill /f /t /im nginx.exe',
      'start nginx.exe',
      'nginx.exe -s reload',
      'exit',
    ]
    fs.writeFileSync('restart.bat', bats.join('\r\n'), 'utf-8')
    const child = spawn('cmd.exe', ['/c', 'restart.bat'])
    child.stdout.on('data', data => printSuccess(data.toString().trim()))
    child.stderr.on('data', data => printError(data.toString().trim()))
    child.on('exit', (code) => {
      print(`执行完毕 with code ${code}`)
      fs.removeSync('restart.bat')
      process.exit()
    })
  }
  else {
    const child = spawn(nginxBin, ['-s', 'reload'])
    child.stderr.on('data', data => print(data.toString().trim()))
    child.on('exit', (code) => {
      print(`nginx -s reload 执行完毕 with code ${code}`)
      process.exit()
    })
  }
}

// ─── 主流程 ───
async function deploy() {
  // 获取当前项目的 dist
  distPath = getDistPath()
  if (distPath === '') {
    printError('请先打包项目')
    print('raopancli -r')
    process.exit()
  }

  // 获取当前项目的名称
  getProjectName()

  const memory = readMemory()

  // 已有记录：提供一键确认（跳过交互）
  const saved = memory.projects?.[projectName]
  let nginxServerPath = ''
  let target = ''

  try {
    if (saved && saved.nginxServer && saved.target) {
      const { fast } = await ask({
        name: 'fast',
        type: 'confirm',
        message: `检测到上次部署记录：\n  服务器：${saved.nginxServer}\n  目录：${saved.target}\n  是否直接按此部署？（选否进入完整配置）`,
        default: true,
      })
      if (fast) {
        nginxServerPath = saved.nginxServer
        target = saved.target
      }
    }
  }
  catch {
    printError('部署配置已取消')
    process.exit()
  }

  // 完整配置流程（支持返回上一步）
  // step: 1=选服务器, 2=选文件夹, 3=确认
  let step = 1
  try {
    while (!target) {
      if (step === 1) {
        // 步骤一：选择服务器
        nginxServerPath = await selectNginxServer(memory)
        step = 2
      }
      else if (step === 2) {
        // 步骤二：文件夹（含返回上一步 / 新建 / 重命名）
        const folder = await selectOrCreateFolder(nginxServerPath, memory)
        if (folder.action === 'back') {
          // 返回上一步 → 步骤一
          step = 1
          continue
        }
        target = folder.target
        step = 3
      }
      else {
        // 步骤三：确认
        const ok = await confirmDeploy(nginxServerPath, target)
        if (!ok) {
          // 返回上一步 → 步骤二（重新选文件夹）
          target = ''
          step = 2
          continue
        }
        break
      }
    }
  }
  catch {
    printError('部署配置已取消')
    process.exit()
  }

  // 保存记忆（下次一键确认）
  memory.nginxPath = nginxServerPath
  if (!memory.nginxList.includes(nginxServerPath))
    memory.nginxList.push(nginxServerPath)
  memory.projects = memory.projects || {}
  memory.projects[projectName] = { nginxServer: nginxServerPath, target, updatedAt: Date.now() }
  writeMemory(memory)
  printSuccess('已保存部署配置，下次可一键确认')

  // 备份现有目录
  makeBackup(target)

  // 复制 dist
  copyDist(target)

  // 重启 nginx
  restartNginx(nginxServerPath)
}

// ─── 恢复入口（供 -n 恢复子命令使用） ───
async function deployRestore() {
  getProjectName()
  const memory = readMemory()
  const saved = memory.projects?.[projectName]
  if (!saved?.target) {
    printError('没有该项目的历史部署目录记录')
    return
  }
  await restoreBackup(saved.target)
}

// 测试辅助：注入自定义 memory / backup 路径，暴露纯逻辑函数
export default deploy
export {
  _setPaths,
  deployRestore,
  getNginxHtml,
  listBackups,
  makeBackup,
  readMemory,
  restartNginx,
  writeMemory,
}
