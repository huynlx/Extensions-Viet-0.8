"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDate = exports.buildCurlCommand = exports.safeBuildQueryString = void 0;
// Helper ghép query string siêu an toàn cho Native Engine
function safeBuildQueryString(params) {
    // 1. Kiểm tra null/undefined hoặc không phải object
    if (!params || typeof params !== 'object') {
        return '';
    }
    try {
        const keys = Object.keys(params);
        if (keys.length === 0)
            return '';
        const pairs = [];
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            if (!key)
                continue;
            const val = params[key];
            // 2. Bỏ qua nếu giá trị là null hoặc undefined
            if (val === undefined || val === null)
                continue;
            // 3. Chuyển giá trị sang string an toàn
            const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
            pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(strVal)}`);
        }
        return pairs.length > 0 ? `?${pairs.join('&')}` : '';
    }
    catch (e) {
        console.error('Lỗi khi ghép query string:', e);
        return '';
    }
}
exports.safeBuildQueryString = safeBuildQueryString;
function buildCurlCommand(url, method = 'GET', headers = {}, body) {
    let curl = `curl -X ${method.toUpperCase()} "${url}"`;
    // Thêm các Header
    for (const [key, value] of Object.entries(headers)) {
        if (value !== undefined && value !== null) {
            curl += ` \\\n  -H "${key}: ${value}"`;
        }
    }
    // Thêm Body (nếu là POST/PUT)
    if (body) {
        const payload = typeof body === 'object' ? JSON.stringify(body) : body;
        curl += ` \\\n  --data-raw '${payload}'`;
    }
    return curl;
}
exports.buildCurlCommand = buildCurlCommand;
const parseDate = (dateString) => {
    if (!dateString)
        return new Date();
    const str = dateString.trim().toLowerCase();
    const now = new Date();
    // 1. Xử lý chuỗi thời gian tương đối
    if (str.includes('trước') || str.includes('vừa xong') || str.includes('vài giây')) {
        const numberMatch = str.match(/\d+/);
        const amount = numberMatch?.[0] ? parseInt(numberMatch[0], 10) : 1;
        if (str.includes('giây') || str.includes('vừa xong')) {
            now.setSeconds(now.getSeconds() - amount);
            return now;
        }
        if (str.includes('phút')) {
            now.setMinutes(now.getMinutes() - amount);
            return now;
        }
        if (str.includes('giờ')) {
            now.setHours(now.getHours() - amount);
            return now;
        }
        if (str.includes('ngày')) {
            now.setDate(now.getDate() - amount);
            return now;
        }
        if (str.includes('tuần')) {
            now.setDate(now.getDate() - amount * 7);
            return now;
        }
        if (str.includes('tháng')) {
            now.setMonth(now.getMonth() - amount);
            return now;
        }
        if (str.includes('năm')) {
            now.setFullYear(now.getFullYear() - amount);
            return now;
        }
    }
    // 2. Xử lý định dạng ngày cố định "DD/MM/YYYY" hoặc "DD/MM/YYYY HH:mm"
    const dateMatch = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?/);
    if (dateMatch && dateMatch[1] && dateMatch[2] && dateMatch[3]) {
        const day = parseInt(dateMatch[1], 10);
        const month = parseInt(dateMatch[2], 10) - 1;
        const year = parseInt(dateMatch[3], 10);
        const hour = dateMatch[4] ? parseInt(dateMatch[4], 10) : 0;
        const minute = dateMatch[5] ? parseInt(dateMatch[5], 10) : 0;
        return new Date(year, month, day, hour, minute);
    }
    // 3. Fallback cho ISO String hoặc parse mặc định
    const parsedDate = new Date(dateString);
    return isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
};
exports.parseDate = parseDate;
