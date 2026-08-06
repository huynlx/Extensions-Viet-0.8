"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
// 🌐 MOCK GLOBAL APP CHO TẤT CẢ FILE TEST
global.App = {
    createSourceStateManager: () => ({
        store: new Map(),
        get: jest.fn(),
        set: jest.fn(),
    }),
    createRequestManager: (config) => ({
        ...config,
        schedule: async (request) => {
            try {
                const res = await (0, axios_1.default)({
                    url: request.url,
                    method: request.method || 'GET',
                    data: request.data,
                    // Thêm User-Agent giả lập trình duyệt để hạn chế bị Cloudflare/Server block 403
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        ...(request.headers || {}),
                    },
                });
                return {
                    data: typeof res.data === 'object' ? JSON.stringify(res.data) : res.data,
                    status: res.status,
                };
            }
            catch (error) {
                console.error(`❌ Request Error [${error.response?.status || 500}]:`, error.message);
                // Trả về status để fetchAPI biết hoặc ném lỗi nếu muốn Jest fail ngay
                return { data: null, status: error.response?.status || 500 };
            }
        },
        getDefaultUserAgent: jest.fn().mockResolvedValue('Mozilla/5.0'),
    }),
    createRequest: (config) => config,
    // 🛠️ BUILDERS CỦA PAPERBACK
    createPartialSourceManga: (config) => ({ ...config }),
    createSourceManga: (config) => ({ ...config }),
    createMangaDetails: (config) => ({ ...config }),
    createChapter: (config) => ({ ...config }),
    createChapterDetails: (config) => ({ ...config }),
    createPagedResults: (config) => ({ ...config }),
    createHomeSection: (config) => ({ ...config, items: [] }),
    createDUISection: (config) => ({ ...config }),
    createTagSection: (config) => ({ ...config }),
    createTag: (config) => ({ ...config }),
};
