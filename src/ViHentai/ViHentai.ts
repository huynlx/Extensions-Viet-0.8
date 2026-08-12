import {
    BadgeColor,
    Chapter,
    ChapterDetails,
    ChapterProviding,
    ContentRating,
    DUISection,
    HomePageSectionsProviding,
    HomeSection,
    HomeSectionType,
    MangaProviding,
    PagedResults,
    Request,
    Response,
    SearchRequest,
    SearchResultsProviding,
    SourceInfo,
    SourceIntents,
    SourceManga,
    TagSection,
} from '@paperback/types';
import { CheerioAPI } from 'cheerio';
import { Parser } from './ViHentaiParser';
import { domainSettings, getDomain, resetSettings, getPassword, passwordSettings } from './ViHentaiSetting';

const DEFAULT_DOMAIN = 'https://vi-hentai.pro';

export const ViHentaiInfo: SourceInfo = {
    version: '1.0.3',
    name: 'ViHentai',
    icon: 'icon.png',
    author: 'Lê Đại Thiện Nhân',
    authorWebsite: 'https://github.com/huynlx/',
    description: 'Extension that pulls manga from ViHentai.',
    contentRating: ContentRating.EVERYONE,
    websiteBaseURL: DEFAULT_DOMAIN,
    sourceTags: [
        {
            text: 'Vietnamese',
            type: BadgeColor.GREEN,
        },
    ],
    intents: SourceIntents.MANGA_CHAPTERS | SourceIntents.HOMEPAGE_SECTIONS | SourceIntents.SETTINGS_UI | SourceIntents.CLOUDFLARE_BYPASS_REQUIRED,
};

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

export class ViHentai implements SearchResultsProviding, MangaProviding, ChapterProviding, HomePageSectionsProviding {
    stateManager = App.createSourceStateManager();
    parser = new Parser();

    private cache = new Map<string, CacheEntry<any>>();
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 phút mặc định
    private readonly TAGS_CACHE_TTL = 24 * 60 * 60 * 1000; // 1 ngày cho tags
    private readonly MANGA_DETAIL_CACHE_TTL = 24 * 60 * 60 * 1000; // 1 ngày cho manga details
    private readonly CHAPTER_DETAIL_CACHE_TTL = 24 * 60 * 60 * 1000; // 1 ngày cho chapter details

    constructor(private cheerio: CheerioAPI) {}

    private async getBaseUrl(): Promise<string> {
        const domain = await getDomain(this.stateManager);
        return domain.replace(/\/+$/, '');
    }

    readonly requestManager = App.createRequestManager({
        requestsPerSecond: 1,
        requestTimeout: 50000,
        interceptor: {
            interceptRequest: async (request: Request): Promise<Request> => {
                const baseUrl = await this.getBaseUrl();
                request.headers = {
                    ...(request.headers ?? {}),
                    referer: `${baseUrl}/`,
                    'user-agent': await this.requestManager.getDefaultUserAgent(),
                };
                return request;
            },
            interceptResponse: async (response: Response): Promise<Response> => {
                return response;
            },
        },
    });

    async submitConfiguredPassword(html: string, currentUrl: string): Promise<boolean> {
        const wireDataMatch = html.match(/wire:initial-data="([^"]+)"/);
        const rawWireData = wireDataMatch?.[1];
        if (!rawWireData) return false;

        const rawJson = rawWireData
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>');

        let wireData: any;
        try {
            wireData = JSON.parse(rawJson);
        } catch {
            return false;
        }

        const fingerprint = wireData.fingerprint;
        const serverMemo = wireData.serverMemo;

        const csrfMatch = html.match(/livewire_token\s*=\s*'([^']+)'/) || html.match(/name="csrf-token"\s+content="([^"]+)"/);
        const csrfToken = csrfMatch?.[1] ?? '';

        if (!csrfToken) return false;

        const password = await getPassword(this.stateManager);
        const baseUrl = await this.getBaseUrl();

        const submitPayload = {
            fingerprint: fingerprint,
            serverMemo: serverMemo,
            updates: [
                {
                    type: 'syncInput',
                    payload: {
                        id: 's1',
                        name: 'password',
                        value: password,
                    },
                },
                {
                    type: 'callMethod',
                    payload: {
                        id: 'c1',
                        method: 'submit',
                        params: [],
                    },
                },
            ],
        };

        const submitReq = App.createRequest({
            url: `${baseUrl}/livewire/message/enter-secret`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken,
                'X-Livewire': 'true',
                Accept: 'text/html, application/xhtml+xml',
                Referer: currentUrl,
            },
            data: JSON.stringify(submitPayload),
        });

        const response = await this.requestManager.schedule(submitReq, 1);
        return response.status === 200;
    }

    async DOMHTML(url: string, param?: any): Promise<CheerioAPI> {
        const cacheKey = `dom-${url}-${JSON.stringify(param ?? '')}`;
        const now = Date.now();
        const cached = this.cache.get(cacheKey);

        if (cached && now - cached.timestamp < this.CACHE_TTL) {
            return cached.data;
        }

        const req = App.createRequest({
            url: url,
            method: 'GET',
            headers: {
                Referer: url,
            },
            param,
        });

        let res = await this.requestManager.schedule(req, 1);
        let html = (res.data as string) ?? '';

        if (html.includes('wire:initial-data') && html.includes('enter-secret')) {
            const success = await this.submitConfiguredPassword(html, url);

            if (success) {
                res = await this.requestManager.schedule(req, 1);
                html = (res.data as string) ?? '';
            }
        }

        const $ = this.cheerio.load(html);
        this.cache.set(cacheKey, { data: $, timestamp: now });
        return $;
    }

    /**
     * Gửi request Livewire switchTab tới component home-rank-tab
     * @param tabIndex 1: Top tháng, 0: Top tuần (hoặc tùy biến theo tab của web)
     */
    private async fetchLivewireRankTab(baseUrl: string, tabIndex: number, $home: CheerioAPI): Promise<CheerioAPI | null> {
        try {
            const html = $home.html();

            // 1. Trích xuất CSRF Token
            const csrfMatch = html.match(/livewire_token\s*=\s*'([^']+)'/) || html.match(/name="csrf-token"\s+content="([^"]+)"/);
            const csrfToken = csrfMatch?.[1] ?? '';
            if (!csrfToken) return null;

            // 2. Trích xuất initial data của component home-rank-tab
            let rankTabData: any = null;
            const matches = [...html.matchAll(/wire:initial-data="([^"]+)"/g)];
            for (const match of matches) {
                const rawJson = (match[1] ?? '')
                    .replace(/&quot;/g, '"')
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>');
                try {
                    const parsed = JSON.parse(rawJson);
                    if (parsed?.fingerprint?.name === 'home-rank-tab') {
                        rankTabData = parsed;
                        break;
                    }
                } catch {}
            }

            if (!rankTabData) return null;

            // 3. Tạo Payload gửi Livewire
            const payload = {
                fingerprint: rankTabData.fingerprint,
                serverMemo: rankTabData.serverMemo,
                updates: [
                    {
                        type: 'callMethod',
                        payload: {
                            id: 'switchTabCall',
                            method: 'switchTab',
                            params: [tabIndex],
                        },
                    },
                ],
            };

            const req = App.createRequest({
                url: `${baseUrl}/livewire/message/home-rank-tab`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'X-Livewire': 'true',
                    Accept: 'text/html, application/xhtml+xml',
                    Referer: `${baseUrl}/`,
                },
                data: JSON.stringify(payload),
            });

            const response = await this.requestManager.schedule(req, 1);
            if (response.status !== 200) return null;

            const resJson = JSON.parse((response.data as string) ?? '{}');
            const renderedHtml = resJson?.effects?.html ?? resJson?.responses?.[0]?.effects?.html ?? '';

            if (!renderedHtml) return null;
            return this.cheerio.load(renderedHtml);
        } catch (e) {
            console.error('Lỗi fetch Livewire rank tab:', e);
            return null;
        }
    }

    async getMangaShareUrl(mangaId: string): Promise<string> {
        const baseUrl = await this.getBaseUrl();
        return `${baseUrl}/truyen/${mangaId}`;
    }

    async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
        const baseUrl = await this.getBaseUrl();

        const sections = [
            App.createHomeSection({ id: 'featured', title: 'Truyện Hot', containsMoreItems: false, type: HomeSectionType.featured }),
            App.createHomeSection({ id: 'new_updated', title: 'Mới Cập Nhật', containsMoreItems: true, type: HomeSectionType.singleRowNormal }),
            App.createHomeSection({ id: 'top_week', title: 'Top Truyện Tuần', containsMoreItems: false, type: HomeSectionType.singleRowLarge }),
            App.createHomeSection({ id: 'top_month', title: 'Top Truyện Tháng', containsMoreItems: false, type: HomeSectionType.singleRowLarge }),
            App.createHomeSection({ id: 'recommend', title: 'Truyện Đề Cử', containsMoreItems: false, type: HomeSectionType.singleRowLarge }),
            App.createHomeSection({ id: 'favorite', title: 'Xem Nhiều', containsMoreItems: true, type: HomeSectionType.singleRowNormal }),
            App.createHomeSection({ id: 'new_added', title: 'Mới Nhất', containsMoreItems: true, type: HomeSectionType.singleRowNormal }),
        ];

        for (const section of sections) {
            sectionCallback(section);
        }

        const domCache = new Map<string, Promise<CheerioAPI>>();
        const fetchCachedDOM = (url: string): Promise<CheerioAPI> => {
            if (!domCache.has(url)) {
                domCache.set(url, this.DOMHTML(url));
            }
            return domCache.get(url)!;
        };

        // Load HTML trang chủ 1 lần duy nhất
        const $home = await fetchCachedDOM(baseUrl);

        for (const section of sections) {
            // Top Tuần: Parse từ DOM trang chủ gốc
            if (section.id === 'top_week') {
                section.items = this.parser.parseTop($home);
                sectionCallback(section);
                continue;
            }

            // Top Tháng: Gọi Livewire switchTab(1) truyền kèm $home
            if (section.id === 'top_month') {
                const $tab = await this.fetchLivewireRankTab(baseUrl, 1, $home);
                if ($tab) {
                    section.items = this.parser.parseTop($tab);
                }
                sectionCallback(section);
                continue;
            }

            let url: string;
            switch (section.id) {
                case 'featured':
                case 'recommend':
                    url = baseUrl;
                    break;
                case 'new_updated':
                    url = `${baseUrl}/tim-kiem?sort=-updated_at&page=1`;
                    break;
                case 'favorite':
                    url = `${baseUrl}/tim-kiem?sort=-views&page=1`;
                    break;
                case 'new_added':
                    url = `${baseUrl}/tim-kiem?sort=-created_at&page=1`;
                    break;
                default:
                    continue;
            }

            const $ = await fetchCachedDOM(url);

            switch (section.id) {
                case 'featured':
                    section.items = this.parser.parseFeaturedSection($);
                    break;
                case 'recommend':
                    section.items = this.parser.parseHotSection($);
                    break;
                case 'new_updated':
                case 'favorite':
                case 'new_added':
                    section.items = this.parser.parseSearchResults($);
                    break;
            }

            sectionCallback(section);
        }
    }

    async getSearchTags(): Promise<TagSection[]> {
        const cacheKey = 'search-tags';
        const now = Date.now();
        const cached = this.cache.get(cacheKey);

        if (cached && now - cached.timestamp < this.TAGS_CACHE_TTL) {
            return cached.data;
        }

        const tags = await this.parser.parseTags();
        this.cache.set(cacheKey, { data: tags, timestamp: now });
        return tags;
    }

    private async fetchMangaPage(mangaId: string): Promise<CheerioAPI> {
        const cacheKey = `manga-page-${mangaId}`;
        const now = Date.now();
        const cached = this.cache.get(cacheKey);

        if (cached && now - cached.timestamp < this.MANGA_DETAIL_CACHE_TTL) {
            return cached.data;
        }

        const baseUrl = await this.getBaseUrl();
        const $ = await this.DOMHTML(`${baseUrl}/truyen/${mangaId}`);

        this.cache.set(cacheKey, { data: $, timestamp: now });
        return $;
    }

    async getMangaDetails(mangaId: string): Promise<SourceManga> {
        const $ = await this.fetchMangaPage(mangaId);
        return this.parser.parseMangaDetails($, mangaId);
    }

    async getChapters(mangaId: string): Promise<Chapter[]> {
        const cacheKey = `chapters-${mangaId}`;
        const now = Date.now();
        const cached = this.cache.get(cacheKey);

        if (cached && now - cached.timestamp < this.MANGA_DETAIL_CACHE_TTL) {
            return cached.data;
        }

        const $ = await this.fetchMangaPage(mangaId);
        const chapters = this.parser.parseChapterList($);

        this.cache.set(cacheKey, { data: chapters, timestamp: now });
        return chapters;
    }

    async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        const cacheKey = `chapter-details-${chapterId}`;
        const now = Date.now();
        const cached = this.cache.get(cacheKey);

        let pages: string[];
        if (cached && now - cached.timestamp < this.CHAPTER_DETAIL_CACHE_TTL) {
            pages = cached.data;
        } else {
            const baseUrl = await this.getBaseUrl();
            const $ = await this.DOMHTML(`${baseUrl}/truyen/${mangaId}/${chapterId}`);
            pages = this.parser.parseChapterDetails($);
            this.cache.set(cacheKey, { data: pages, timestamp: now });
        }

        return App.createChapterDetails({
            id: chapterId,
            mangaId: mangaId,
            pages: pages,
        });
    }

    async supportsTagExclusion(): Promise<boolean> {
        return true;
    }

    async getSearchResults(query: SearchRequest, metadata: any): Promise<PagedResults> {
        const baseUrl = await this.getBaseUrl();
        const page = metadata?.page ?? 1;

        const keyword = query.title?.trim() ?? '';
        const genre = query.includedTags?.[0]?.id;

        let fullUrl = '';

        if (keyword) {
            fullUrl = `${baseUrl}/tim-kiem?keyword=${encodeURIComponent(keyword)}&page=${page}`;
        } else if (genre) {
            fullUrl = `${baseUrl}/the-loai/${genre}?page=${page}`;
        } else {
            fullUrl = `${baseUrl}/tim-kiem?page=${page}`;
        }

        const $ = await this.DOMHTML(fullUrl);
        const tiles = this.parser.parseSearchResults($);

        return App.createPagedResults({
            results: tiles,
            metadata: { page: page + 1 },
        });
    }

    async getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults> {
        const baseUrl = await this.getBaseUrl();
        const page: number = metadata?.page ?? 1;
        let url = '';

        switch (homepageSectionId) {
            case 'favorite':
                url = `${baseUrl}/tim-kiem?sort=-views&page=${page}`;
                break;
            case 'new_updated':
                url = `${baseUrl}/tim-kiem?sort=-updated_at&page=${page}`;
                break;
            case 'new_added':
                url = `${baseUrl}/tim-kiem?sort=-created_at&page=${page}`;
                break;
            case 'full':
                url = `${baseUrl}/truyen-hoan-thanh/`;
                break;
            default:
                throw new Error("Requested to getViewMoreItems for a section ID which doesn't exist");
        }

        const $ = await this.DOMHTML(url);
        const manga = this.parser.parseSearchResults($);

        return App.createPagedResults({
            results: manga,
            metadata: { page: page + 1 },
        });
    }

    async CloudFlareError(status: number): Promise<void> {
        if (status === 503 || status === 403) {
            const baseUrl = await this.getBaseUrl();
            throw new Error(`CLOUDFLARE BYPASS ERROR:\nPlease go to home page ${ViHentai.name} source (${baseUrl}) and press the cloud icon.`);
        }
    }

    async getCloudflareBypassRequestAsync(): Promise<Request> {
        const baseUrl = await this.getBaseUrl();
        return App.createRequest({
            url: `${baseUrl}/`,
            method: 'GET',
            headers: {
                referer: `${baseUrl}/`,
                origin: `${baseUrl}/`,
                'user-agent': await this.requestManager.getDefaultUserAgent(),
            },
        });
    }

    async getSourceMenu(): Promise<DUISection> {
        return App.createDUISection({
            id: 'main',
            header: 'Cài đặt Nguồn Truyện',
            rows: async () => [domainSettings(this.stateManager), passwordSettings(this.stateManager), resetSettings(this.stateManager)],
            isHidden: false,
        });
    }
}
