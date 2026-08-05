import axios from 'axios';

// 🌐 MOCK GLOBAL APP CHO TẤT CẢ FILE TEST
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
            } catch (error: any) {
                console.error(`❌ Request Error [${error.response?.status || 500}]:`, error.message);
                // Trả về status để fetchAPI biết hoặc ném lỗi nếu muốn Jest fail ngay
                return { data: null, status: error.response?.status || 500 };
            }
        },
        getDefaultUserAgent: jest.fn().mockResolvedValue('Mozilla/5.0'),
    }),
    createRequest: (config: any) => config,

    // 🛠️ BUILDERS CỦA PAPERBACK
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
