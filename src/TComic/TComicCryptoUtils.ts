import CryptoJS from 'crypto-js';

const ENDPOINT_KEYS: Record<string, string> = {
    '/api/web/comic/top/chapter': 'xK9m2Pq5vR8nL3wY',
    '/api/web/comic/top/comment': 'hJ7tN4cX2dB9mE6v',
    '/api/web/comic/top/daily': 'wQ5aZ8kP3fG9nM4x',
    '/api/web/comic/top/follow': 'uY2sL7jH4vC8tR5b',
    '/api/web/comic/top/monthly': 'pD6mK9nX3wQ8vE4t',
    '/api/web/comic/top/weekly': 'bF5hN2mJ7kL4wS9x',
    '/api/web/comic/chapters': 'tR8cX4vB2nM6pH9q',
    '/api/web/comic/comments': 'gW3kL8pE5nX9jM2v',
    '/api/web/comic/completed-comics': 'yH6tB4mS9cR2wQ7n',
    '/api/web/comic/genres': 'dK5vX8nL3pH7mE4w',
    '/api/web/comic/girl-comics': 'aF9jR2tY6mN4wS8x',
    '/api/web/comic/boy-comics': 'aF9jR2tY6mN4wS323',
    '/api/web/comic/info': 'zQ7hB5vC3kL9pM2n',
    '/api/web/comic/new-comics': 'mW4sX8gH2nR6tE9j',
    '/api/web/comic/recent-update-comics': 'cP5kM9wL4vB8nX2t',
    '/api/web/comic/recommend-comics': 'fT3jH7mE2sQ9rY6w',
    '/api/web/comic/report-chapter-comic': 'bN8kR4xW6pH2vL9t',
    '/api/web/comic/search': 'qM5cY9nJ3wS7tE4h',
    '/api/web/comic/suggest': 'vB2pK8mX4fL6wR9n',
    '/api/web/comic/top': 'sH7tG3nQ9cM5xW2j',
    '/api/web/comic/trending-comics': 'kD4wP8vY6mL2tR5n',
    '/api/web/comic/genres/all': 'aF9jR2tY6mN4wS323dhjksa',
};

const MASTER_AES_KEY = 'sTUSpQjxBQIW3EdsadsauVEo6ZGmIEp6zxJgJV';
const STATIC_SALT = 'iHbS0oIGYjVaLwvjynBpjQFtc5YCCGX6';

// export function generateRequestId(endpoint: string, params: Record<string, any> = {}): string {
//     const endpointKey = ENDPOINT_KEYS[endpoint] || '';

//     // 1. Mốc thời gian Unix (ms) tại đầu giờ hiện tại
//     const now = new Date();
//     now.setMinutes(0, 0, 0);
//     const startOfHourTimestamp = now.getTime();

//     // 2. Chuyển giá trị sang String và sắp xếp key A-Z
//     const sortedParams: Record<string, string> = {};
//     Object.keys(params)
//         .sort()
//         .forEach((key) => {
//             sortedParams[key] = String(params[key]);
//         });

//     // 3. Ghép payload
//     const payload = `${endpointKey}-${endpoint}-${STATIC_SALT}-${startOfHourTimestamp}-${JSON.stringify(sortedParams)}`;

//     // 4. Mã hóa AES
//     return CryptoJS.AES.encrypt(payload, MASTER_AES_KEY).toString();
// }

export function generateRequestId(endpoint: string, params: Record<string, any> = {}): string {
    if (!endpoint) return '';

    // 1. Loại bỏ domain và query string nếu có -> lấy relative path
    const rawEndpoint =
        String(endpoint)
            .replace(/^https?:\/\/[^\/]+/, '')
            .split('?')[0] ?? '';

    // 2. Logic cắt số ID đúng chuẩn web gốc:
    // /api/web/comic/chapters/1257815 -> /api/web/comic/chapters
    // /api/web/comic/info/33917       -> /api/web/comic/info
    const signEndpoint = rawEndpoint.replace(/\/\d+(?=\/|$)/g, '');

    // 3. Lấy endpointKey tương ứng từ bảng ENDPOINT_KEYS
    let endpointKey = ENDPOINT_KEYS[signEndpoint];

    // Fallback riêng cho slug chữ như /api/web/comic/genres/abo
    if (!endpointKey && signEndpoint.startsWith('/api/web/comic/genres/')) {
        endpointKey = ENDPOINT_KEYS['/api/web/comic/genres'];
    }
    if (!endpointKey) endpointKey = '';

    // 4. Mốc thời gian Unix (ms) tại đầu giờ hiện tại
    const now = new Date();
    now.setMinutes(0, 0, 0);
    const startOfHourTimestamp = now.getTime();

    // 5. Chuyển giá trị params sang String và sắp xếp key A-Z
    const sortedParams: Record<string, string> = {};
    if (params && typeof params === 'object') {
        Object.keys(params)
            .sort()
            .forEach((key) => {
                if (params[key] !== undefined && params[key] !== null) {
                    sortedParams[key] = String(params[key]);
                }
            });
    }

    // 6. Ghép payload với signEndpoint (đã cắt bỏ ID số)
    const payload = `${endpointKey}-${signEndpoint}-${STATIC_SALT}-${startOfHourTimestamp}-${JSON.stringify(sortedParams)}`;

    // 7. Mã hóa AES
    return CryptoJS.AES.encrypt(payload, MASTER_AES_KEY).toString();
}
