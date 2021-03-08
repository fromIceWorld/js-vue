let resource = [4, 2, 7, 9, 2, 6, 12, 5, 1],
    L = 0,
    R = resource.length - 1,
    cache = 0;
while (L < R) {
    cache = Math.max(cache, Math.min(resource[L], resource[R]) * (R - L));
    if (resource[L] > resource[R]) {
        R--;
    } else {
        L++;
    }
}
console.log(cache);
