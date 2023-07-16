// 对比本地与远端的版本号，有新版就返回true
export function compareVersion(local_version, remote_version) {
    // 将字符串改为数组
    const local_version_arr = local_version.trim().split(".");
    const remote_version_arr = remote_version.trim().split(".");
    // 返回数组长度最大的
    const max_length = Math.max(local_version_arr.length, remote_version_arr.length);
    // 从头对比每一个
    for (let i = 0; i < max_length; i++) {
        // 将字符串改为数字
        const local_version_num = parseInt(local_version_arr?.[i] ?? "0");
        const remote_version_num = parseInt(remote_version_arr?.[i] ?? "0");
        // 版本号不相等
        if (local_version_num != remote_version_num) {
            // 有更新返回true，没更新返回false
            return local_version_num < remote_version_num;
        }
    }
    // 版本号相等，返回false
    return false;
}


// Fisher-Yates算法
export function shuffleList(list) {
    const shuffled_list = [...list];
    for (let i = shuffled_list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        // 交换元素位置
        [shuffled_list[i], shuffled_list[j]] = [shuffled_list[j], shuffled_list[i]];
    }
    return shuffled_list;
}


// 数组分组
export function groupArrayElements(arr, num) {
    const result = [];
    for (let i = 0; i < arr.length; i += num) {
        result.push(arr.slice(i, i + num));
    }
    return result;
}