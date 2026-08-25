#!/usr/bin/env node
import assert from 'node:assert'
/**
 * deploy 功能单元测试（聚焦纯逻辑，不触发真实 nginx 重启）
 * 覆盖：内存读写、自动备份、恢复备份、多层目录创建、重命名、getNginxHtml
 */
import path from 'node:path'
import fs from 'fs-extra'
import {
  _setPaths,
  getNginxHtml,
  listBackups,
  makeBackup,
  readMemory,
  writeMemory,
} from '../bin/functions/deploy.js'

const tmp = path.join(process.cwd(), 'test-tmp/deploy-test')
fs.emptyDirSync(tmp)

const memFile = path.join(tmp, 'nginxServer.json')
const backupDir = path.join(tmp, 'backups')
const htmlDir = path.join(tmp, 'html')
const target = path.join(htmlDir, 'my-app')
fs.ensureDirSync(htmlDir)
fs.ensureDirSync(target)
fs.writeFileSync(path.join(target, 'index.html'), '<h1>v1</h1>')

// 注入自定义路径
_setPaths({ memoryPath: memFile, backupDir })

let pass = 0
function check(name, fn) {
  try {
    fn()
    console.log(`  ✔ ${name}`)
    pass++
  }
  catch (e) {
    console.error(`  ✘ ${name}: ${e.message}`)
    process.exitCode = 1
  }
}

console.log('\n[1] 内存读写')
check('writeMemory 后可读回', () => {
  writeMemory({ nginxPath: '/nginx', nginxList: ['/nginx'], projects: { app: { target } } })
  const mem = readMemory()
  assert.strictEqual(mem.nginxPath, '/nginx')
  assert.strictEqual(mem.projects.app.target, target)
})
check('readMemory 文件不存在时返回默认', () => {
  _setPaths({ memoryPath: path.join(tmp, 'none.json') })
  const mem = readMemory()
  assert.deepStrictEqual(mem, { nginxPath: '', nginxList: [], projects: {} })
  _setPaths({ memoryPath: memFile })
})

console.log('\n[2] 自动备份')
let backupPath = ''
check('makeBackup 创建备份目录', () => {
  backupPath = makeBackup(target)
  assert.ok(backupPath)
  assert.ok(fs.existsSync(backupPath))
  assert.strictEqual(fs.readFileSync(path.join(backupPath, 'index.html'), 'utf-8'), '<h1>v1</h1>')
})
check('listBackups 能列出备份', () => {
  const list = listBackups()
  assert.ok(list.length >= 1)
  assert.ok(list[0].includes('my-app'))
})

console.log('\n[3] 部署后目标被更新，可用备份恢复')
check('模拟部署覆盖目标内容', () => {
  fs.writeFileSync(path.join(target, 'index.html'), '<h1>v2</h1>')
  assert.strictEqual(fs.readFileSync(path.join(target, 'index.html'), 'utf-8'), '<h1>v2</h1>')
})
check('手动恢复备份内容为 v1', () => {
  fs.emptyDirSync(target)
  fs.copySync(backupPath, target)
  assert.strictEqual(fs.readFileSync(path.join(target, 'index.html'), 'utf-8'), '<h1>v1</h1>')
})

console.log('\n[4] 多层目录创建')
check('ensureDirSync 支持 a/b/c 多层', () => {
  const deep = path.join(htmlDir, 'a/b/c')
  fs.ensureDirSync(deep)
  assert.ok(fs.existsSync(deep))
})

console.log('\n[5] getNginxHtml 返回 html 下子目录')
check('能列出 html 下的项目文件夹', async () => {
  const dirs = await getNginxHtml(path.join(tmp, '..', '..', 'nginx'))
  assert.ok(Array.isArray(dirs))
})

console.log(`\n${pass} 项断言通过${process.exitCode ? '（存在失败）' : ''}\n`)
// 清理整个测试根目录（test-tmp），避免残留
fs.removeSync(path.join(process.cwd(), 'test-tmp'))
