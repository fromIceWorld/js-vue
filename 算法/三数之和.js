let source = [3, 6, 9, -3, -8, 0, 11, 8, 3, 6, 9, -3, -8, 0, 11, 8];
function three(arr) {
    let cache = [];
    arr.sort((a, b) => a - b);
    for (let i = 0, len = arr.length; i < len; i++) {
        if (arr[i] > 0) break; //基数大于0，后续都不会等于0
        if (i > 0 && arr[i] == arr[i - 1]) continue;
        let L = i + 1,
            R = len - 1;
        while (L < R) {
            let result = arr[i] + arr[L] + arr[R];
            if (result === 0) {
                cache.push([arr[i], arr[L], arr[R]]);
                //过滤重复
                while (L < R && arr[R] == arr[R - 1]) {
                    R--;
                }
                while (L < R && arr[L] == arr[L + 1]) {
                    L++;
                }
                L++;
                R--;
            } else if (result > 0) {
                R--;
            } else {
                L++;
            }
        }
    }
    console.log(cache);
}
three(source);
