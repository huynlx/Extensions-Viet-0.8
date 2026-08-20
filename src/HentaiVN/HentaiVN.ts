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
import { Parser } from './HentaiVNParser';
import { domainSettings, getDomain, resetSettings } from './HentaiVNSetting';

const DOMAIN = 'https://hentaivnreal.com';

export const HentaiVNInfo: SourceInfo = {
    version: '1.0.0',
    name: 'HentaiVN',
    icon: 'icon.png',
    author: 'Lê Đại Thiện Nhân',
    authorWebsite: 'https://github.com/huynlx/',
    description: 'Extension that pulls manga from HentaiVN.',
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

export class HentaiVN implements SearchResultsProviding, MangaProviding, ChapterProviding, HomePageSectionsProviding {
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

    async getSearchTags(): Promise<TagSection[]> {
        const cacheKey = 'search-tags';
        const now = Date.now();
        const cached = this.cache.get(cacheKey);

        if (cached && now - cached.timestamp < this.TAGS_CACHE_TTL) {
            return cached.data;
        }

        const baseUrl = await this.getBaseUrl();
        const $ = await this.DOMHTML(`${baseUrl}/the-loai`);
        const tags = this.parser.parseTags($);

        this.cache.set(cacheKey, { data: tags, timestamp: now });
        return tags;
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
            title: 'Truyện Mới Nhất',
            containsMoreItems: true,
            type: HomeSectionType.singleRowNormal,
        });

        const hotSection = App.createHomeSection({
            id: 'hot',
            title: 'Truyện Xem Nhiều Nhất',
            containsMoreItems: true,
            type: HomeSectionType.singleRowNormal,
        });

        const oldSection = App.createHomeSection({
            id: 'old',
            title: 'Truyện Cũ Nhất',
            containsMoreItems: true,
            type: HomeSectionType.singleRowNormal,
        });

        const randomSection = App.createHomeSection({
            id: 'random',
            title: 'Truyện Ngẫu Nhiên',
            containsMoreItems: false,
            type: HomeSectionType.singleRowLarge,
        });

        // 2. Callback khung rỗng ngay lập tức
        sectionCallback(featuredSection);
        sectionCallback(newUpdatedSection);
        sectionCallback(randomSection);
        sectionCallback(hotSection);
        sectionCallback(oldSection);

        // 3. Xử lý bất đồng bộ độc lập (Trả về UI ngay khi từng request hoàn thành)

        // Nguồn 1: Trang chủ (chứa Featured & Random) -> Tải trước để UI có dữ liệu hiển thị ngay
        const fetchHome = this.DOMHTML(baseUrl).then(($home) => {
            featuredSection.items = this.parser.parseFeaturedSection($home);
            sectionCallback(featuredSection);

            randomSection.items = this.parser.parseRandomSection($home);
            sectionCallback(randomSection);
        });

        // Nguồn 2: Truyện mới nhất
        const fetchNewUpdated = this.DOMHTML(`${baseUrl}/danh-sach?sort=latest`).then(($newUpdated) => {
            newUpdatedSection.items = this.parser.parseNewUpdatedSection($newUpdated);
            sectionCallback(newUpdatedSection);
        });

        // Nguồn 3: Truyện xem nhiều nhất
        const fetchHot = this.DOMHTML(`${baseUrl}/danh-sach?sort=most-viewed`).then(($hot) => {
            hotSection.items = this.parser.parseHotSection($hot);
            sectionCallback(hotSection);
        });

        // Nguồn 4: Truyện cũ nhất
        const fetchOld = this.DOMHTML(`${baseUrl}/danh-sach?sort=oldest`).then(($old) => {
            oldSection.items = this.parser.parseSearchResults($old);
            sectionCallback(oldSection);
        });

        // Đợi tất cả hoàn thành để kết thúc hàm
        await Promise.allSettled([fetchHome, fetchNewUpdated, fetchHot, fetchOld]);
    }

    private async fetchMangaPage(mangaId: string): Promise<CheerioAPI> {
        const cacheKey = `manga-detail-${mangaId}`;
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
            const $ = await this.DOMHTML(`${baseUrl}/truyen/${chapterId}`);
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
                    // Slug thể loại (VD: 3d-hentai -> /the-loai/3d-hentai)
                    basePath = `/the-loai/${tagId}`;
                }
            }
        }

        // 2. Xử lý Từ khóa tìm kiếm (Ưu tiên đè basePath thành /tim-kiem)
        if (query.title?.trim()) {
            basePath = '/tim-kiem';
            params.push(`q=${encodeURIComponent(query.title.trim())}`);
            params.push('type=title');
        }

        // 3. Nếu KHÔNG có thể loại lẫn tìm kiếm (chỉ chọn Sort hoặc lấy danh sách mặc định)
        if (!basePath) {
            basePath = '/danh-sach';
        }

        // 4. Phân trang
        if (page > 1) {
            params.push(`page=${page}`);
        }

        const queryString = params.length > 0 ? `?${params.join('&')}` : '';
        const url = `${baseUrl}${basePath}${queryString}`;

        const $ = await this.DOMHTML(url);
        const manga = this.parser.parseSearchResults($);

        const hasNextPage = true;

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
                url: `${baseUrl}/danh-sach?sort=latest&page=${page}`,
                parse: ($) => this.parser.parseNewUpdatedSection($),
            },
            hot: {
                url: `${baseUrl}/danh-sach?sort=most-viewed&page=${page}`,
                parse: ($) => this.parser.parseHotSection($),
            },
            old: {
                url: `${baseUrl}/danh-sach?sort=oldest&page=${page}`,
                parse: ($) => this.parser.parseSearchResults($),
            },
            bad: {
                url: `${baseUrl}/danh-sach?sort=least-viewed&page=${page}`,
                parse: ($) => this.parser.parseHotSection($),
            },
        };

        const config = sectionConfig[homepageSectionId];

        if (!config) {
            throw new Error(`Invalid homepage section ID: ${homepageSectionId}`);
        }

        const $ = await this.DOMHTML(config.url);
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
