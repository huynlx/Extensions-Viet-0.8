// Helper ghép query string siêu an toàn cho Native Engine
export function safeBuildQueryString(params?: Record<string, any>): string {
    // 1. Kiểm tra null/undefined hoặc không phải object
    if (!params || typeof params !== 'object') {
        return '';
    }

    try {
        const keys = Object.keys(params);
        if (keys.length === 0) return '';

        const pairs: string[] = [];
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            if (!key) continue;

            const val = params[key];
            // 2. Bỏ qua nếu giá trị là null hoặc undefined
            if (val === undefined || val === null) continue;

            // 3. Chuyển giá trị sang string an toàn
            const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);

            pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(strVal)}`);
        }

        return pairs.length > 0 ? `?${pairs.join('&')}` : '';
    } catch (e) {
        console.error('Lỗi khi ghép query string:', e);
        return '';
    }
}

export function buildCurlCommand(url: string, method: string = 'GET', headers: Record<string, string> = {}, body?: any): string {
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
