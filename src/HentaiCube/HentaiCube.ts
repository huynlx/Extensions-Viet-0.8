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

    async getMangaShareUrl(mangaId: string): Promise<string> {
        const baseUrl = await this.getBaseUrl();
        return `${baseUrl}/read/${mangaId}`;
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
            title: 'Đề Cử',
            containsMoreItems: false,
            type: HomeSectionType.featured,
        });

        const newUpdatedSection = App.createHomeSection({
            id: 'new_updated',
            title: 'Vừa Cập Nhật',
            containsMoreItems: true,
            type: HomeSectionType.singleRowNormal,
        });

        const hotSection = App.createHomeSection({
            id: 'hot',
            title: 'Trending',
            containsMoreItems: true,
            type: HomeSectionType.singleRowNormal,
        });

        const viewSection = App.createHomeSection({
            id: 'view',
            title: 'Đọc Nhiều Nhất',
            containsMoreItems: true,
            type: HomeSectionType.singleRowNormal,
        });

        const newSection = App.createHomeSection({
            id: 'new',
            title: 'Mới',
            containsMoreItems: true,
            type: HomeSectionType.singleRowNormal,
        });

        const randomSection = App.createHomeSection({
            id: 'random',
            title: 'Ngẫu Nhiên',
            containsMoreItems: false,
            type: HomeSectionType.singleRowLarge,
        });

        const doneSection = App.createHomeSection({
            id: 'done',
            title: 'Hoàn Thành',
            containsMoreItems: true,
            type: HomeSectionType.singleRowNormal,
        });

        // 2. Callback khung rỗng ngay lập tức
        sectionCallback(featuredSection);
        sectionCallback(hotSection);
        sectionCallback(newUpdatedSection);
        sectionCallback(viewSection);
        sectionCallback(newSection);
        sectionCallback(randomSection);
        sectionCallback(doneSection);

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

        // Nguồn 3: Truyện trending
        const fetchHot = this.DOMHTML(`${baseUrl}`).then(($hot) => {
            hotSection.items = this.parser.parseHotSection($hot);
            sectionCallback(hotSection);
        });

        // Nguồn 4: Truyện xem nhiều
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

        // Đợi tất cả hoàn thành để kết thúc hàm
        await Promise.allSettled([fetchHome, fetchNewUpdated, fetchHot, fetchView, fetchNew, fetchDone]);
    }

    async getSearchTags(): Promise<TagSection[]> {
        const baseUrl = await this.getBaseUrl();
        const $ = await this.DOMHTML(`${baseUrl}/the-loai-genres/`);
        return this.parser.parseTags($);
    }

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
        let hasKeyword = false;

        // 1. Xử lý Từ khóa tìm kiếm
        if (query.title?.trim()) {
            hasKeyword = true;
            params.push(`s=${encodeURIComponent(query.title.trim())}`);
            params.push('post_type=wp-manga');
        }

        // 2. Xử lý Thể loại (hỗ trợ nhiều tag dạng genre[] hoặc path nếu không có keyword)
        if (query.includedTags && query.includedTags.length > 0) {
            for (const tag of query.includedTags) {
                const tagId = tag.id;

                if (!tagId || tagId === 'all') {
                    continue;
                }

                if (tagId.includes('=')) {
                    params.push(tagId);
                } else if (hasKeyword) {
                    // Nếu có keyword, sử dụng mảng genre[] cho nhiều tag
                    params.push(`genre[]=${tagId}`);
                } else {
                    // Nếu chỉ có 1 tag và không có keyword, ưu tiên dùng dạng path (hoặc xử lý tương tự nếu muốn dùng genre[])
                    basePath = `/theloai/${tagId}`;
                }
            }
        }

        // Thêm tham số author ở cuối nếu có tìm kiếm keyword
        if (hasKeyword) {
            params.push('author=');
        }

        let url = '';

        // 3. Xây dựng URL theo chuẩn
        if (hasKeyword) {
            // Định dạng search: https://hentaicube.xyz/page/2/?s=k&post_type=wp-manga&genre[]=big-breasts&genre[]=blackmail&author=
            const pagePrefix = page > 1 ? `/page/${page}` : '';
            const queryString = params.length > 0 ? `?${params.join('&')}` : '';
            url = `${baseUrl}${pagePrefix}${queryString}`;
        } else {
            // Định dạng chỉ có tag/danh sách: https://hentaicube.xyz/theloai/3d/page/2/
            const pageSuffix = page > 1 ? `/page/${page}/` : '';
            const queryString = params.length > 0 ? `?${params.join('&')}` : '';
            url = `${baseUrl}${basePath}${pageSuffix}${queryString}`;
        }

        const $ = await this.DOMHTML(url);

        // 4. Phân biệt parser theo việc có từ khóa hay không
        const manga = hasKeyword ? this.parser.parseLoopResults($) : this.parser.parseSearchResults($);

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
