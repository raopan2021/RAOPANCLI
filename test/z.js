// import find_index from "../bin/utils/findIndex.js";

// const index = find_index(
//     [
//         { 'npm官方': 'https://registry.npmjs.org/' },
//         { '淘宝源': 'https://registry.npmmirror.com/' },
//         { '阿里源': 'https://npm.aliyun.com/' },
//         { '腾讯源': 'https://mirrors.cloud.tencent.com/npm/' },
//         { '华为源': 'https://mirrors.huaweicloud.com/repository/npm/' },
//         { '清华源': 'https://mirrors.tuna.tsinghua.edu.cn/' }
//     ],
//     'https://registry.npmmirror.com/'
// )
// console.log(index);

import { execSync } from 'child_process';

console.log(execSync("npm config get registry",{ encoding: 'utf-8' }));