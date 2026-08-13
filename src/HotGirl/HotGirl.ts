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
    PartialSourceManga,
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
import { Parser } from './HotGirlParser';
import { domainSettings, getDomain, resetSettings } from './HotGirlSetting';

const DOMAIN = 'https://hotgirl.biz';

export const HotGirlInfo: SourceInfo = {
    version: '1.0.0',
    name: 'HotGirl',
    icon: 'icon.png',
    author: 'Lê Đại Thiện Nhân',
    authorWebsite: 'https://github.com/huynlx/',
    description: 'Extension that pulls manga from HotGirl.',
    contentRating: ContentRating.EVERYONE,
    websiteBaseURL: DOMAIN,
    sourceTags: [
        {
            text: 'NSFW ',
            type: BadgeColor.RED,
        },
        {
            text: '18+',
            type: BadgeColor.RED,
        },
    ],
    intents: SourceIntents.MANGA_CHAPTERS | SourceIntents.HOMEPAGE_SECTIONS | SourceIntents.SETTINGS_UI | SourceIntents.CLOUDFLARE_BYPASS_REQUIRED,
};

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

export class HotGirl implements SearchResultsProviding, MangaProviding, ChapterProviding, HomePageSectionsProviding {
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
        return `${DOMAIN}/truyen/${mangaId}`;
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

    async getSearchTags(): Promise<TagSection[]> {
        const cacheKey = 'search-tags';
        const now = Date.now();
        const cached = this.cache.get(cacheKey);

        if (cached && now - cached.timestamp < this.TAGS_CACHE_TTL) {
            return cached.data;
        }

        const baseUrl = await this.getBaseUrl();
        const $ = await this.DOMHTML(`${baseUrl}/`);
        const tags = this.parser.parseTags($);

        this.cache.set(cacheKey, { data: tags, timestamp: now });
        return tags;
    }

    async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
        const baseUrl = await this.getBaseUrl();
        const cleanBaseUrl = baseUrl.replace(/\/$/, '');

        // 1. Khởi tạo tất cả các Home Section
        const featuredSection = App.createHomeSection({
            id: 'featured',
            title: 'TRUYỆN HENTAI HOT',
            containsMoreItems: false,
            type: HomeSectionType.featured,
        });

        const newUpdatedSection = App.createHomeSection({
            id: 'new_updated',
            title: 'RECENT POSTS',
            containsMoreItems: true,
            type: HomeSectionType.singleRowNormal,
        });

        const mayLikeSection = App.createHomeSection({
            id: 'may-like',
            title: 'POPULAR POSTS',
            containsMoreItems: false,
            type: HomeSectionType.singleRowLarge,
        });

        const top3DaysSection = App.createHomeSection({
            id: 'top_3',
            title: 'MOST POPULAR WEEKLY',
            containsMoreItems: true,
            type: HomeSectionType.singleRowNormal,
        });

        const top7DaysSection = App.createHomeSection({
            id: 'top_7',
            title: 'MOST POPULAR MONTHLY',
            containsMoreItems: true,
            type: HomeSectionType.singleRowNormal,
        });

        const top30DaysSection = App.createHomeSection({
            id: 'top_30',
            title: 'MOST POPULAR YEARLY',
            containsMoreItems: true,
            type: HomeSectionType.singleRowNormal,
        });

        // 2. Callback gửi các khung rỗng lên UI ngay lập tức
        const sections = [featuredSection, newUpdatedSection, mayLikeSection, top3DaysSection, top7DaysSection, top30DaysSection];

        for (const section of sections) {
            sectionCallback(section);
        }

        // 3. Xử lý bất đồng bộ các luồng request độc lập

        // Nguồn 1: Trang chủ (dùng cho Featured, Mới Nhất & Bạn Có Thể Thích)
        const fetchHome = this.DOMHTML(baseUrl).then(($home) => {
            featuredSection.items = this.parser.parseFeaturedSection($home);
            sectionCallback(featuredSection);

            newUpdatedSection.items = this.parser.parseSearchResults($home);
            sectionCallback(newUpdatedSection);

            mayLikeSection.items = this.parser.parseMayLikeSection($home);
            sectionCallback(mayLikeSection);
        });

        // Nguồn 2: Top 3 days
        const fetchTop3Days = this.DOMHTML(`${cleanBaseUrl}/most-popular-weekly/`).then(($) => {
            top3DaysSection.items = this.parser.parseSearchResults($);
            sectionCallback(top3DaysSection);
        });

        // Nguồn 3: Top 7 days
        const fetchTop7Days = this.DOMHTML(`${cleanBaseUrl}/most-popular-monthly/`).then(($) => {
            top7DaysSection.items = this.parser.parseSearchResults($);
            sectionCallback(top7DaysSection);
        });

        // Nguồn 4: Top 30 days
        const fetchTop30Days = this.DOMHTML(`${cleanBaseUrl}/most-popular-yearly/`).then(($) => {
            top30DaysSection.items = this.parser.parseSearchResults($);
            sectionCallback(top30DaysSection);
        });

        // Đợi tất cả hoàn thành để kết thúc hàm
        await Promise.allSettled([fetchHome, fetchTop3Days, fetchTop7Days, fetchTop30Days]);
    }

    private async fetchMangaPageCached(realMangaId: string): Promise<CheerioAPI> {
        const cacheKey = `manga-page-${realMangaId}`;
        const now = Date.now();
        const cached = this.cache.get(cacheKey);

        if (cached && now - cached.timestamp < this.MANGA_DETAIL_CACHE_TTL) {
            return cached.data;
        }

        const baseUrl = await this.getBaseUrl();
        const $ = await this.DOMHTML(`${baseUrl}/${realMangaId}`);

        this.cache.set(cacheKey, { data: $, timestamp: now });
        return $;
    }

    async getMangaDetails(mangaId: string): Promise<SourceManga> {
        const realMangaId = mangaId.split('|')[0] ?? '';
        const $ = await this.fetchMangaPageCached(realMangaId);
        return this.parser.parseMangaDetails($, mangaId);
    }

    async getChapters(mangaId: string): Promise<Chapter[]> {
        const realMangaId = mangaId.split('|')[0] ?? '';
        const cacheKey = `chapters-${realMangaId}`;
        const now = Date.now();
        const cached = this.cache.get(cacheKey);

        if (cached && now - cached.timestamp < this.MANGA_DETAIL_CACHE_TTL) {
            return cached.data;
        }

        const $ = await this.fetchMangaPageCached(realMangaId);
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
            const $ = await this.DOMHTML(`${baseUrl}/${chapterId}`);
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
        const cleanBaseUrl = baseUrl.replace(/\/$/, '');

        const keyword = query.title?.trim() ?? '';
        let firstTagId = '';

        if (query.includedTags && query.includedTags.length > 0) {
            for (const tag of query.includedTags) {
                if (tag.id && tag.id !== 'all') {
                    // Lấy nguyên giá trị id (ví dụ: category/cosplay hoặc tag/xiuren)
                    firstTagId = tag.id.replace(/^\/|\/$/g, '');
                    break;
                }
            }
        }

        let targetUrl = '';

        if (firstTagId && keyword) {
            const basePath = `${cleanBaseUrl}/${firstTagId}`;
            const pagePath = page > 1 ? `/page/${page}` : '';
            targetUrl = `${basePath}${pagePath}/?s=${encodeURIComponent(keyword)}`;
        } else if (firstTagId) {
            const basePath = `${cleanBaseUrl}/${firstTagId}`;
            const pagePath = page > 1 ? `/page/${page}/` : '/';
            targetUrl = `${basePath}${pagePath}`;
        } else if (keyword) {
            const pagePath = page > 1 ? `/page/${page}` : '';
            targetUrl = `${cleanBaseUrl}${pagePath}/?s=${encodeURIComponent(keyword)}`;
        } else {
            targetUrl = page > 1 ? `${cleanBaseUrl}/page/${page}/` : `${cleanBaseUrl}/`;
        }

        const cacheKey = `search-${targetUrl}`;
        const now = Date.now();
        const cached = this.cache.get(cacheKey);

        let $: CheerioAPI;
        if (cached && now - cached.timestamp < this.CACHE_TTL) {
            $ = cached.data;
        } else {
            $ = await this.DOMHTML(targetUrl);
            this.cache.set(cacheKey, { data: $, timestamp: now });
        }

        const manga = this.parser.parseSearchResults($);
        const isLast = this.parser.isLastPage($);

        return App.createPagedResults({
            results: manga,
            metadata: !isLast ? { page: page + 1 } : undefined,
        });
    }

    async getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults> {
        const page: number = metadata?.page ?? 1;
        const baseUrl = await this.getBaseUrl();

        const sectionConfig: Record<string, { getUrl: (p: number) => string; parse: ($: CheerioAPI) => PartialSourceManga[] }> = {
            new_updated: {
                getUrl: (p) => (p === 1 ? baseUrl : `${baseUrl.replace(/\/$/, '')}/page/${p}/`),
                parse: ($) => this.parser.parseSearchResults($),
            },
            top_3: {
                getUrl: (p) => (p === 1 ? `${baseUrl.replace(/\/$/, '')}/most-popular-weekly/` : `${baseUrl.replace(/\/$/, '')}/most-popular-weekly/page/${p}/`),
                parse: ($) => this.parser.parseSearchResults($),
            },
            top_7: {
                getUrl: (p) => (p === 1 ? `${baseUrl.replace(/\/$/, '')}/most-popular-monthly/` : `${baseUrl.replace(/\/$/, '')}/most-popular-monthly/page/${p}/`),
                parse: ($) => this.parser.parseSearchResults($),
            },
            top_30: {
                getUrl: (p) => (p === 1 ? `${baseUrl.replace(/\/$/, '')}/most-popular-yearly/` : `${baseUrl.replace(/\/$/, '')}/most-popular-yearly/page/${p}/`),
                parse: ($) => this.parser.parseSearchResults($),
            },
        };

        const config = sectionConfig[homepageSectionId];

        if (!config) {
            throw new Error(`Section ID "${homepageSectionId}" does not support "View More" or is invalid.`);
        }

        const requestUrl = config.getUrl(page);
        const cacheKey = `view-more-${requestUrl}`;
        const now = Date.now();
        const cached = this.cache.get(cacheKey);

        let $: CheerioAPI;
        if (cached && now - cached.timestamp < this.CACHE_TTL) {
            $ = cached.data;
        } else {
            $ = await this.DOMHTML(requestUrl);
            this.cache.set(cacheKey, { data: $, timestamp: now });
        }

        const manga = config.parse($);

        if (!manga || manga.length === 0) {
            return App.createPagedResults({
                results: [],
                metadata: undefined,
            });
        }

        const nextPageNum = page + 1;
        const hasNextLink = $('.pagination a.page').filter((_, el) => $(el).attr('title') === String(nextPageNum)).length > 0;
        const hasNextPageBtn = $('#tie-next-page a').length > 0;
        const hasExtend = $('.pagination .extend').length > 0;

        const isLast = this.parser.isLastPage($);

        return App.createPagedResults({
            results: manga,
            metadata: !isLast ? { page: nextPageNum } : undefined,
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
