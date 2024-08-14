# 开始

1. 创建项目；
2. `pnpm init` 初始化项目

``` md
 --- package.json
 |
 --- bin
 |    |--- index.js
 |    |--- print.js
 --- lib
      |--- template-react-ts
      |--- template-react
      |--- template-vue-ts
      |--- template-vue
```

3. 在 `package.json` 中添加 `type` 字段为`module`；
4. 在 `package.json` 中添加 `bin` 字段，指定入口文件`"rpcli": "./bin/index.js"`；

``` json
{
  "name": "raopancli",
  "version": "1.0.10",
  "description": "",
  "main": "index.js",
  "type": "module",
  "bin": {
    "raopancli": "./bin/index.js"
  },
 ...
}
```

5. 在当前目录打开终端，执行 `npm link` 命令！
   
> `npm link` 命令会将当前项目的 `package.json` 中的 `bin` 字段指定的文件链接到全局，这样就可以在命令行中直接使用 `raopancli` 命令了。

6. 在 `bin` 目录下创建 `index.js` 文件；

```js
#! /usr/bin/env node

console.log('Hello Cli!');
```

7. 在当前目录打开终端，执行 `raopancli` 命令！

``` cmd
PS D:\Code\RAOPANCLI> raopancli 
Hello Cli!
```