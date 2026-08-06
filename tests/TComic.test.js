"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/// <reference types="jest" />
const axios_1 = __importDefault(require("axios"));
const TComic_1 = require("../src/TComic/TComic");
// 🌐 MOCK GLOBAL APP CHO JEST
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
                    headers: request.headers || {},
                    data: request.data,
                });
                return {
                    data: typeof res.data === 'object' ? JSON.stringify(res.data) : res.data,
                    status: res.status,
                };
            }
            catch (error) {
                console.error('❌ Request Error:', error.message);
                return { data: null, status: error.response?.status || 500 };
            }
        },
        getDefaultUserAgent: jest.fn().mockResolvedValue('Mozilla/5.0'),
    }),
    createRequest: (config) => config,
    // 🛠️ CÁC BUILDER CỦA PAPERBACK (Đã bổ sung createPartialSourceManga)
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
describe('TComic Search Tests', () => {
    let source;
    beforeEach(() => {
        const cheerio = require('cheerio');
        source = new TComic_1.TComic(cheerio);
    });
    it('should search by Tag/Genre', async () => {
        const result = await source.getSearchResults({
            title: '',
            includedTags: [{ id: 'action', label: 'Action' }],
            excludedTags: [],
            parameters: {},
        }, { page: 1 });
        // 🎯 Kiểm tra chặt chẽ: Kết quả không được rỗng
        expect(result).toBeDefined();
        expect(result.results).not.toBeUndefined();
        expect(result.results.length).toBeGreaterThan(0); // Nếu API trả về 403 -> results = [] -> Test sẽ FAIL ngay!
    });
    it('should search by Title keyword', async () => {
        const searchQuery = {
            title: 'god',
            includedTags: [],
            excludedTags: [],
            parameters: {},
        };
        const result = await source.getSearchResults(searchQuery, { page: 1 });
        expect(result).toBeDefined();
    });
});
