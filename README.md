# 一个模拟 `vite` 的脚手架

## 全局安装

``` bash
pnpm add raopancli -g
```

## 帮助

``` bash
raopancli -h

# PS D:\Code\RAOPANCLI> raopancli -h
# raopancli 脚手架
# raopan 的 JavaScript 脚手架工具
# -h --help        查看帮助信息
# -v --version     查看脚手架版本号
# -r --run         本地启动项目或打包项目
# -dn --delete     删除当前目录的 node_modules
# -d --deploy      部署当前项目到本机 nginx
# -c --create      生成 vite 项目
# -s --setMirror   切换 npm 源
```

## 使用

``` bash
raopancli -h 
raopancli -v 
raopancli -r 
raopancli -dn
raopancli -d 
raopancli -c 
raopancli -s 
```

## 如何实现一个脚手架？

[见教程](https://raopan2021.github.io/blog/engineering/cli/index)
