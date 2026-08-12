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
import { Parser } from './HentaiCubeParser';
import { domainSettings, getDomain, resetSettings } from './HentaiCubeSetting';

const DOMAIN = 'https://hentaicube.xyz';

export const HentaiCubeInfo: SourceInfo = {
    version: '1.0.0',
    name: 'HentaiCube',
    icon: 'icon.png',
    author: 'Lê Đại Thiện Nhân',
    authorWebsite: 'https://github.com/huynlx/',
    description: 'Extension that pulls manga from HentaiCube.',
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

export class HentaiCube implements SearchResultsProviding, MangaProviding, ChapterProviding, HomePageSectionsProviding {
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

    async getMangaShareUrl(mangaId: string): Promise<string> {
        const baseUrl = await this.getBaseUrl();
        return `${baseUrl}/read/${mangaId}`;
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

    async getSearchTags(): Promise<TagSection[]> {
        const cacheKey = 'search-tags';
        const now = Date.now();
        const cached = this.cache.get(cacheKey);

        if (cached && now - cached.timestamp < this.TAGS_CACHE_TTL) {
            return cached.data;
        }

        const baseUrl = await this.getBaseUrl();
        const $ = await this.DOMHTML(`${baseUrl}/the-loai-genres/`);
        const tags = this.parser.parseTags($);

        this.cache.set(cacheKey, { data: tags, timestamp: now });
        return tags;
    }

    async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
        const baseUrl = await this.getBaseUrl();

        // 1. Khởi tạo các Section tường minh
        const featuredSection = App.createHomeSection({ id: 'featured', title: 'Đề Cử', type: HomeSectionType.featured, containsMoreItems: false });
        const hotSection = App.createHomeSection({ id: 'hot', title: 'Trending', type: HomeSectionType.singleRowNormal, containsMoreItems: true });
        const newUpdatedSection = App.createHomeSection({ id: 'new_updated', title: 'Vừa Cập Nhật', type: HomeSectionType.singleRowNormal, containsMoreItems: true });
        const viewSection = App.createHomeSection({ id: 'view', title: 'Đọc Nhiều Nhất', type: HomeSectionType.singleRowNormal, containsMoreItems: true });
        const newSection = App.createHomeSection({ id: 'new', title: 'Mới', type: HomeSectionType.singleRowNormal, containsMoreItems: true });
        const randomSection = App.createHomeSection({ id: 'random', title: 'Ngẫu Nhiên', type: HomeSectionType.singleRowLarge, containsMoreItems: false });
        const doneSection = App.createHomeSection({ id: 'done', title: 'Hoàn Thành', type: HomeSectionType.singleRowNormal, containsMoreItems: true });

        const sections = [featuredSection, hotSection, newUpdatedSection, viewSection, newSection, randomSection, doneSection];

        // 2. Callback khung rỗng ngay lập tức
        sections.forEach(sectionCallback);

        // 3. Xử lý bất đồng bộ độc lập

        // Nguồn 1: Trang chủ (chứa Featured, Random & Hot/Trending)
        const fetchHome = this.DOMHTML(baseUrl).then(($home) => {
            featuredSection.items = this.parser.parseFeaturedSection($home);
            sectionCallback(featuredSection);

            randomSection.items = this.parser.parseRandomSection($home);
            sectionCallback(randomSection);

            hotSection.items = this.parser.parseHotSection($home);
            sectionCallback(hotSection);
        });

        const fetchNewUpdated = this.DOMHTML(`${baseUrl}/read`).then(($newUpdated) => {
            newUpdatedSection.items = this.parser.parseNewUpdatedSection($newUpdated);
            sectionCallback(newUpdatedSection);
        });

        const fetchView = this.DOMHTML(`${baseUrl}/read/page/1/?m_orderby=views`).then(($view) => {
            viewSection.items = this.parser.parseSearchResults($view);
            sectionCallback(viewSection);
        });

        const fetchNew = this.DOMHTML(`${baseUrl}/read/page/1/?m_orderby=new-manga`).then(($new) => {
            newSection.items = this.parser.parseSearchResults($new);
            sectionCallback(newSection);
        });

        const fetchDone = this.DOMHTML(`${baseUrl}/?s=&post_type=wp-manga&genre[]=series&op=1&author=&status[]=end`).then(($done) => {
            doneSection.items = this.parser.parseLoopResults($done);
            sectionCallback(doneSection);
        });

        await Promise.allSettled([fetchHome, fetchNewUpdated, fetchView, fetchNew, fetchDone]);
    }

    async getMangaDetails(mangaId: string): Promise<SourceManga> {
        const cacheKey = `manga-detail-${mangaId}`;
        const now = Date.now();
        const cached = this.cache.get(cacheKey);

        if (cached && now - cached.timestamp < this.MANGA_DETAIL_CACHE_TTL) {
            return cached.data;
        }

        const baseUrl = await this.getBaseUrl();
        const $ = await this.DOMHTML(`${baseUrl}/read/${mangaId}`);
        const mangaDetails = this.parser.parseMangaDetails($, mangaId);

        this.cache.set(cacheKey, { data: mangaDetails, timestamp: now });
        return mangaDetails;
    }

    async getChapters(mangaId: string): Promise<Chapter[]> {
        const cacheKey = `chapters-${mangaId}`;
        const now = Date.now();
        const cached = this.cache.get(cacheKey);

        if (cached && now - cached.timestamp < this.MANGA_DETAIL_CACHE_TTL) {
            return cached.data;
        }

        const baseUrl = await this.getBaseUrl();
        const allElements: any[] = [];
        let currentPage = 1;

        // Bước 1: Gom toàn bộ phần tử <li> chapter từ tất cả các trang AJAX về một chỗ
        while (true) {
            const requestUrl = `${baseUrl}/read/${mangaId}/ajax/chapters/?t=${currentPage}`;

            const request = App.createRequest({
                url: requestUrl,
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    Referer: `${baseUrl}/read/${mangaId}/`,
                    Accept: '*/*',
                },
            });

            const response = await this.requestManager.schedule(request, 1);
            const $ = this.cheerio.load(response.data as string);

            const chapterElements = $('.listing-chapters_wrap ul.main li.wp-manga-chapter').toArray();
            if (chapterElements.length === 0) break;

            allElements.push(...chapterElements);

            // Kiểm tra xem có trang tiếp theo không
            const $nextPage = $('.pagination .page a').filter((_, el) => {
                const pageNum = parseInt($(el).attr('data-page') || '', 10);
                return pageNum === currentPage + 1;
            });

            if ($nextPage.length > 0) {
                currentPage++;
                if (currentPage > 50) break;
            } else {
                break;
            }
        }

        // Bước 2: Truyền toàn bộ danh sách phần tử đã gom được vào parser để xử lý một thể
        const chapters = this.parser.parseChapterListFromArray(allElements, this.cheerio);
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
            const chapterUrl = `${baseUrl}/read/${chapterId}/`;

            const request = App.createRequest({
                url: chapterUrl,
                method: 'GET',
                headers: { Referer: baseUrl },
            });

            const response = await this.requestManager.schedule(request, 1);
            const $ = this.cheerio.load(response.data as string);

            const $reader = $('.masr2-reader, #manga-secure-reader');
            let currentToken = $reader.attr('data-masr2-token') || $reader.attr('data-token') || '';

            if (!currentToken) {
                throw new Error(`Không tìm thấy token cho chapter: ${chapterId}`);
            }

            const cid = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
            pages = [];

            while (currentToken) {
                const apiUrl = `${baseUrl}/wp-json/manga-reader/v2/pages?token=${encodeURIComponent(currentToken)}&cid=${encodeURIComponent(cid)}`;

                const apiRequest = App.createRequest({
                    url: apiUrl,
                    method: 'GET',
                    headers: { Accept: 'application/json', Referer: chapterUrl },
                });

                const apiResponse = await this.requestManager.schedule(apiRequest, 1);
                const data = typeof apiResponse.data === 'string' ? JSON.parse(apiResponse.data) : apiResponse.data;

                if (Array.isArray(data?.items)) {
                    pages.push(...data.items);
                }

                if (data?.done || !data?.next_token) {
                    break;
                }
                currentToken = data.next_token;
            }

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

        const params: string[] = [];
        let hasKeyword = false;
        let basePath = '';

        // 1. Xử lý Từ khóa tìm kiếm
        if (query.title?.trim()) {
            hasKeyword = true;
            params.push(`s=${encodeURIComponent(query.title.trim())}`);
            params.push('post_type=wp-manga');
        }

        // 2. Xử lý Thể loại
        if (query.includedTags && query.includedTags.length > 0) {
            for (const tag of query.includedTags) {
                const tagId = tag.id;
                if (!tagId || tagId === 'all') continue;

                if (tagId.includes('=')) {
                    params.push(tagId);
                } else if (hasKeyword) {
                    params.push(`genre[]=${tagId}`);
                } else {
                    basePath = `/theloai/${tagId}`;
                }
            }
        }

        if (hasKeyword) {
            params.push('author=');
        }

        // 3. Xây dựng URL chuẩn duy nhất
        const pagePart = page > 1 ? `/page/${page}` : '';
        const queryString = params.length > 0 ? `?${params.join('&')}` : '';
        const url = hasKeyword ? `${baseUrl}${pagePart}${queryString}` : `${baseUrl}${basePath}${pagePart}${queryString}`;

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

        const manga = hasKeyword ? this.parser.parseLoopResults($) : this.parser.parseSearchResults($);

        return App.createPagedResults({
            results: manga,
            metadata: { page: page + 1 },
        });
    }

    async getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults> {
        const page: number = metadata?.page ?? 1;
        const baseUrl = await this.getBaseUrl();

        const sectionConfig: Record<string, { url: string; parse: ($: CheerioAPI) => any[] }> = {
            new_updated: {
                url: `${baseUrl}/read/page/${page}`,
                parse: ($) => this.parser.parseSearchResults($),
            },
            hot: {
                url: `${baseUrl}/read/page/${page}/?m_orderby=trending`,
                parse: ($) => this.parser.parseSearchResults($),
            },
            view: {
                url: `${baseUrl}/read/page/${page}/?m_orderby=views`,
                parse: ($) => this.parser.parseSearchResults($),
            },
            new: {
                url: `${baseUrl}/read/page/${page}/?m_orderby=new-manga`,
                parse: ($) => this.parser.parseSearchResults($),
            },
            done: {
                url: `${baseUrl}/page/${page}/?s=&post_type=wp-manga&genre[]=series&op=1&author=&status[]=end`,
                parse: ($) => this.parser.parseLoopResults($),
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

        return App.createPagedResults({
            results: manga,
            metadata: { page: page + 1 },
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

    async getSourceMenu(): Promise<DUISection> {
        return App.createDUISection({
            id: 'main',
            header: 'Cài đặt Nguồn Truyện',
            rows: async () => [domainSettings(this.stateManager), resetSettings(this.stateManager)],
            isHidden: false,
        });
    }
}
