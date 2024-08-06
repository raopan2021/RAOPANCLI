# 一个模拟 `vite` 的脚手架

## 全局安装

``` bash
pnpm add raopancli -g
```

## 帮助

``` bash
raopancli -h

# PS D:\Code\RAOPANCLI> raopancli -h
# Usage: raopancli 脚手架 [options]

# raopan 的 JavaScript 脚手架工具

# Options:
#   -v --version  查看脚手架版本号
#   -r --run      本地启动项目或打包项目
#   -d --delete   删除当前目录的 node_modules
#   -c --create   生成 vite 项目
#   -s --setRegistry  切换npm源
#   -h, --help    display help for command
```

## 使用

``` bash
raopancli -v
raopancli -r
raopancli -d
raopancli -c
raopancli -s
```

## 如何实现一个脚手架？

[见教程](https://raopan2021.github.io/blog/engineering/cli/index)
