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
import { Parser } from './NetTruyenParser';
import { domainSettings, getDomain, resetSettings } from './NetTruyenSetting';

const DOMAIN = 'https://nettruyenviet10.com';

export const NetTruyenInfo: SourceInfo = {
    version: '1.0.0',
    name: 'NetTruyen',
    icon: 'icon.png',
    author: 'Lê Đại Thiện Nhân',
    authorWebsite: 'https://github.com/huynlx/',
    description: 'Extension that pulls manga from NetTruyen.',
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

export class NetTruyen implements SearchResultsProviding, MangaProviding, ChapterProviding, HomePageSectionsProviding {
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
        return `${DOMAIN}/truyen-tranh/${mangaId}`;
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
        const fetchHome = this.DOMHTML(baseUrl + '/truyen-tranh-moi').then(($home) => {
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
        const baseUrl = await this.getBaseUrl();
        const $ = await this.DOMHTML(`${baseUrl}/tim-truyen`);
        return this.parser.parseTags($);
    }

    async getMangaDetails(mangaId: string): Promise<SourceManga> {
        const baseUrl = await this.getBaseUrl();
        const $ = await this.DOMHTML(`${baseUrl}/truyen-tranh/${mangaId}`);
        return this.parser.parseMangaDetails($, mangaId);
    }

    async getChapters(mangaId: string): Promise<Chapter[]> {
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

        return this.parser.parseChapterList(chapterList);
    }

    async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        const baseUrl = await this.getBaseUrl();
        const $ = await this.DOMHTML(`${baseUrl}/truyen-tranh/${mangaId}/chuong-${chapterId}`);
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
        const url = `${baseUrl}${basePath}${queryString}`;

        const $ = await this.DOMHTML(url);
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
                url: `${baseUrl}/truyen-tranh-moi?page=${page}`,
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

        const $ = await this.DOMHTML(config.url);
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
