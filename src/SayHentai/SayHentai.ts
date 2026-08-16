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
import { Parser } from './SayHentaiParser';
import { domainSettings, getDomain, resetSettings } from './SayHentaiSetting';
import { decodeHTML } from 'entities';

const DOMAIN = 'https://sayhentai.cx';

export const SayHentaiInfo: SourceInfo = {
    version: '1.0.2',
    name: 'SayHentai',
    icon: 'icon.png',
    author: 'Lê Đại Thiện Nhân',
    authorWebsite: 'https://github.com/huynlx/',
    description: 'Extension that pulls manga from SayHentai.',
    contentRating: ContentRating.EVERYONE,
    websiteBaseURL: DOMAIN,
    sourceTags: [
        {
            text: 'Hentai',
            type: BadgeColor.RED,
        },
        {
            text: 'Vietnamese',
            type: BadgeColor.GREEN,
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

export class SayHentai implements SearchResultsProviding, MangaProviding, ChapterProviding, HomePageSectionsProviding {
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

    async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
        const baseUrl = await this.getBaseUrl();

        // 1. Khởi tạo các Section
        const featuredSection = App.createHomeSection({
            id: 'featured',
            title: 'Truyện Đề Cử',
            containsMoreItems: false,
            type: HomeSectionType.featured,
        });

        const newUpdatedSection = App.createHomeSection({
            id: 'new_updated',
            title: 'Mới Cập Nhật',
            containsMoreItems: true,
            type: HomeSectionType.singleRowNormal,
        });

        const hotSection = App.createHomeSection({
            id: 'hot',
            title: 'Top Ngày',
            containsMoreItems: false,
            type: HomeSectionType.singleRowNormal,
        });

        const doneSection = App.createHomeSection({
            id: 'done',
            title: 'Truyện Full',
            containsMoreItems: true,
            type: HomeSectionType.singleRowNormal,
        });

        const popularSection = App.createHomeSection({
            id: 'popular',
            title: 'Top Tháng',
            containsMoreItems: false,
            type: HomeSectionType.singleRowLarge,
        });

        // 2. Callback khung rỗng ngay lập tức
        sectionCallback(featuredSection);
        sectionCallback(hotSection);
        sectionCallback(newUpdatedSection);
        sectionCallback(popularSection);
        sectionCallback(doneSection);

        // 3. Xử lý bất đồng bộ độc lập

        // Nguồn 1: Trang chủ (dùng chung cho Featured, Popular và NewUpdated)
        const fetchHome = this.DOMHTML(baseUrl).then(($home) => {
            featuredSection.items = this.parser.parseFeaturedSection($home);
            sectionCallback(featuredSection);

            popularSection.items = this.parser.parsePopularSection($home);
            sectionCallback(popularSection);

            newUpdatedSection.items = this.parser.parseNewUpdatedSection($home);
            sectionCallback(newUpdatedSection);

            hotSection.items = this.parser.parseHotSection($home);
            sectionCallback(hotSection);
        });

        // Nguồn 2: Truyện full
        const fetchDone = this.DOMHTML(`${baseUrl}/completed`).then(($done) => {
            doneSection.items = this.parser.parseSearchResults($done);
            sectionCallback(doneSection);
        });

        // Đợi tất cả hoàn thành để kết thúc hàm
        await Promise.allSettled([fetchHome, fetchDone]);
    }

    async getSearchTags(): Promise<TagSection[]> {
        const cacheKey = 'search-tags';
        const now = Date.now();
        const cached = this.cache.get(cacheKey);

        if (cached && now - cached.timestamp < this.TAGS_CACHE_TTL) {
            return cached.data;
        }

        const baseUrl = await this.getBaseUrl();
        const $ = await this.DOMHTML(`${baseUrl}/genre`);
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
        const $ = await this.DOMHTML(`${baseUrl}/${mangaId}`);

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

        const $ = await this.fetchMangaPageCached(mangaId);
        const lastLink = $('#init-links a').last().attr('href');
        const $lastChapter = lastLink ? await this.DOMHTML(lastLink) : null;

        let chapters;

        if ($lastChapter) {
            const translator = $('.post-content_item:has(.summary-heading:contains("Nhóm dịch")) .summary-content a').text().trim();
            chapters = this.parser.parseChapterListFromSelect($lastChapter, {
                group: decodeHTML(translator),
            });
        } else {
            chapters = this.parser.parseChapterList($);
        }

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

            // Đảm bảo URL ghép chính xác: https://sayhentai.cx/truyen-dan-ong-tren-doi-di-dau-het-roi/chuong-9
            const cleanChapterId = chapterId.startsWith('/') ? chapterId.substring(1) : chapterId;
            const $ = await this.DOMHTML(`${baseUrl}/${cleanChapterId}`);

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

        // 1. Xử lý Thể loại & Sắp xếp từ includedTags
        if (query.includedTags && query.includedTags.length > 0) {
            for (const tag of query.includedTags) {
                const tagId = tag.id;

                if (!tagId || tagId === 'all') {
                    continue;
                }

                if (tagId.includes('=')) {
                    // Tham số query (VD: sort=latest)
                    params.push(tagId);
                } else {
                    // Slug thể loại (VD: nguc-lon -> /genre/nguc-lon)
                    basePath = `/genre/${tagId}`;
                }
            }
        }

        // 2. Xử lý Từ khóa tìm kiếm (Ưu tiên đè basePath thành /search)
        if (query.title?.trim()) {
            basePath = '/search';
            params.push(`s=${encodeURIComponent(query.title.trim())}`);
        }

        // 3. Nếu KHÔNG có thể loại lẫn tìm kiếm (mặc định về trang danh sách)
        if (!basePath) {
            basePath = '/danh-sach';
        }

        // 4. Phân trang
        if (page > 1) {
            params.push(`page=${page}`);
        }

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

        // Bạn có thể tùy chỉnh lại điều kiện checking hasNextPage từ DOM nếu cần
        const hasNextPage = manga.length > 0;

        return App.createPagedResults({
            results: manga,
            metadata: hasNextPage ? { page: page + 1 } : undefined,
        });
    }

    async getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults> {
        const page: number = metadata?.page ?? 1;
        const baseUrl = await this.getBaseUrl();

        const sectionConfig: Record<string, { url: string; parse: ($: CheerioAPI) => any[] }> = {
            new_updated: {
                url: `${baseUrl}/?page=${page}`,
                parse: ($) => this.parser.parseNewUpdatedSection($),
            },
            done: {
                url: `${baseUrl}/completed?page=${page}`,
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

        // Kiểm tra trang tiếp theo bằng nút active trong pagination
        const hasNextPage = true;

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
