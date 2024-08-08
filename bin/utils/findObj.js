const findObj = (obj, str) => {
    for (const [key, value] of Object.entries(obj)) {
        if (key.includes(str) || String(value).includes(str)) {
            return [key, value];
        }
    }
    return null;
};

export default findObj;
