// 给定一个升序数组，找到target在数组中第一次出现的位置，
// 和最后出现的位置返回[index1， inde2]，没有就返回[-1, -1]
let resource = [0, 1, 2, 3, 5, 5, 5, 5, 5, 6, 7, 8, 9],
    target = 5,
    result = [-1, -1];
function binarySearch(num, target, leftOrRight) {
    let start = 0,
        end = num.length - 1,
        result;
    while (start <= end) {
        let mid = Math.floor((end - start) / 2);
        if (num[mid] > target || (leftOrRight == 0 && num[mid] >= target)) {
            end = mid - 1;
            result = mid;
        } else {
            start = mid + 1;
        }
    }
    return result;
}
