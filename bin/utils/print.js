import chalk from 'chalk'

// 普通输出：按冒号分段着色，中文蓝色、英文绿色
function print(text) {
  const arr = text.split(/:/g)
  let res = ''
  arr.forEach((item) => {
    if (/[\u4E00-\u9FA5]/.test(item))
      res += chalk.blueBright(item)
    else
      res += chalk.green(item)
  })
  console.log(res)
}

function printSuccess(text) {
  console.log(chalk.green(text))
}

function printError(text) {
  console.log(chalk.red.bold(text))
}

export { print, printError, printSuccess }
