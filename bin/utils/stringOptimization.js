const addSpaces = (str, start, max) => {
    let spaces = '   ';
    let num = max - start;
    while (num) {
        spaces += ' ';
        num--;
    }
    return str.slice(0, start) + spaces + str.slice(start);
};

// 处理字符串
const stringOptimization = (arr) => {
    let maxLength = 0;
    const res = [];
    arr.forEach((item) => {
        if (item.indexOf(':') > maxLength) {
            maxLength = item.indexOf(':');
        }
    });
    arr.forEach((item) => {
        res.push(addSpaces(item, item.indexOf(':'), maxLength));
    });
    return res;
};


export default stringOptimization;