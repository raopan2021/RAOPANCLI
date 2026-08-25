#!/usr/bin/env node
import { execSync } from 'node:child_process'
import { readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import boxen from 'boxen'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration.js'
import fs from 'fs-extra'
import gradient from 'gradient-string'

dayjs.extend(duration)

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const pkg = fs.readJsonSync(path.join(root, 'package.json'))

const startTime = dayjs()

const boxenOptions = {
  padding: 0.5,
  borderColor: 'cyan',
  borderStyle: 'round',
  margin: 1,
}

const gradientText = gradient(['cyan', 'magenta'])

/** 格式化时长：分钟为 0 则不显示 */
function formatDuration(d) {
  const minutes = Math.floor(d.asMinutes())
  const seconds = d.seconds()
  const ms = d.milliseconds()
  return minutes > 0
    ? `${minutes}分 ${seconds}秒 ${ms}`
    : `${seconds}秒 ${ms}`
}

/** 递归统计目录总大小（字节） */
function getDirSize(dir) {
  let total = 0
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory())
      total += getDirSize(fullPath)
    else
      total += statSync(fullPath).size
  }
  return total
}

/** 格式化字节大小 */
function formatBytes(bytes) {
  if (bytes === 0)
    return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / k ** i).toFixed(2)} ${sizes[i]}`
}

// 欢迎横幅
console.log(
  boxen(
    gradientText.multiline(
      `${pkg.name} v${pkg.version}\n`
      + '文档站点构建 · 业务协作平台 Copyright 2026-present raopan',
    ),
    boxenOptions,
  ),
)

// 开始构建（直接调用本地 vitepress bin，避免依赖 PATH）
const vitepressBin = path.join(root, 'node_modules/vitepress/bin/vitepress.js')
console.log(boxen(gradientText.multiline('开始构建文档站点...'), boxenOptions))
const buildStart = dayjs()
execSync(`"${process.execPath}" "${vitepressBin}" build docs`, { stdio: 'inherit', cwd: root })
const buildEnd = dayjs()

// 统计产物大小
const distDir = path.join(root, 'docs/.vitepress/dist')
const size = fs.pathExistsSync(distDir) ? formatBytes(getDirSize(distDir)) : '0 B'
const endTime = dayjs()

const buildTime = formatDuration(dayjs.duration(buildEnd.diff(buildStart)))
const totalTime = formatDuration(dayjs.duration(endTime.diff(startTime)))

// 构建完成总结
console.log(
  boxen(
    gradientText.multiline(
      '恭喜打包完成\n\n'
      + `构建耗时 ${buildTime}\n`
      + '----------------\n'
      + `总用时   ${totalTime}\n\n`
      + `打包后的大小为 ${size}`,
    ),
    boxenOptions,
  ),
)
