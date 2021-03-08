let source = [3, 6, 9, -3, -8, 0, 11, 8],
    cache = arr[0] + arr[1] + arr[2],
    target = 24,
    arr = source.sort((a, b) => a - b);
for (let i = 0, len = arr.length; i < len; i++) {
    let L = i + 1,
        R = len - 1;
    while (L < R) {
        let result = arr[i] + arr[L] + arr[R];
        if (target > result) {
            cache = Math.min(Math.abs(cache), Math.abs(target - result));
            L++;
        } else {
            cache = Math.min(Math.abs(cache), Math.abs(result - target));
            R--;
        }
    }
}
console.log(cache);
