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
    TagSection,
} from '@paperback/types';
import { CheerioAPI } from 'cheerio';
import { generateRequestId } from './TComicCryptoUtils';
import { Parser } from './TComicParser';
import { domainSettings, getDomain, resetSettings } from './TComicSetting';
import { safeBuildQueryString } from '../../common';

const DOMAIN = 'https://tcomicfanqq.com';
const API_BASE_URL = 'https://api.tcomicfanqq.com';
const DEFAULT_LIMIT = 35;

// Tập trung toàn bộ Endpoints API ở đây
enum TComicEndpoints {
    CATEGORIES = '/api/web/categories',
    SEARCH = '/api/web/comic/search',
    INFO = '/api/web/comic/info',
    CHAPTERS = '/api/web/comic/chapters',
    GENRES = '/api/web/comic/genres',
    TRENDING = '/api/web/comic/trending-comics',
    RECENT_UPDATE = '/api/web/comic/recent-update-comics',
    NEW = '/api/web/comic/new-comics',
    COMPLETED = '/api/web/comic/top',
    BOY = '/api/web/comic/boy-comics',
    GIRL = '/api/web/comic/girl-comics',
}

export const TComicInfo: SourceInfo = {
    version: '1.0.0',
    name: 'TComic',
    icon: 'icon.png',
    author: 'Lê Đại Thiện Nhân',
    authorWebsite: 'https://github.com/huynlx/',
    description: 'Extension that pulls manga from TComic.',
    contentRating: ContentRating.EVERYONE,
    websiteBaseURL: DOMAIN,
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

export class TComic implements SearchResultsProviding, MangaProviding, ChapterProviding, HomePageSectionsProviding {
    stateManager = App.createSourceStateManager();
    parser = new Parser();

    private cache = new Map<string, CacheEntry<any>>();
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 phút mặc định
    private readonly TAGS_CACHE_TTL = 24 * 60 * 60 * 1000; // 1 ngày cho tags
    private readonly MANGA_DETAIL_CACHE_TTL = 24 * 60 * 60 * 1000; // 1 ngày cho manga details
    private readonly CHAPTER_DETAIL_CACHE_TTL = 24 * 60 * 60 * 1000; // 1 ngày cho chapter details

    constructor(cheerio: CheerioAPI) {}

    private async getBaseUrl(): Promise<string> {
        return await getDomain(this.stateManager);
    }

    readonly requestManager = App.createRequestManager({
        requestsPerSecond: 2,
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
            interceptResponse: async (response: Response): Promise<Response> => response,
        },
    });

    /**
     * Helper gửi request API và tự động ký header x-request-id
     */
    async fetchAPI(endpoint: string, params: Record<string, any> = {}): Promise<any> {
        const cacheKey = `api-${endpoint}-${JSON.stringify(params)}`;
        const now = Date.now();
        const cached = this.cache.get(cacheKey);

        if (cached && now - cached.timestamp < this.CACHE_TTL) {
            return cached.data;
        }

        const requestId = generateRequestId(endpoint, params);

        const queryString = safeBuildQueryString(params);
        const fullUrl = `${API_BASE_URL}${endpoint}${queryString}`;

        const headers = {
            accept: 'application/json',
            'x-request-id': requestId,
        };

        const request = App.createRequest({
            url: fullUrl,
            method: 'GET',
            headers: headers,
        });

        const response = await this.requestManager.schedule(request, 1);
        if (!response || !response.data) return null;

        const json = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
        this.cache.set(cacheKey, { data: json, timestamp: now });
        return json;
    }

    getMangaShareUrl(mangaId: string): string {
        return `${DOMAIN}/truyen-tranh/${mangaId}`;
    }

    CloudFlareError(status: number) {
        if (status === 403) throw new Error('CLOUDFLARE');
        if (status === 429) throw new Error('429');
    }

    async getSourceMenu(): Promise<DUISection> {
        return App.createDUISection({
            id: 'main',
            header: 'Cài đặt Nguồn Truyện',
            rows: async () => [domainSettings(this.stateManager), resetSettings(this.stateManager)],
            isHidden: false,
        });
    }

    async getSearchTags(): Promise<TagSection[]> {
        const cacheKey = 'search-tags';
        const now = Date.now();
        const cached = this.cache.get(cacheKey);

        if (cached && now - cached.timestamp < this.TAGS_CACHE_TTL) {
            return cached.data;
        }

        const json = await this.fetchAPI(TComicEndpoints.CATEGORIES);
        const tags = this.parser.parseTags(json ?? []);

        this.cache.set(cacheKey, { data: tags, timestamp: now });
        return tags;
    }

    /**
     * Cấu hình định nghĩa các Section ở trang chủ
     */
    private get homeSectionConfigs() {
        return [
            {
                id: 'featured',
                title: 'Truyện Đề Xuất',
                type: HomeSectionType.featured,
                endpoint: TComicEndpoints.TRENDING,
                parse: (json: any) => this.parser.parseFeaturedSection(json),
            },
            {
                id: 'recent_update',
                title: 'Mới Cập Nhật',
                type: HomeSectionType.singleRowNormal,
                endpoint: TComicEndpoints.RECENT_UPDATE,
                parse: (json: any) => this.parser.parseNewUpdatedSection(json),
            },
            {
                id: 'hot',
                title: 'Nổi Bật',
                type: HomeSectionType.singleRowNormal,
                endpoint: TComicEndpoints.TRENDING,
                parse: (json: any) => this.parser.parseHotSection(json),
            },
            {
                id: 'new',
                title: 'Mới Thêm',
                type: HomeSectionType.singleRowNormal,
                endpoint: TComicEndpoints.NEW,
                parse: (json: any) => this.parser.parseNewSection(json),
            },
            {
                id: 'completed',
                title: 'Đã Hoàn Thành',
                type: HomeSectionType.singleRowNormal,
                endpoint: TComicEndpoints.COMPLETED,
                parse: (json: any) => this.parser.parseCompletedSection(json),
                status: 'completed',
            },
            {
                id: 'boy',
                title: 'Con Trai',
                type: HomeSectionType.singleRowNormal,
                endpoint: TComicEndpoints.BOY,
                parse: (json: any) => this.parser.parseBoySection(json),
            },
            {
                id: 'girl',
                title: 'Con Gái',
                type: HomeSectionType.singleRowNormal,
                endpoint: TComicEndpoints.GIRL,
                parse: (json: any) => this.parser.parseGirlSection(json),
            },
        ];
    }

    async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
        const sections = this.homeSectionConfigs.map((config) => {
            const section = App.createHomeSection({
                id: config.id,
                title: config.title,
                containsMoreItems: true,
                type: config.type,
            });
            sectionCallback(section);
            return { ...config, section };
        });

        const params = { page: 1, limit: DEFAULT_LIMIT };

        // Map quản lý Promise theo cacheKey để tránh gửi trùng API
        const endpointPromiseMap = new Map<string, Promise<any>>();

        const fetchPromises = sections.map(async ({ endpoint, parse, section, status }) => {
            const queryParams = { ...params, status };
            const cacheKey = `${endpoint}_${JSON.stringify(queryParams)}`;

            try {
                if (!endpointPromiseMap.has(cacheKey)) {
                    endpointPromiseMap.set(cacheKey, this.fetchAPI(endpoint, queryParams));
                }

                const json = await endpointPromiseMap.get(cacheKey)!;

                if (json) {
                    section.items = parse(json);
                    sectionCallback(section);
                }
            } catch (error) {
                console.error(`Failed to load home section [${section.id}]:`, error);
            }
        });

        await Promise.allSettled(fetchPromises);
    }

    private async fetchMangaInfo(mangaId: string): Promise<any> {
        const cacheKey = `manga-info-${mangaId}`;
        const now = Date.now();
        const cached = this.cache.get(cacheKey);

        if (cached && now - cached.timestamp < this.MANGA_DETAIL_CACHE_TTL) {
            return cached.data;
        }

        const json = await this.fetchAPI(`${TComicEndpoints.INFO}/${mangaId}`);
        this.cache.set(cacheKey, { data: json, timestamp: now });
        return json;
    }

    async getMangaDetails(mangaId: string): Promise<any> {
        const json = await this.fetchMangaInfo(mangaId);

        if (!json) {
            throw new Error(`Không thể lấy thông tin chi tiết cho truyện ID: ${mangaId}`);
        }

        return this.parser.parseMangaDetails(json, mangaId);
    }

    async getChapters(mangaId: string): Promise<Chapter[]> {
        const cacheKey = `chapters-${mangaId}`;
        const now = Date.now();
        const cached = this.cache.get(cacheKey);

        let json: any;
        if (cached && now - cached.timestamp < this.MANGA_DETAIL_CACHE_TTL) {
            json = cached.data;
        } else {
            json = await this.fetchMangaInfo(mangaId);
            this.cache.set(cacheKey, { data: json, timestamp: now });
        }

        if (!json || !json.data) {
            return [];
        }

        const chapterList: any[] = json.data.chapters ?? [];
        return this.parser.parseChapterList(chapterList);
    }

    async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        const cacheKey = `chapter-details-${chapterId}`;
        const now = Date.now();
        const cached = this.cache.get(cacheKey);

        let pages: string[];
        if (cached && now - cached.timestamp < this.CHAPTER_DETAIL_CACHE_TTL) {
            pages = cached.data;
        } else {
            const endpoint = `${TComicEndpoints.CHAPTERS}/${chapterId}`;
            const params = { comicId: mangaId, chapterId: chapterId };

            const json = await this.fetchAPI(endpoint, params);

            if (!json) {
                throw new Error(`Không thể lấy danh sách ảnh cho Chapter ID: ${chapterId}`);
            }

            pages = this.parser.parseChapterDetails(json);
            this.cache.set(cacheKey, { data: pages, timestamp: now });
        }

        return App.createChapterDetails({
            id: chapterId,
            mangaId: mangaId,
            pages: pages,
        });
    }

    async getSearchResults(query: SearchRequest, metadata: any): Promise<PagedResults> {
        const page: number = metadata?.page ?? 1;
        const limit = DEFAULT_LIMIT;

        let endpoint: string = TComicEndpoints.RECENT_UPDATE;
        const params: Record<string, any> = { page };

        if (query.title?.trim()) {
            endpoint = TComicEndpoints.SEARCH;
            params['q'] = query.title.trim();
        } else if (query.includedTags && query.includedTags.length > 0) {
            const genreId = query.includedTags.find((tag) => tag.id)?.id;
            if (genreId) {
                endpoint = `${TComicEndpoints.GENRES}/${genreId}`;
                params['limit'] = limit;
            } else {
                params['limit'] = limit;
            }
        } else {
            params['limit'] = limit;
        }

        const json = await this.fetchAPI(endpoint, params);

        if (!json) {
            return App.createPagedResults({ results: [], metadata: undefined });
        }

        const manga = this.parser.parseComicSection(json);
        const currentPage = Number(json.current_page) || page;
        const totalPages = Number(json.total_pages) || 0;

        const hasNextPage = totalPages > 0 ? currentPage < totalPages : manga.length >= limit;

        return App.createPagedResults({
            results: manga,
            metadata: hasNextPage ? { page: currentPage + 1 } : undefined,
        });
    }

    async getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults> {
        const page: number = metadata?.page ?? 1;
        const limit = DEFAULT_LIMIT;

        const config = this.homeSectionConfigs.find((sec) => sec.id === homepageSectionId);

        if (!config) {
            throw new Error(`Invalid homepage section ID: ${homepageSectionId}`);
        }

        const json = await this.fetchAPI(config.endpoint, { page, limit, status: config.status });

        if (!json) {
            return App.createPagedResults({ results: [], metadata: undefined });
        }

        const manga = config.parse(json);
        const currentPage = Number(json.current_page) || page;
        const totalPages = Number(json.total_pages) || 0;
        const hasNextPage = totalPages > 0 ? currentPage < totalPages : manga.length >= limit;

        return App.createPagedResults({
            results: manga,
            metadata: hasNextPage ? { page: currentPage + 1 } : undefined,
        });
    }

    async getCloudflareBypassRequestAsync(): Promise<Request> {
        const baseUrl = await this.getBaseUrl();
        return App.createRequest({
            url: baseUrl,
            method: 'GET',
            headers: {
                referer: `${baseUrl}/`,
                origin: `${baseUrl}/`,
                'user-agent': await this.requestManager.getDefaultUserAgent(),
            },
        });
    }
}
