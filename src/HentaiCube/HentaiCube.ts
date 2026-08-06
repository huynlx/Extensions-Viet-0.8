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

// Helper tạo chuỗi Hex 32 ký tự giả lập Client ID
function generateClientId(): string {
    return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

export class HentaiCube implements SearchResultsProviding, MangaProviding, ChapterProviding, HomePageSectionsProviding {
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
            title: 'Truyện Vừa Cập Nhật',
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

        // Nguồn 2: Truyện mới cập nhật
        const fetchNewUpdated = this.DOMHTML(`${baseUrl}/read`).then(($newUpdated) => {
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

    // async getSearchTags(): Promise<TagSection[]> {
    //     const baseUrl = await this.getBaseUrl();
    //     const $ = await this.DOMHTML(`${baseUrl}/the-loai`);
    //     return this.parser.parseTags($);
    // }

    async getMangaDetails(mangaId: string): Promise<SourceManga> {
        const baseUrl = await this.getBaseUrl();
        const $ = await this.DOMHTML(`${baseUrl}/read/${mangaId}`);
        return this.parser.parseMangaDetails($, mangaId);
    }

    // async getChapters(mangaId: string): Promise<Chapter[]> {
    //     const baseUrl = await this.getBaseUrl();
    //     const $ = await this.DOMHTML(`${baseUrl}/read/${mangaId}`);
    //     return this.parser.parseChapterList($);
    // }

    async getChapters(mangaId: string): Promise<Chapter[]> {
        const baseUrl = await this.getBaseUrl();

        // Endpoint AJAX lấy danh sách chapter của Madara theme
        const requestUrl = `${baseUrl}/read/${mangaId}/ajax/chapters/?t=1`;

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

        // Gọi parser đã điều chỉnh selector ở bước trước
        return this.parser.parseChapterList($);
    }

    async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        const baseUrl = await this.getBaseUrl();
        const chapterUrl = `${baseUrl}/read/${chapterId}/`;

        // 1. Tải HTML trang đọc chapter
        const request = App.createRequest({
            url: chapterUrl,
            method: 'GET',
            headers: { Referer: baseUrl },
        });

        const response = await this.requestManager.schedule(request, 1);
        const html = response.data as string;
        const $ = this.cheerio.load(html);

        // 2. Lấy token ban đầu
        const $reader = $('.masr2-reader, #manga-secure-reader');
        let currentToken = $reader.attr('data-masr2-token') || $reader.attr('data-token') || '';

        if (!currentToken) {
            throw new Error(`Không tìm thấy token cho chapter: ${chapterId}`);
        }

        // 3. Tạo nhanh Client ID (32 ký tự hex ngẫu nhiên)
        const cid = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        const pages: string[] = [];

        // 4. Vòng lặp lấy dữ liệu tối ưu trực tiếp
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
                url: `${baseUrl}/read/page/${page}`,
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
