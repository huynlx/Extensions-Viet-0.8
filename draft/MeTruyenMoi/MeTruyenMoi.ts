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
import { Parser } from './MeTruyenMoiParser';
import { domainSettings, getDomain, resetSettings } from './MeTruyenMoiSetting';

const DOMAIN = 'https://metruyenmoi.net';

export const MeTruyenMoiInfo: SourceInfo = {
    version: '1.0.0',
    name: 'MeTruyenMoi',
    icon: 'icon.png',
    author: 'Lê Đại Thiện Nhân',
    authorWebsite: 'https://github.com/huynlx/',
    description: 'Extension that pulls manga from MeTruyenMoi.',
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

export class MeTruyenMoi implements SearchResultsProviding, MangaProviding, ChapterProviding, HomePageSectionsProviding {
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
        // 1. Chuẩn hóa mangaId (VD: /toi-lam-tay-sai-o-di-gioi/ -> toi-lam-tay-sai-o-di-gioi)
        const cleanMangaId = mangaId.replace(/^\/+|\/+$/g, '');

        // 2. Fetch HTML trang chi tiết truyện
        const request = App.createRequest({
            url: `https://metruyenmoi.net/truyen-tranh/${cleanMangaId}`,
            method: 'GET',
        });

        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data as string);

        // 3. LẤY VÀ LOG ĐOẠN SCRIPT CẦN TÌM
        let targetScriptContent = '';

        $('script').each((_, element) => {
            const html = $(element).html() || '';

            // Chỉ cần script chứa từ khóa "comic" (hoặc \"comic\")
            if (html.includes('comic')) {
                targetScriptContent = html;
                return false; // Dừng vòng lặp ngay khi tìm thấy thẻ đầu tiên
            }
        });

        // LOG RA ĐOẠN SCRIPT TÌM ĐƯỢC
        console.log('=== TARGET SCRIPT FOUND ===');
        console.log(targetScriptContent);
        console.log('===========================');

        // 4. TRÍCH XUẤT COMIC ID
        // 1. Unescape chuỗi script
        const cleanContent = targetScriptContent.replace(/\\"/g, '"');

        // 2. Trích xuất ID nằm ngay sau "comic":{"id":
        const match = cleanContent.match(/"comic":\s*\{\s*"id":\s*(\d+)/) || cleanContent.match(new RegExp(`"id":(\\d+),[^}]*"url":"${mangaId}"`));

        const comicId = match ? match[1] : '';
        console.log('Comic ID:', comicId); // 78000

        // 4. Gọi API lấy danh sách Chapters
        const apiRequest = App.createRequest({
            url: `https://metruyenmoi.net/api/comic/${comicId}/chapters`,
            method: 'GET',
            headers: {
                accept: '*/*',
                'content-type': 'application/json',
                referer: `https://metruyenmoi.net/truyen-tranh/${cleanMangaId}`,
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',
                Cookie: 'app-settings={%22version%22:1%2C%22values%22:{%22theme%22:%22dark%22}}',
            },
        });

        const apiResponse = await this.requestManager.schedule(apiRequest, 1);
        const json = typeof apiResponse.data === 'string' ? JSON.parse(apiResponse.data) : apiResponse.data;

        // Mảng chapter nằm trong field `data`
        const rawChapters = Array.isArray(json?.data) ? json.data : [];
        const chapters: Chapter[] = [];

        for (const item of rawChapters) {
            // Nếu slug là 0 (Chapter 0) thì parseFloat(0) trả về 0 vẫn chuẩn
            const chapNum = typeof item.slug !== 'undefined' ? Number(item.slug) : 0;
            const chapterId = typeof item.slug !== 'undefined' ? `chuong-${item.slug}` : String(item.id);

            chapters.push(
                App.createChapter({
                    id: chapterId,
                    name: item.title || `Chapter ${item.slug}`,
                    chapNum: Number.isNaN(chapNum) ? 0 : chapNum,
                    time: item.updateAt ? new Date(item.updateAt) : new Date(),
                    langCode: '🇻🇳',
                })
            );
        }

        return chapters;
    }

    async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        const baseUrl = await this.getBaseUrl();
        const $ = await this.DOMHTML(`${baseUrl}/truyen-tranh/${mangaId}/${chapterId}`);
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
