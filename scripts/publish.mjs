#!/usr/bin/env node
/**
 * 一键发布 raopancli 到 npm
 *
 * 用法（在仓库根目录执行）:
 *   pnpm release                          # 交互式选择升级级别并发布（默认）
 *   pnpm release --patch                  # 直接 patch 升级
 *   pnpm release --minor                  # 直接 minor 升级
 *   pnpm release --major                  # 直接 major 升级
 *   pnpm release --version=1.2.3          # 指定版本
 *   pnpm release --changelog=skip         # 跳过 CHANGELOG 自动更新
 *   pnpm release --dry-run                # 演练（不改任何文件、不校验、不发布）
 *   pnpm release --no-publish             # 仅版本号 bump + CHANGELOG + lint 校验，不发布
 *   pnpm release --token=npm_xxxx         # 显式指定 token（也可设置 NPM_TOKEN 环境变量）
 *
 * 流程: 交互选择版本级别 → 版本号 bump → 更新 CHANGELOG（git log 自动生成草稿）→ lint 校验 → 发布 → 验证
 *
 * 交互说明:
 *   - 不带任何版本参数时，终端会弹出选项让用户选择 patch / minor / major / 自定义
 *   - 非交互终端（管道、CI）或 --dry-run 时不弹选项，回退为默认 minor
 *
 * 注意:
 *   - 必须在仓库根目录运行
 *   - token 通过命令行参数 `--//registry.npmjs.org/:_authToken=...` 注入，
 *     不写入任何 .npmrc 文件
 *   - 发布走 package.json 的 publishConfig.registry（npmjs.org），与全局
 *     registry（可能是 npmmirror 镜像）无关
 *   - CLI 包发布前无需构建产物（files 仅含 bin/lib 源码），用 lint:check 做质量校验
 */
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { createInterface } from 'node:readline/promises'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const pkgPath = resolve(root, 'package.json')
const changelogPath = resolve(root, 'CHANGELOG.md')
const REGISTRY = 'https://registry.npmjs.org/'
const PKG_NAME = 'raopancli'

// ─── 参数解析 ───
const args = process.argv.slice(2)
const opts = {
  level: 'minor',
  version: null,
  changelog: true,
  dryRun: false,
  noPublish: false,
  interactive: false,
  token: process.env.NPM_TOKEN || '',
}

function usage() {
  console.log(`
${'用法:'.padEnd(24)} pnpm release [options]
${'  默认'.padEnd(24)} 交互式选择升级级别
${'  --patch'.padEnd(24)} patch 升级（1.0.12 → 1.0.13）
${'  --minor'.padEnd(24)} minor 升级（1.0.12 → 1.1.0）
${'  --major'.padEnd(24)} major 升级（1.0.12 → 2.0.0）
${'  --version=1.2.3'.padEnd(24)} 指定完整版本号
${'  --changelog=skip'.padEnd(24)} 不自动更新 CHANGELOG
${'  --dry-run'.padEnd(24)} 演练：仅打印将执行的步骤
${'  --no-publish'.padEnd(24)} 完成 bump + CHANGELOG + lint 校验后停止，不发布
${'  --interactive'.padEnd(24)} 强制弹出升级级别选择（即使非交互终端）
${'  --token=npm_xxxx'.padEnd(24)} 指定 npm token（默认读根 .npmrc / NPM_TOKEN）
${'  --help / -h'.padEnd(24)} 显示本帮助
`)
}

for (const arg of args) {
  if (arg === '--patch') {
    opts.level = 'patch'
  }
  else if (arg === '--minor') {
    opts.level = 'minor'
  }
  else if (arg === '--major') {
    opts.level = 'major'
  }
  else if (arg.startsWith('--version=')) {
    opts.version = arg.slice('--version='.length)
  }
  else if (arg.startsWith('--changelog=')) {
    opts.changelog = arg.slice('--changelog='.length) !== 'skip'
  }
  else if (arg === '--dry-run') {
    opts.dryRun = true
  }
  else if (arg === '--no-publish') {
    opts.noPublish = true
  }
  else if (arg === '--interactive') {
    opts.interactive = true
  }
  else if (arg.startsWith('--token=')) {
    opts.token = arg.slice('--token='.length)
  }
  else if (arg === '--help' || arg === '-h') {
    usage()
    process.exit(0)
  }
  else {
    console.error(`[publish] 未知参数: ${arg}`)
    usage()
    process.exit(1)
  }
}

// ─── 工具函数 ───
function run(command, args, cwd = root) {
  console.log(`\n$ ${command} ${args.join(' ')}`)
  const res = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  if (res.status !== 0) {
    console.error(`[publish] ✖ 命令失败: ${command} ${args.join(' ')}`)
    process.exit(res.status || 1)
  }
}

function runCapture(command, args, cwd = root) {
  const res = spawnSync(command, args, { cwd, encoding: 'utf-8', shell: process.platform === 'win32' })
  if (res.status !== 0)
    return ''
  return res.stdout
}

function bump(version, level) {
  const [major, minor, patch] = version.split('.').map(Number)
  if (level === 'major')
    return `${major + 1}.0.0`
  if (level === 'minor')
    return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${patch + 1}`
}

// 从 git log 提取提交并按类型分类（生成 CHANGELOG 草稿）
function buildChangelogSections() {
  const log = runCapture('git', ['log', '--pretty=format:%s', '-50'])
  const commits = log.split('\n').filter(Boolean)

  const groups = {
    features: [],
    fixes: [],
    perf: [],
    refactor: [],
    docs: [],
    chore: [],
    other: [],
  }

  const rule = [
    [/^feat|新增|支持|✨|添加|加/, 'features'],
    [/^fix|修复|🐛|bug/i, 'fixes'],
    [/^perf|优化|提升|性能|⚡/, 'perf'],
    [/^refactor|重构|♻/, 'refactor'],
    [/^docs|文档|📝/, 'docs'],
    [/^(ci|chore|build|test)|工程|构建|样式|🛠/, 'chore'],
  ]

  for (const msg of commits) {
    const m = msg.trim()
    if (!m)
      continue
    const target = rule.find(([re]) => re.test(m))?.[1] || 'other'
    if (!groups[target].includes(m))
      groups[target].push(m)
  }

  const titles = {
    features: '✨ 新增',
    fixes: '🐛 修复',
    perf: '🎨 优化',
    refactor: '♻️ 重构',
    docs: '📝 文档',
    chore: '🛠 工程化',
    other: '🔧 其他',
  }

  return Object.entries(titles)
    .map(([key, title]) => (groups[key].length
      ? `### ${title}\n\n${groups[key].map(c => `- ${c}`).join('\n')}`
      : ''))
    .filter(Boolean)
}

function updateChangelog(version, sections) {
  let content = ''
  try {
    content = readFileSync(changelogPath, 'utf-8')
  }
  catch {
    content = '# Changelog\n\n'
  }
  const date = new Date().toISOString().slice(0, 10)
  const entry = [`## [${version}] - ${date}`, '', ...sections, '', '---', ''].join('\n')
  const idx = content.indexOf('\n## [')
  const pos = idx === -1 ? content.length : idx + 1
  writeFileSync(changelogPath, content.slice(0, pos) + entry + content.slice(pos))
  console.log(`✔ 已更新 CHANGELOG.md（新版本 ${version} 条目插入顶部）`)
}

// 读取项目根 .npmrc 中的 npmjs.org token（若存在）
function readNpmrcToken() {
  try {
    const content = readFileSync(resolve(root, '.npmrc'), 'utf-8')
    const m = content.match(/\/\/registry\.npmjs\.org\/:_authToken=(\S+)/)
    return m ? m[1] : ''
  }
  catch {
    return ''
  }
}

// 统一提问助手：
//   TTY（真实终端）→ readline question 逐步交互
//   非 TTY（管道 / CI）→ 一次性预读全部 stdin 行，顺序消费（保证管道输入可用、可测试）
let pipedLines = null
async function ensurePipedLines() {
  if (pipedLines === null) {
    pipedLines = []
    if (!process.stdin.isTTY) {
      const rl = createInterface({ input: process.stdin })
      for await (const line of rl)
        pipedLines.push(line)
    }
  }
  return pipedLines
}

async function ask(question) {
  if (process.stdin.isTTY) {
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    try {
      return (await rl.question(question)).trim()
    }
    finally {
      rl.close()
    }
  }
  const lines = await ensurePipedLines()
  return (lines.shift() || '').trim()
}

// 交互式选择升级级别（patch / minor / major / 自定义），回车默认 patch
// 返回 { level, version }：version 仅在自定义模式有值
async function promptVersionLevel(oldVersion) {
  console.log(`\n当前版本 ${oldVersion}，请选择升级级别：`)
  console.log(`  1. patch  → ${bump(oldVersion, 'patch')}（修复 / 小优化，默认推荐）`)
  console.log(`  2. minor  → ${bump(oldVersion, 'minor')}（新增功能）`)
  console.log(`  3. major  → ${bump(oldVersion, 'major')}（不兼容变更）`)
  console.log('  4. 自定义 → 手动输入 x.y.z')
  const answer = (await ask('请输入 [1-4]，回车默认 1: ')) || '1'
  if (!['1', '2', '3', '4'].includes(answer)) {
    console.error(`[publish] ✖ 无效选择: ${answer}`)
    process.exit(1)
  }
  if (answer === '4') {
    const custom = await ask('请输入新版本号（格式 x.y.z）: ')
    if (!/^\d+\.\d+\.\d+$/.test(custom)) {
      console.error(`[publish] ✖ 非法版本号: ${custom}（应为 x.y.z）`)
      process.exit(1)
    }
    return { level: 'custom', version: custom }
  }
  return { level: ['patch', 'minor', 'major'][Number(answer) - 1], version: null }
}

// ─── 主流程 ───
console.log('🚀 开始一键发布流程...\n')

const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
const oldVersion = pkg.version

// 交互式选择升级级别：
// 触发条件：未显式指定版本参数（--patch/--minor/--major/--version）且（交互终端 || --interactive）。
// 非交互环境自动回退默认 minor；dry-run 时仅当 --interactive 才弹选项（便于 CI 前演练）
const explicitLevel = args.some(a => a.startsWith('--patch') || a.startsWith('--minor') || a.startsWith('--major'))
const wantInteractive = (process.stdin.isTTY && !process.env.CI) || opts.interactive
const interactiveInDryRun = opts.dryRun && opts.interactive
if (!explicitLevel && opts.version == null && wantInteractive && (!opts.dryRun || interactiveInDryRun)) {
  const choice = await promptVersionLevel(oldVersion)
  opts.level = choice.level
  if (choice.version)
    opts.version = choice.version
}

if (opts.version != null && !/^\d+\.\d+\.\d+$/.test(opts.version)) {
  console.error(`[publish] ✖ 非法版本号: ${opts.version}（应为 x.y.z）`)
  process.exit(1)
}
const newVersion = opts.version || bump(oldVersion, opts.level)

if (newVersion === oldVersion) {
  console.error(`[publish] ✖ 版本号未变化（${oldVersion}），请检查 --version / 升级级别`)
  process.exit(1)
}

console.log(`📦 版本号: ${oldVersion} → ${newVersion}`)

if (opts.dryRun) {
  console.log('\n[dry-run] 以下步骤将被执行：')
  let step = 1
  console.log(`  ${step++}. 更新 package.json version`)
  if (opts.changelog)
    console.log(`  ${step++}. 自动更新 CHANGELOG.md（从 git log 生成草稿）`)
  console.log(`  ${step++}. 质量校验: pnpm lint:check`)
  console.log(`  ${step++}. 发布: npm publish --ignore-scripts（registry.npmjs.org, tag latest）`)
  console.log(`  ${step++}. 验证: npm view ${PKG_NAME} version\n`)
  console.log(`[dry-run] 目标版本 ${newVersion}，演练完成（未做任何修改）`)
  process.exit(0)
}

// 1. 更新版本号
pkg.version = newVersion
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
console.log('✔ 已更新 package.json 版本号')

// 2. 更新 CHANGELOG
if (opts.changelog) {
  const sections = buildChangelogSections()
  if (sections.length)
    updateChangelog(newVersion, sections)
  else
    console.log('⚠ 未能从 git log 提取变更，跳过 CHANGELOG 更新（可手动补充）')
}

// 3. 质量校验（CLI 包发布前无需构建产物，用 lint 兜底）
run('pnpm', ['lint:check'])

// 3.5 仅做版本 bump / 校验，不发布
if (opts.noPublish) {
  console.log(`\n[no-publish] 版本号已升级为 ${newVersion}，跳过发布（需要发布时去掉 --no-publish 再执行）`)
  process.exit(0)
}

// 4. 发布
// token 优先级：--token 参数 > NPM_TOKEN 环境变量 > 项目根 .npmrc
// 注意：必须 ALWAYS 通过命令行注入 token，不能依赖 npm 自动读取 .npmrc！
//   原因：npm 用 `localPrefix`（最近的 package.json 所在目录）定位 project .npmrc，
//   在仓库根发布时 project .npmrc = 根/.npmrc（不存在），npm 会回退到用户级
//   ~/.npmrc 的（可能是无效的旧）token，导致 PUT 404。
//   命令行注入的 token 优先级最高，可确保发布使用正确凭据。
const npmrcToken = readNpmrcToken()
const token = opts.token || npmrcToken
if (!token) {
  console.error('\n[publish] ✖ 未找到 npm token（可写入根 .npmrc 或使用 --token=npm_xxxx / NPM_TOKEN 环境变量）')
  process.exit(1)
}
run('npm', ['publish', '--ignore-scripts', `--//registry.npmjs.org/:_authToken=${token}`], root)

// 5. 验证发布结果（npm view 可能有 CDN 缓存，最多重试 5 次）
console.log('\n✔ 发布完成，验证 npm 上的最新版本...')
for (let i = 1; i <= 5; i++) {
  const latest = runCapture('npm', ['view', PKG_NAME, 'version', '--registry', REGISTRY]).trim()
  if (latest === newVersion) {
    console.log(`✔ ${PKG_NAME}@${latest} 已确认上线`)
    process.exit(0)
  }
  if (i < 5) {
    console.log(`  （第 ${i} 次查询仍为 ${latest || '空'}，等待 2s 重试...）`)
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
}
console.error(`[publish] ⚠ 未能立即验证 ${newVersion}，请手动执行 npm view ${PKG_NAME} version 确认`)
process.exit(1)
