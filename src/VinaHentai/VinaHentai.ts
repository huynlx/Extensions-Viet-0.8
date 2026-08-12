import {
    BadgeColor,
    Chapter,
    ChapterDetails,
    ChapterProviding,
    ContentRating,
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
import { VinaHentaiParser } from './VinaHentaiParser';

const DEFAULT_DOMAIN = 'https://vinahentai.blog';

export const VinaHentaiInfo: SourceInfo = {
    version: '1.0.0',
    name: 'VinaHentai',
    icon: 'icon.png',
    author: 'Paperback',
    authorWebsite: 'https://github.com',
    description: 'Extension đọc truyện từ VinaHentai.',
    contentRating: ContentRating.ADULT,
    websiteBaseURL: DEFAULT_DOMAIN,
    sourceTags: [
        {
            text: 'Vietnamese',
            type: BadgeColor.GREEN,
        },
    ],
    intents: SourceIntents.MANGA_CHAPTERS | SourceIntents.HOMEPAGE_SECTIONS,
};

interface CacheItem<T> {
    data: T;
    timestamp: number;
}

export class VinaHentai implements SearchResultsProviding, MangaProviding, ChapterProviding, HomePageSectionsProviding {
    stateManager = App.createSourceStateManager();
    parser = new VinaHentaiParser();

    private cache = new Map<string, CacheItem<any>>();
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 phút mặc định
    private readonly TAGS_CACHE_TTL = 24 * 60 * 60 * 1000; // 1 ngày cho tags
    private readonly MANGA_DETAIL_CACHE_TTL = 24 * 60 * 60 * 1000; // 1 ngày cho manga details
    private readonly CHAPTER_DETAIL_CACHE_TTL = 24 * 60 * 60 * 1000; // 1 ngày cho chapter details

    constructor(private cheerio: CheerioAPI) {}

    private async getBaseUrl(): Promise<string> {
        return DEFAULT_DOMAIN.replace(/\/+$/, '');
    }

    readonly requestManager = App.createRequestManager({
        requestsPerSecond: 4,
        requestTimeout: 20000,
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

        const res = await this.requestManager.schedule(req, 1);
        const html = (res.data as string) ?? '';
        const $ = this.cheerio.load(html);

        this.cache.set(cacheKey, { data: $, timestamp: now });
        return $;
    }

    async getMangaShareUrl(mangaId: string): Promise<string> {
        const baseUrl = await this.getBaseUrl();
        return `${baseUrl}/truyen-hentai/${mangaId}`;
    }

    // ============================ DETAILS & CHAPTERS ============================

    private async fetchMangaPage(mangaId: string): Promise<CheerioAPI> {
        const cacheKey = `manga-page-${mangaId}`;
        const now = Date.now();
        const cached = this.cache.get(cacheKey);

        if (cached && now - cached.timestamp < this.MANGA_DETAIL_CACHE_TTL) {
            return cached.data;
        }

        const baseUrl = await this.getBaseUrl();
        const $ = await this.DOMHTML(`${baseUrl}/truyen-hentai/${mangaId}`);

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
            const url = chapterId.startsWith('http') ? chapterId : `${baseUrl}${chapterId}`;

            const req = App.createRequest({
                url,
                method: 'GET',
            });

            const response = await this.requestManager.schedule(req, 1);
            const html = (response.data as string) ?? '';

            pages = this.parser.parseChapterDetails(html);
            this.cache.set(cacheKey, { data: pages, timestamp: now });
        }

        return App.createChapterDetails({
            id: chapterId,
            mangaId: mangaId,
            pages: pages,
        });
    }

    // ============================ SEARCH & TAGS ============================

    async getSearchTags(): Promise<TagSection[]> {
        const cacheKey = 'search-tags';
        const now = Date.now();
        const cached = this.cache.get(cacheKey);

        if (cached && now - cached.timestamp < this.TAGS_CACHE_TTL) {
            return cached.data;
        }

        const baseUrl = await this.getBaseUrl();
        const $ = await this.DOMHTML(`${baseUrl}/danh-sach`);
        const tags = this.parser.parseGenres($);

        this.cache.set(cacheKey, { data: tags, timestamp: now });
        return tags;
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
        let isSearch = false;

        if (keyword) {
            isSearch = true;
            fullUrl = `${baseUrl}/search?page=${page}&q=${encodeURIComponent(keyword)}`;
        } else if (genre) {
            fullUrl = `${baseUrl}/genres/${genre}?page=${page}`;
        } else {
            fullUrl = `${baseUrl}/danh-sach?page=${page}`;
        }

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

        const tiles = isSearch ? this.parser.parseSearchManga($) : this.parser.parseMangaList($);
        const hasNextPage = this.parser.parseHasNextPage($, tiles.length, fullUrl, isSearch);

        return App.createPagedResults({
            results: tiles,
            metadata: hasNextPage ? { page: page + 1 } : undefined,
        });
    }

    // ============================ HOMEPAGE SECTIONS ============================

    async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
        const baseUrl = await this.getBaseUrl();

        const sections = [
            App.createHomeSection({
                id: 'popular',
                title: 'Truyện Phổ Biến',
                containsMoreItems: true,
                type: HomeSectionType.singleRowNormal,
            }),
            App.createHomeSection({
                id: 'latest',
                title: 'Mới Cập Nhật',
                containsMoreItems: true,
                type: HomeSectionType.singleRowNormal,
            }),
        ];

        for (const section of sections) {
            sectionCallback(section);
        }

        // Fetch Popular and Latest concurrently to load much faster
        const [popularResult, latestResult] = await Promise.allSettled([
            this.DOMHTML(`${baseUrl}/danh-sach/?page=1&sort=views`),
            this.DOMHTML(`${baseUrl}/danh-sach/?page=1&sort=updatedAt`),
        ]);

        if (popularResult.status === 'fulfilled') {
            sections[0]!.items = this.parser.parseMangaList(popularResult.value);
            sectionCallback(sections[0]!);
        }

        if (latestResult.status === 'fulfilled') {
            sections[1]!.items = this.parser.parseMangaList(latestResult.value);
            sectionCallback(sections[1]!);
        }
    }

    async getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults> {
        const baseUrl = await this.getBaseUrl();
        const page: number = metadata?.page ?? 1;
        const sort = homepageSectionId === 'popular' ? 'views' : 'updatedAt';

        const url = `${baseUrl}/danh-sach/?page=${page}&sort=${sort}`;
        const cacheKey = `view-more-${url}`;
        const now = Date.now();
        const cached = this.cache.get(cacheKey);

        let $: CheerioAPI;
        if (cached && now - cached.timestamp < this.CACHE_TTL) {
            $ = cached.data;
        } else {
            $ = await this.DOMHTML(url);
            this.cache.set(cacheKey, { data: $, timestamp: now });
        }

        const mangas = this.parser.parseMangaList($);
        const hasNextPage = mangas.length >= 24;

        return App.createPagedResults({
            results: mangas,
            metadata: hasNextPage ? { page: page + 1 } : undefined,
        });
    }
}
