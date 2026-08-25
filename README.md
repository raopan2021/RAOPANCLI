# 一个模拟 `vite` 的脚手架

## 全局安装

```bash
pnpm add raopancli -g
```

## 命令

支持两个命令名：`raopancli` 与简写 `rp`（推荐使用简写）。

```bash
rp -h          # 查看帮助信息
rp -v          # 查看脚手架版本号
rp -r          # 本地启动项目或打包项目
rp -D          # 删除当前目录的 node_modules
rp -n          # 部署当前项目到本机 nginx（自动备份）
rp -N          # 恢复部署备份
rp -c          # 生成 vite 项目
rp -s          # 切换 npm 源
```

## 部署（`rp -n`）

交互式部署到本机 nginx，支持：

- 选择 / 手动输入 / 自动搜索 nginx 服务器目录
- 选择已有部署文件夹，或**新建**（支持多层如 `a/b/c`）、**重命名**文件夹
- 部署前**自动备份**原目录
- **记录部署配置**，下次可一键确认
- 全程可**退回上一步**

恢复备份：`rp -N`（从最近的部署备份中恢复，覆盖当前目录）

## 使用

```bash
rp -h
rp -v
rp -r
rp -D
rp -n
rp -N
rp -c
rp -s
```

## 开发

```bash
pnpm install   # 安装依赖
pnpm build     # 构建文档站点（含构建耗时/体积统计）
pnpm docs:dev  # 本地预览文档
pnpm lint      # ESLint + 格式化修复（antfu 规范）
pnpm lint:check
```

## 如何实现一个脚手架？

[见教程](https://raopan2021.github.io/blog/engineering/cli/index)
