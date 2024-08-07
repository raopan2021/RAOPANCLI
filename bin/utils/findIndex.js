const find_index = (arr,str) => {
    let index = -1
    for (let i = 0; i < arr.length; i++) {
        if (Object.values(arr[i])[0].includes(str)) {
            index = i
            break
        }
    }
    return index
}

export default find_index