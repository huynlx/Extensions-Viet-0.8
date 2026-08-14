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
import { Parser } from './NhatTruyenParser';
import { domainSettings, getDomain, resetSettings } from './NhatTruyenSetting';

const DOMAIN = 'https://nhattruyenqq.com/';

export const NhatTruyenInfo: SourceInfo = {
    version: '1.0.0',
    name: 'NhatTruyen',
    icon: 'icon.png',
    author: 'Lê Đại Thiện Nhân',
    authorWebsite: 'https://github.com/huynlx/',
    description: 'Extension that pulls manga from NhatTruyen.',
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

export class NhatTruyen implements SearchResultsProviding, MangaProviding, ChapterProviding, HomePageSectionsProviding {
    constructor(private cheerio: CheerioAPI) {}

    stateManager = App.createSourceStateManager();
    parser = new Parser();

    private cache = new Map<string, CacheEntry<any>>();
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 phút mặc định
    private readonly TAGS_CACHE_TTL = 24 * 60 * 60 * 1000; // 1 ngày cho tags
    private readonly MANGA_DETAIL_CACHE_TTL = 24 * 60 * 60 * 1000; // 1 ngày cho manga details
    private readonly CHAPTER_DETAIL_CACHE_TTL = 24 * 60 * 60 * 1000; // 1 ngày cho chapter details

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
            interceptResponse: async (response: Response): Promise<Response> => {
                return response;
            },
        },
    });

    getMangaShareUrl(mangaId: string): string {
        return `${DOMAIN}/truyen-tranh/${mangaId}`;
    }

    private async DOMHTML(url: string, param?: any): Promise<CheerioAPI> {
        const cacheKey = `dom-${url}-${JSON.stringify(param ?? '')}`;
        const now = Date.now();
        const cached = this.cache.get(cacheKey);

        if (cached && now - cached.timestamp < this.CACHE_TTL) {
            return cached.data;
        }

        const request = App.createRequest({
            url: url,
            method: 'GET',
        });
        const response = await this.requestManager.schedule(request, 1);
        this.CloudFlareError(response.status);

        const $ = this.cheerio.load(response.data as string);
        this.cache.set(cacheKey, { data: $, timestamp: now });
        return $;
    }

    CloudFlareError(status: number) {
        if (status === 403) {
            throw new Error('CLOUDFLARE');
        }
        if (status === 429) {
            throw new Error('429');
        }
    }

    async getSourceMenu(): Promise<DUISection> {
        return App.createDUISection({
            id: 'main',
            header: 'Cài đặt Nguồn Truyện',
            rows: async () => [domainSettings(this.stateManager), resetSettings(this.stateManager)],
            isHidden: false,
        });
    }

    async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
        const baseUrl = await this.getBaseUrl();

        // 1. Khởi tạo các Section
        const featuredSection = App.createHomeSection({
            id: 'featured',
            title: 'Truyện Đề Cử',
            containsMoreItems: false,
            type: HomeSectionType.featured,
        });

        const hotSection = App.createHomeSection({
            id: 'hot',
            title: 'Truyện Nổi Bật',
            containsMoreItems: true,
            type: HomeSectionType.singleRowNormal,
        });

        const newUpdatedSection = App.createHomeSection({
            id: 'new_updated',
            title: 'Truyện Mới Cập Nhật',
            containsMoreItems: true,
            type: HomeSectionType.singleRowNormal,
        });

        const boysSection = App.createHomeSection({
            id: 'boys',
            title: 'Truyện Dành Cho Con Trai',
            containsMoreItems: true,
            type: HomeSectionType.singleRowNormal,
        });

        const girlsSection = App.createHomeSection({
            id: 'girls',
            title: 'Truyện Dành Cho Con Gái',
            containsMoreItems: true,
            type: HomeSectionType.singleRowNormal,
        });

        const completedSection = App.createHomeSection({
            id: 'completed',
            title: 'Truyện Đã Hoàn Thành',
            containsMoreItems: true,
            type: HomeSectionType.singleRowNormal,
        });

        // 2. Callback khung rỗng trước để UI hiển thị skeleton loading
        sectionCallback(featuredSection);
        sectionCallback(newUpdatedSection);
        sectionCallback(hotSection);
        sectionCallback(boysSection);
        sectionCallback(girlsSection);
        sectionCallback(completedSection);

        // 3. Tải và parse dữ liệu bất đồng bộ độc lập cho từng endpoint

        // Nguồn 1: Trang chủ (chứa cả Featured & New Updated)
        const fetchHome = this.DOMHTML(baseUrl).then(($home) => {
            featuredSection.items = this.parser.parseFeaturedSection($home);
            sectionCallback(featuredSection);

            newUpdatedSection.items = this.parser.parseNewUpdatedSection($home);
            sectionCallback(newUpdatedSection);
        });

        // Nguồn 2: Truyện hot
        const fetchHot = this.DOMHTML(`${baseUrl}/truyen-tranh-hot`).then(($hot) => {
            hotSection.items = this.parser.parseHotSection($hot);
            sectionCallback(hotSection);
        });

        // Nguồn 3: Truyện con trai
        const fetchBoys = this.DOMHTML(`${baseUrl}/truyen-tranh-con-trai`).then(($boys) => {
            boysSection.items = this.parser.parseSearchResults($boys);
            sectionCallback(boysSection);
        });

        // Nguồn 4: Truyện con gái
        const fetchGirls = this.DOMHTML(`${baseUrl}/truyen-tranh-con-gai`).then(($girls) => {
            girlsSection.items = this.parser.parseSearchResults($girls);
            sectionCallback(girlsSection);
        });

        // Nguồn 5: Truyện hoàn thành
        const fetchCompleted = this.DOMHTML(`${baseUrl}/tim-truyen?status=2&sort=30`).then(($completed) => {
            completedSection.items = this.parser.parseSearchResults($completed);
            sectionCallback(completedSection);
        });

        // Chờ tất cả request xử lý xong (thành công hoặc thất bại)
        await Promise.allSettled([fetchHome, fetchHot, fetchBoys, fetchGirls, fetchCompleted]);
    }

    async getSearchTags(): Promise<TagSection[]> {
        const cacheKey = 'search-tags';
        const now = Date.now();
        const cached = this.cache.get(cacheKey);

        if (cached && now - cached.timestamp < this.TAGS_CACHE_TTL) {
            return cached.data;
        }

        const baseUrl = await this.getBaseUrl();
        const $ = await this.DOMHTML(`${baseUrl}/tim-truyen`);
        const tags = this.parser.parseTags($);

        this.cache.set(cacheKey, { data: tags, timestamp: now });
        return tags;
    }

    private async fetchMangaPageCached(mangaId: string): Promise<CheerioAPI> {
        const cacheKey = `manga-page-${mangaId}`;
        const now = Date.now();
        const cached = this.cache.get(cacheKey);

        if (cached && now - cached.timestamp < this.MANGA_DETAIL_CACHE_TTL) {
            return cached.data;
        }

        const baseUrl = await this.getBaseUrl();
        const $ = await this.DOMHTML(`${baseUrl}/truyen-tranh/${mangaId}`);

        this.cache.set(cacheKey, { data: $, timestamp: now });
        return $;
    }

    async getMangaDetails(mangaId: string): Promise<SourceManga> {
        const $ = await this.fetchMangaPageCached(mangaId);
        return this.parser.parseMangaDetails($, mangaId);
    }

    async getChapters(mangaId: string): Promise<Chapter[]> {
        const cacheKey = `chapters-${mangaId}`;
        const now = Date.now();
        const cached = this.cache.get(cacheKey);

        if (cached && now - cached.timestamp < this.MANGA_DETAIL_CACHE_TTL) {
            return cached.data;
        }

        const baseUrl = await this.getBaseUrl();

        const request = App.createRequest({
            url: `${baseUrl}/Comic/Services/ComicService.asmx/ChapterList?slug=${mangaId}`,
            method: 'GET',
            headers: {
                referer: `${baseUrl}/truyen-tranh/${mangaId}`,
                'x-requested-with': 'XMLHttpRequest',
                accept: 'application/json, text/javascript, */*; q=0.01',
            },
        });

        const response = await this.requestManager.schedule(request, 1);
        this.CloudFlareError(response.status);

        // Parse dữ liệu JSON
        const json = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
        const chapterList: any[] = json?.data ?? [];

        const chapters = this.parser.parseChapterList(chapterList);
        this.cache.set(cacheKey, { data: chapters, timestamp: now });
        return chapters;
    }

    async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        const cacheKey = `chapter-details-${mangaId}-${chapterId}`;
        const now = Date.now();
        const cached = this.cache.get(cacheKey);

        let pages: string[];
        if (cached && now - cached.timestamp < this.CHAPTER_DETAIL_CACHE_TTL) {
            pages = cached.data;
        } else {
            const baseUrl = await this.getBaseUrl();
            const $ = await this.DOMHTML(`${baseUrl}/truyen-tranh/${mangaId}/chuong-${chapterId}`);
            pages = this.parser.parseChapterDetails($);
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
        const baseUrl = await this.getBaseUrl();

        let basePath = '/tim-truyen';
        const params: string[] = [];

        // Duyệt qua tất cả các tag được chọn từ UI
        if (query.includedTags && query.includedTags.length > 0) {
            for (const tag of query.includedTags) {
                const tagId = tag.id;

                // Bỏ qua các tag vô giá trị hoặc tag mặc định
                if (!tagId || tagId === 'all' || tagId === 'tim-truyen') {
                    continue;
                }

                if (tagId.includes('=')) {
                    // Xử lý query params (VD: status=2, sort=15)
                    params.push(tagId);
                } else if (tagId.startsWith('tag/')) {
                    // Xử lý trường hợp tag thuộc đường dẫn /tag/... (VD: tag/truyenqq)
                    basePath = `/${tagId}`;
                } else {
                    // Xử lý thể loại thông thường (VD: action-95)
                    basePath = `/tim-truyen/${tagId}`;
                }
            }
        }

        // Xử lý Từ khóa tìm kiếm nếu người dùng nhập
        if (query.title?.trim()) {
            params.push(`keyword=${encodeURIComponent(query.title.trim())}`);
        }

        // Xử lý Phân trang
        params.push(`page=${page}`);

        const queryString = params.length > 0 ? `?${params.join('&')}` : '';
        const fullUrl = `${baseUrl}${basePath}${queryString}`;

        const cacheKey = `search-${fullUrl}`;
        const now = Date.now();
        const cached = this.cache.get(cacheKey);

        let $: CheerioAPI;
        if (cached && now - cached.timestamp < this.CACHE_TTL) {
            $ = cached.data;
        } else {
            $ = await this.DOMHTML(fullUrl);
            this.cache.set(cacheKey, { data: $, timestamp: now });
        }

        const manga = this.parser.parseSearchResults($);

        // Kiểm tra trang tiếp theo dựa vào pagination active
        const hasNextPage = manga.length > 0 && $('.pagination li.active + li:not(.disabled)').length > 0;

        return App.createPagedResults({
            results: manga,
            metadata: hasNextPage ? { page: page + 1 } : undefined,
        });
    }

    async getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults> {
        const page: number = metadata?.page ?? 1;
        const baseUrl = await this.getBaseUrl();

        const sectionConfig: Record<string, { url: string; parse: ($: CheerioAPI) => any[] }> = {
            hot: {
                url: `${baseUrl}/truyen-tranh-hot?page=${page}`,
                parse: ($) => this.parser.parseHotSection($),
            },
            new_updated: {
                url: `${baseUrl}?page=${page}`,
                parse: ($) => this.parser.parseNewUpdatedSection($),
            },
            boys: {
                url: `${baseUrl}/truyen-tranh-con-trai?page=${page}`,
                parse: ($) => this.parser.parseSearchResults($),
            },
            girls: {
                url: `${baseUrl}/truyen-tranh-con-gai?page=${page}`,
                parse: ($) => this.parser.parseSearchResults($),
            },
            completed: {
                url: `${baseUrl}/tim-truyen?status=2&sort=30&page=${page}`,
                parse: ($) => this.parser.parseSearchResults($),
            },
        };

        const config = sectionConfig[homepageSectionId];

        if (!config) {
            throw new Error(`Invalid homepage section ID: ${homepageSectionId}`);
        }

        const cacheKey = `view-more-${config.url}`;
        const now = Date.now();
        const cached = this.cache.get(cacheKey);

        let $: CheerioAPI;
        if (cached && now - cached.timestamp < this.CACHE_TTL) {
            $ = cached.data;
        } else {
            $ = await this.DOMHTML(config.url);
            this.cache.set(cacheKey, { data: $, timestamp: now });
        }

        const manga = config.parse($);

        const hasNextPage = manga.length > 0 && $('.pagination li.active + li:not(.disabled)').length > 0;

        return App.createPagedResults({
            results: manga,
            metadata: hasNextPage ? { page: page + 1 } : undefined,
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
