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

const DOMAIN = 'https://lxmanga.space';

export const SayHentaiInfo: SourceInfo = {
    version: '1.0.0',
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

export class SayHentai implements SearchResultsProviding, MangaProviding, ChapterProviding, HomePageSectionsProviding {
    constructor(private cheerio: CheerioAPI) {}

    stateManager = App.createSourceStateManager();
    parser = new Parser();

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
        const request = App.createRequest({
            url: url,
            method: 'GET',
        });
        const response = await this.requestManager.schedule(request, 1);
        this.CloudFlareError(response.status);
        return this.cheerio.load(response.data as string);
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

        // 3. Xử lý bất đồng bộ độc lập

        // Nguồn 1: Trang chủ (dùng chung cho Featured, Random và NewUpdated)
        const fetchHome = this.DOMHTML(baseUrl).then(($home) => {
            featuredSection.items = this.parser.parseFeaturedSection($home);
            sectionCallback(featuredSection);

            randomSection.items = this.parser.parseRandomSection($home);
            sectionCallback(randomSection);

            newUpdatedSection.items = this.parser.parseNewUpdatedSection($home);
            sectionCallback(newUpdatedSection);
        });

        // Nguồn 2: Truyện xem nhiều nhất
        const fetchHot = this.DOMHTML(`${baseUrl}/danh-sach?sort=most-viewed`).then(($hot) => {
            hotSection.items = this.parser.parseHotSection($hot);
            sectionCallback(hotSection);
        });

        // Nguồn 3: Truyện cũ nhất
        const fetchOld = this.DOMHTML(`${baseUrl}/danh-sach?sort=oldest`).then(($old) => {
            oldSection.items = this.parser.parseSearchResults($old);
            sectionCallback(oldSection);
        });

        // Đợi tất cả hoàn thành để kết thúc hàm
        await Promise.allSettled([fetchHome, fetchHot, fetchOld]);
    }

    async getSearchTags(): Promise<TagSection[]> {
        const baseUrl = await this.getBaseUrl();
        const $ = await this.DOMHTML(`${baseUrl}/the-loai`);
        return this.parser.parseTags($);
    }

    private pageCache = new Map<string, { promise: Promise<CheerioAPI>; timestamp: number }>();

    private async fetchMangaPageCached(mangaId: string): Promise<CheerioAPI> {
        const now = Date.now();
        const cached = this.pageCache.get(mangaId);

        // Cache tồn tại dưới 10 giây -> dùng lại
        if (cached && now - cached.timestamp < 10000) {
            return cached.promise;
        }

        const promise = (async () => {
            const baseUrl = await this.getBaseUrl();
            return await this.DOMHTML(`${baseUrl}/truyen/${mangaId}`);
        })();

        this.pageCache.set(mangaId, { promise, timestamp: now });
        return promise;
    }

    async getMangaDetails(mangaId: string): Promise<SourceManga> {
        const $ = await this.fetchMangaPageCached(mangaId);
        return this.parser.parseMangaDetails($, mangaId);
    }

    async getChapters(mangaId: string): Promise<Chapter[]> {
        const $ = await this.fetchMangaPageCached(mangaId);
        return this.parser.parseChapterList($);
    }

    async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        const baseUrl = await this.getBaseUrl();
        const $ = await this.DOMHTML(`${baseUrl}/truyen/${chapterId}`);
        const pages = this.parser.parseChapterDetails($);
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
