import chalk from "chalk";

const printError = (text) => {
    console.log(chalk.red.bold(text));
}

export default printError