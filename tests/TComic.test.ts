/// <reference types="jest" />
import axios from 'axios';
import { TComic } from '../src/TComic/TComic';

// 🌐 MOCK GLOBAL APP CHO JEST
(global as any).App = {
    createSourceStateManager: () => ({
        store: new Map(),
        get: jest.fn(),
        set: jest.fn(),
    }),
    createRequestManager: (config: any) => ({
        ...config,
        schedule: async (request: any) => {
            try {
                const res = await axios({
                    url: request.url,
                    method: request.method || 'GET',
                    headers: request.headers || {},
                    data: request.data,
                });
                return {
                    data: typeof res.data === 'object' ? JSON.stringify(res.data) : res.data,
                    status: res.status,
                };
            } catch (error: any) {
                console.error('❌ Request Error:', error.message);
                return { data: null, status: error.response?.status || 500 };
            }
        },
        getDefaultUserAgent: jest.fn().mockResolvedValue('Mozilla/5.0'),
    }),
    createRequest: (config: any) => config,

    // 🛠️ CÁC BUILDER CỦA PAPERBACK (Đã bổ sung createPartialSourceManga)
    createPartialSourceManga: (config: any) => ({ ...config }),
    createSourceManga: (config: any) => ({ ...config }),
    createMangaDetails: (config: any) => ({ ...config }),
    createChapter: (config: any) => ({ ...config }),
    createChapterDetails: (config: any) => ({ ...config }),
    createPagedResults: (config: any) => ({ ...config }),
    createHomeSection: (config: any) => ({ ...config, items: [] }),
    createDUISection: (config: any) => ({ ...config }),
    createTagSection: (config: any) => ({ ...config }),
    createTag: (config: any) => ({ ...config }),
};

describe('TComic Search Tests', () => {
    let source: TComic;

    beforeEach(() => {
        const cheerio = require('cheerio');
        source = new TComic(cheerio);
    });

    it('should search by Tag/Genre', async () => {
        const result = await source.getSearchResults(
            {
                title: '',
                includedTags: [{ id: 'action', label: 'Action' }],
                excludedTags: [],
                parameters: {},
            },
            { page: 1 }
        );

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
