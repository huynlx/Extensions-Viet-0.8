"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCurlCommand = exports.safeBuildQueryString = void 0;
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
