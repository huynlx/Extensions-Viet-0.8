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
import { Parser } from './MauLonParser';
import { domainSettings, getDomain, resetSettings } from './MauLonSetting';

const DOMAIN = 'https://maulon.vip';

export const MauLonInfo: SourceInfo = {
    version: '1.0.0',
    name: 'MauLon',
    icon: 'icon.png',
    author: 'Lê Đại Thiện Nhân',
    authorWebsite: 'https://github.com/huynlx/',
    description: 'Xem ảnh sex sẽ mau lớn! ^^',
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

export class MauLon implements SearchResultsProviding, MangaProviding, ChapterProviding, HomePageSectionsProviding {
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
        const $ = await this.DOMHTML(`${baseUrl}/tags`);
        const tags = this.parser.parseTags($);

        this.cache.set(cacheKey, { data: tags, timestamp: now });
        return tags;
    }

    async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
        const baseUrl = await this.getBaseUrl();
        const cleanBaseUrl = baseUrl.replace(/\/$/, '');

        // 1. Khởi tạo tất cả các Home Section
        const newUpdatedSection = App.createHomeSection({
            id: 'new_updated',
            title: 'Trang Chủ',
            containsMoreItems: true,
            type: HomeSectionType.singleRowNormal,
        });

        const randomSection = App.createHomeSection({
            id: 'random_section',
            title: 'Ngẫu Nhiên',
            containsMoreItems: true,
            type: HomeSectionType.singleRowNormal,
        });

        // 2. Callback gửi các khung rỗng lên UI ngay lập tức
        const sections = [newUpdatedSection, randomSection];

        for (const section of sections) {
            sectionCallback(section);
        }

        // 3. Xử lý bất đồng bộ các luồng request độc lập

        // Nguồn 1: Mới cập nhật (lấy từ Trang chủ)
        const fetchHome = this.DOMHTML(cleanBaseUrl).then(($home) => {
            newUpdatedSection.items = this.parser.parseNewUpdatedSection($home);
            sectionCallback(newUpdatedSection);
        });

        // Nguồn 2: Random Section (Lấy ngẫu nhiên từ trang 2 hoặc 3 của trang chủ và shuffle)
        const randomUrl = `${cleanBaseUrl}/?orderby=rand`;
        const fetchRandom = this.DOMHTML(randomUrl).then(($randomPage) => {
            randomSection.items = this.parser.parseNewUpdatedSection($randomPage);
            sectionCallback(randomSection);
        });

        // Đợi tất cả hoàn thành để kết thúc hàm
        await Promise.allSettled([fetchHome, fetchRandom]);
    }

    private async fetchMangaPage(realMangaId: string): Promise<CheerioAPI> {
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
        const chapters = this.parser.parseChapterList($, realMangaId);

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
            pages = [];

            const $footer = $('footer.entry-footer, .entry-footer').first();
            const footerIndex = $footer.length > 0 ? $('*').index($footer) : Infinity;

            $('.entry-content img').each((_, element) => {
                const $img = $(element);
                const imgIndex = $('*').index($img);
                if (imgIndex >= footerIndex) return;

                if ($img.closest('.crp_related, .post-topad, .banner-ci2, .widget_text').length > 0) return;

                const $parentLink = $img.closest('a');
                let src = $parentLink.attr('href') || $img.attr('src') || $img.attr('data-src') || '';

                if (!src || !src.match(/\.(jpg|jpeg|png|webp|gif)/i)) return;

                if (src.startsWith('//')) {
                    src = `https:${src}`;
                }

                if (src && !pages.includes(src)) {
                    pages.push(src);
                }
            });

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
                    firstTagId = tag.id.replace(/^\/|\/$/g, '');
                    break;
                }
            }
        }

        let targetUrl = '';

        if (firstTagId && keyword) {
            const basePath = `${cleanBaseUrl}/${firstTagId}`;
            const pagePath = page > 1 ? `/page/${page}` : '';
            targetUrl = `${basePath}${pagePath}?s=${encodeURIComponent(keyword)}`;
        } else if (firstTagId) {
            const basePath = `${cleanBaseUrl}/${firstTagId}`;
            const pagePath = page > 1 ? `/page/${page}/` : '/';
            targetUrl = `${basePath}${pagePath}`;
        } else if (keyword) {
            const pagePath = page > 1 ? `/page/${page}` : '';
            targetUrl = `${cleanBaseUrl}${pagePath}?s=${encodeURIComponent(keyword)}`;
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

        const nextPageNum = page + 1;
        const hasNextBtn = $('.wp-pagenavi a.nextpostslink').length > 0;
        const hasNextPageLink =
            $('.wp-pagenavi a.page, .wp-pagenavi a.larger').filter((_, el) => {
                const title = $(el).attr('title') || '';
                return title.toLowerCase() === `page ${nextPageNum}`;
            }).length > 0;

        const hasNextPage = hasNextBtn || hasNextPageLink;

        return App.createPagedResults({
            results: manga,
            metadata: hasNextPage ? { page: nextPageNum } : undefined,
        });
    }

    async getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults> {
        const page: number = metadata?.page ?? 1;
        const baseUrl = await this.getBaseUrl();

        const sectionConfig: Record<string, { getUrl: (p: number) => string; parse: ($: CheerioAPI) => PartialSourceManga[] }> = {
            new_updated: {
                getUrl: (p) => (p === 1 ? baseUrl : `${baseUrl.replace(/\/$/, '')}/page/${p}`),
                parse: ($) => this.parser.parseNewUpdatedSection($),
            },
            random_section: {
                getUrl: (p) => `${baseUrl.replace(/\/$/, '')}/page/${p}?orderby=rand`,
                parse: ($) => this.parser.parseNewUpdatedSection($),
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
        const hasNextBtn = $('.wp-pagenavi a.nextpostslink').length > 0;
        const hasNextPageLink =
            $('.wp-pagenavi a.page, .wp-pagenavi a.larger').filter((_, el) => {
                const title = $(el).attr('title') || '';
                return title.toLowerCase() === `page ${nextPageNum}`;
            }).length > 0;

        const hasNextPage = hasNextBtn || hasNextPageLink;

        return App.createPagedResults({
            results: manga,
            metadata: hasNextPage ? { page: nextPageNum } : undefined,
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
