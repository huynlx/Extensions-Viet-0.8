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
import { isLastPage, Parser } from './BuonDuaParser';
import { domainSettings, getDomain, resetSettings } from './BuonDuaSetting';

const DOMAIN = 'https://buondua.com';

export const BuonDuaInfo: SourceInfo = {
    version: '1.0.0',
    name: 'Buon Dua',
    icon: 'icon.png',
    author: 'Lê Đại Thiện Nhân',
    authorWebsite: 'https://github.com/huynlx/',
    description: 'Extension that pulls manga from BuonDua.',
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

export class BuonDua implements SearchResultsProviding, MangaProviding, ChapterProviding, HomePageSectionsProviding {
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

    private async DOMHTML(url: string): Promise<CheerioAPI> {
        const cacheKey = `dom-${url}`;
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
        const newUpdatedSection = App.createHomeSection({
            id: 'new_updated',
            title: 'Mới Nhất',
            containsMoreItems: true,
            type: HomeSectionType.singleRowNormal,
        });

        const hotSection = App.createHomeSection({
            id: 'hot',
            title: 'Nổi Bật',
            containsMoreItems: true,
            type: HomeSectionType.singleRowNormal,
        });

        const mayLikeSection = App.createHomeSection({
            id: 'may-like',
            title: 'Bạn Có Thể Thích',
            containsMoreItems: false,
            type: HomeSectionType.singleRowLarge,
        });

        // 2. Callback khung rỗng ngay lập tức
        sectionCallback(newUpdatedSection);
        sectionCallback(hotSection);
        sectionCallback(mayLikeSection);

        // 3. Xử lý bất đồng bộ độc lập

        // Nguồn 1: Trang chủ (dùng chung cho Mới Nhất & Bạn Có Thể Thích)
        const fetchHome = this.DOMHTML(baseUrl).then(($home) => {
            newUpdatedSection.items = this.parser.parseNewUpdatedSection($home);
            sectionCallback(newUpdatedSection);

            mayLikeSection.items = this.parser.parseMayLikeSection($home);
            sectionCallback(mayLikeSection);
        });

        // Nguồn 2: Truyện xem nhiều nhất
        const fetchHot = this.DOMHTML(`${baseUrl}/hot`).then(($hot) => {
            hotSection.items = this.parser.parseHotSection($hot);
            sectionCallback(hotSection);
        });

        // Đợi tất cả hoàn thành để kết thúc hàm
        await Promise.allSettled([fetchHome, fetchHot]);
    }

    async getSearchTags(): Promise<TagSection[]> {
        const cacheKey = 'search-tags';
        const now = Date.now();
        const cached = this.cache.get(cacheKey);

        if (cached && now - cached.timestamp < this.TAGS_CACHE_TTL) {
            return cached.data;
        }

        const baseUrl = await this.getBaseUrl();
        const $ = await this.DOMHTML(`${baseUrl}/collection`);
        const tags = this.parser.parseTags($);

        this.cache.set(cacheKey, { data: tags, timestamp: now });
        return tags;
    }

    private async fetchMangaPage(realMangaId: string): Promise<CheerioAPI> {
        const cacheKey = `manga-detail-${realMangaId}`;
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
        const $ = await this.fetchMangaPage(realMangaId);
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

        const $ = await this.fetchMangaPage(realMangaId);
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

        let basePath = '';
        const params: string[] = [];

        const startOffset = (page - 1) * 20;

        if (query.title?.trim()) {
            basePath = '/';
            params.push(`search=${encodeURIComponent(query.title.trim())}`);
        } else if (query.includedTags && query.includedTags.length > 0) {
            for (const tag of query.includedTags) {
                const tagId = tag.id;

                if (!tagId || tagId === 'all') {
                    continue;
                }

                if (tagId.includes('=')) {
                    params.push(tagId);
                } else {
                    basePath = `/tag/${tagId}`;
                }
            }
        }

        if (!basePath) {
            basePath = '/';
        }

        if (page > 1) {
            params.push(`start=${startOffset}`);
        }

        const queryString = params.length > 0 ? `?${params.join('&')}` : '';
        const url = `${baseUrl}${basePath}${queryString}`.replace(/\/\?/g, '/?');

        const cacheKey = `search-${url}`;
        const now = Date.now();
        const cached = this.cache.get(cacheKey);

        let $: CheerioAPI;
        if (cached && now - cached.timestamp < this.CACHE_TTL) {
            $ = cached.data;
        } else {
            $ = await this.DOMHTML(url);
            this.cache.set(cacheKey, { data: $, timestamp: now });
        }

        const manga = this.parser.parseSearchResults($);
        const lastPage = isLastPage($);

        return App.createPagedResults({
            results: manga,
            metadata: lastPage ? undefined : { page: page + 1 },
        });
    }

    async getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults> {
        const page: number = metadata?.page ?? 1;
        const baseUrl = await this.getBaseUrl();

        const sectionConfig: Record<string, { getUrl: (p: number) => string; parse: ($: CheerioAPI) => PartialSourceManga[] }> = {
            new_updated: {
                getUrl: (p) => (p === 1 ? baseUrl : `${baseUrl}/?start=${(p - 1) * 20}`),
                parse: ($) => this.parser.parseNewUpdatedSection($),
            },
            hot: {
                getUrl: (p) => (p === 1 ? `${baseUrl}/hot` : `${baseUrl}/hot?start=${(p - 1) * 20}`),
                parse: ($) => this.parser.parseHotSection($),
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

        const lastPage = isLastPage($);

        return App.createPagedResults({
            results: manga,
            metadata: lastPage ? undefined : { page: page + 1 },
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
