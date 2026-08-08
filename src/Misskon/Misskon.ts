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
import { Parser } from './MisskonParser';
import { domainSettings, getDomain, resetSettings } from './MisskonSetting';

const DOMAIN = 'https://misskon.com';

export const MisskonInfo: SourceInfo = {
    version: '1.0.0',
    name: 'Misskon',
    icon: 'icon.png',
    author: 'Lê Đại Thiện Nhân',
    authorWebsite: 'https://github.com/huynlx/',
    description: 'Extension that pulls manga from Misskon.',
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

export class Misskon implements SearchResultsProviding, MangaProviding, ChapterProviding, HomePageSectionsProviding {
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

    async getSearchTags(): Promise<TagSection[]> {
        const baseUrl = await this.getBaseUrl();
        const $ = await this.DOMHTML(`${baseUrl}/sets/`);
        return this.parser.parseTags($);
    }

    async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
        const baseUrl = await this.getBaseUrl();
        const cleanBaseUrl = baseUrl.replace(/\/$/, '');

        // 1. Khởi tạo tất cả các Home Section
        const newUpdatedSection = App.createHomeSection({
            id: 'new_updated',
            title: 'Recent posts',
            containsMoreItems: true,
            type: HomeSectionType.singleRowNormal,
        });

        const top3DaysSection = App.createHomeSection({
            id: 'top_3',
            title: 'Top 3 days',
            containsMoreItems: false,
            type: HomeSectionType.singleRowNormal,
        });

        const top7DaysSection = App.createHomeSection({
            id: 'top_7',
            title: 'Top 7 days',
            containsMoreItems: false,
            type: HomeSectionType.singleRowNormal,
        });

        const top30DaysSection = App.createHomeSection({
            id: 'top_30',
            title: 'Top 30 days',
            containsMoreItems: false,
            type: HomeSectionType.singleRowNormal,
        });

        const top60DaysSection = App.createHomeSection({
            id: 'top_60',
            title: 'Top 60 days',
            containsMoreItems: false,
            type: HomeSectionType.singleRowNormal,
        });

        const topYearSection = App.createHomeSection({
            id: 'top_year',
            title: 'Top year',
            containsMoreItems: false,
            type: HomeSectionType.singleRowNormal,
        });

        const mayLikeSection = App.createHomeSection({
            id: 'may-like',
            title: 'Don’t miss out',
            containsMoreItems: false,
            type: HomeSectionType.singleRowNormal,
        });

        // 2. Callback gửi các khung rỗng lên UI ngay lập tức
        const sections = [newUpdatedSection, top3DaysSection, top7DaysSection, top30DaysSection, top60DaysSection, topYearSection, mayLikeSection];

        for (const section of sections) {
            sectionCallback(section);
        }

        // 3. Xử lý bất đồng bộ các luồng request độc lập

        // Nguồn 1: Trang chủ (dùng chung cho Mới Nhất & Bạn Có Thể Thích)
        const fetchHome = this.DOMHTML(baseUrl).then(($home) => {
            newUpdatedSection.items = this.parser.parseNewUpdatedSection($home);
            sectionCallback(newUpdatedSection);

            mayLikeSection.items = this.parser.parseMayLikeSection($home);
            sectionCallback(mayLikeSection);
        });

        // Nguồn 2: Top 3 days
        const fetchTop3Days = this.DOMHTML(`${cleanBaseUrl}/top3/`).then(($) => {
            top3DaysSection.items = this.parser.parseHotSection($);
            sectionCallback(top3DaysSection);
        });

        // Nguồn 3: Top 7 days
        const fetchTop7Days = this.DOMHTML(`${cleanBaseUrl}/top7/`).then(($) => {
            top7DaysSection.items = this.parser.parseHotSection($);
            sectionCallback(top7DaysSection);
        });

        // Nguồn 4: Top 30 days
        const fetchTop30Days = this.DOMHTML(`${cleanBaseUrl}/top30/`).then(($) => {
            top30DaysSection.items = this.parser.parseHotSection($);
            sectionCallback(top30DaysSection);
        });

        // Nguồn 5: Top 60 days
        const fetchTop60Days = this.DOMHTML(`${cleanBaseUrl}/top60/`).then(($) => {
            top60DaysSection.items = this.parser.parseHotSection($);
            sectionCallback(top60DaysSection);
        });

        // Nguồn 6: Top year
        const fetchTopYear = this.DOMHTML(`${cleanBaseUrl}/top-year/`).then(($) => {
            topYearSection.items = this.parser.parseHotSection($);
            sectionCallback(topYearSection);
        });

        // Đợi tất cả hoàn thành để kết thúc hàm
        await Promise.allSettled([fetchHome, fetchTop3Days, fetchTop7Days, fetchTop30Days, fetchTop60Days, fetchTopYear]);
    }

    // 1. Thêm Map cache vào class
    private pageCache = new Map<string, { promise: Promise<CheerioAPI>; timestamp: number }>();

    // 2. Helper fetch HTML dùng chung có caching
    private async fetchMangaPage(realMangaId: string): Promise<CheerioAPI> {
        const now = Date.now();
        const cached = this.pageCache.get(realMangaId);

        // Giữ cache trong 10 giây để phục vụ các hàm gọi song song
        if (cached && now - cached.timestamp < 10000) {
            return cached.promise;
        }

        const baseUrl = await this.getBaseUrl();
        const promise = this.DOMHTML(`${baseUrl}/${realMangaId}`);

        this.pageCache.set(realMangaId, { promise, timestamp: now });
        return promise;
    }

    async getMangaDetails(mangaId: string): Promise<SourceManga> {
        // Sửa TS2345: Thêm '?? ""' để đảm bảo kiều dữ liệu luôn là string
        const realMangaId = mangaId.split('|')[0] ?? '';

        const $ = await this.fetchMangaPage(realMangaId);

        // Đưa cả composite mangaId ban đầu vào parser để giữ nguyên ID cho App
        return this.parser.parseMangaDetails($, mangaId);
    }

    async getChapters(mangaId: string): Promise<Chapter[]> {
        // Sửa TS2345: Thêm '?? ""' để đảm bảo kiểu dữ liệu luôn là string
        const realMangaId = mangaId.split('|')[0] ?? '';

        const $ = await this.fetchMangaPage(realMangaId);
        return this.parser.parseChapterList($);
    }

    async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        const baseUrl = await this.getBaseUrl();

        // chapterId đã bao gồm cả path và query param (VD: "slug-55851?page=2")
        const $ = await this.DOMHTML(`${baseUrl}/${chapterId}`);
        const pages = this.parser.parseChapterDetails($);

        return App.createChapterDetails({
            id: chapterId,
            mangaId: mangaId, // Giữ nguyên composite mangaId
            pages: pages,
        });
    }

    async getSearchResults(query: SearchRequest, metadata: any): Promise<PagedResults> {
        const page: number = metadata?.page ?? 1;
        const baseUrl = await this.getBaseUrl();
        const cleanBaseUrl = baseUrl.replace(/\/$/, '');

        const keyword = query.title?.trim() ?? '';
        let firstTagId = '';

        // Lấy Tag ID đầu tiên hợp lệ từ includedTags (nếu có)
        if (query.includedTags && query.includedTags.length > 0) {
            for (const tag of query.includedTags) {
                if (tag.id && tag.id !== 'all') {
                    firstTagId = tag.id.replace(/^\/|\/$/g, '');
                    break;
                }
            }
        }

        let targetUrl = '';

        // Trường hợp 1: Có cả Tag lẫn Keyword -> /tag/{tagId}/page/{page}/?s={keyword}
        if (firstTagId && keyword) {
            const basePath = `${cleanBaseUrl}/tag/${firstTagId}`;
            const pagePath = page > 1 ? `/page/${page}` : '';
            targetUrl = `${basePath}${pagePath}/?s=${encodeURIComponent(keyword)}`;
        }
        // Trường hợp 2: Chỉ search theo Tag -> /tag/{tagId}/page/{page}/
        else if (firstTagId) {
            const basePath = `${cleanBaseUrl}/tag/${firstTagId}`;
            const pagePath = page > 1 ? `/page/${page}/` : '/';
            targetUrl = `${basePath}${pagePath}`;
        }
        // Trường hợp 3: Chỉ search theo Keyword -> /page/{page}/?s={keyword}
        else if (keyword) {
            const pagePath = page > 1 ? `/page/${page}` : '';
            targetUrl = `${cleanBaseUrl}${pagePath}/?s=${encodeURIComponent(keyword)}`;
        }
        // Trường hợp 4: Không chọn Tag lẫn Keyword -> Lấy danh sách trang chủ theo trang
        else {
            targetUrl = page > 1 ? `${cleanBaseUrl}/page/${page}/` : `${cleanBaseUrl}/`;
        }

        const $ = await this.DOMHTML(targetUrl);
        const manga = this.parser.parseSearchResults($);

        // Xử lý hasNextPage dựa trên HTML phân trang thực tế:
        // 1. Kiểm tra xem có thẻ <a> nằm sau <span class="current"> hay không
        // 2. Hoặc kiểm tra xem nút #tie-next-page có chứa link <a> không
        // 3. Hoặc kiểm tra xem bất kỳ thẻ a.page nào có title > trang hiện tại
        let hasNextPage = false;

        const $pagination = $('.pagination');
        if ($pagination.length > 0) {
            const $current = $pagination.find('span.current');
            if ($current.length > 0) {
                // Nếu có thẻ <a> nằm phía sau thẻ span.current -> Vẫn còn trang tiếp theo
                hasNextPage = $current.nextAll('a').length > 0;
            } else {
                // Fallback: Tìm thẻ a.page có số trang lớn hơn trang hiện tại
                $pagination.find('a.page').each((_, el) => {
                    const pageNum = parseInt($(el).attr('title') || $(el).text().trim(), 10);
                    if (!isNaN(pageNum) && pageNum > page) {
                        hasNextPage = true;
                        return false; // Break loop
                    }
                });
            }
        }

        return App.createPagedResults({
            results: manga,
            metadata: hasNextPage ? { page: page + 1 } : undefined,
        });
    }

    async getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults> {
        const page: number = metadata?.page ?? 1;
        const baseUrl = await this.getBaseUrl();

        // Mapping section với logic tạo URL phân trang MissKON WordPress (/page/N/)
        const sectionConfig: Record<string, { getUrl: (p: number) => string; parse: ($: CheerioAPI) => PartialSourceManga[] }> = {
            new_updated: {
                // Page 1 -> https://misskon.com
                // Page 2 -> https://misskon.com/page/2/
                getUrl: (p) => (p === 1 ? baseUrl : `${baseUrl.replace(/\/$/, '')}/page/${p}/`),
                parse: ($) => this.parser.parseNewUpdatedSection($),
            },
        };

        const config = sectionConfig[homepageSectionId];

        if (!config) {
            throw new Error(`Section ID "${homepageSectionId}" does not support "View More" or is invalid.`);
        }

        const requestUrl = config.getUrl(page);
        const $ = await this.DOMHTML(requestUrl);
        const manga = config.parse($);

        // Dừng phân trang nếu không lấy được item nào
        if (!manga || manga.length === 0) {
            return App.createPagedResults({
                results: [],
                metadata: undefined,
            });
        }

        // Kiểm tra trang tiếp theo trong MissKON Pagination HTML
        // Có trang tiếp theo nếu:
        // 1. Có thẻ <a> chứa title matching số trang kế tiếp (page + 1)
        // 2. Hoặc có thẻ #tie-next-page chứa <a>
        // 3. Hoặc có class .extend (...)
        const nextPageNum = page + 1;
        const hasNextLink = $('.pagination a.page').filter((_, el) => $(el).attr('title') === String(nextPageNum)).length > 0;
        const hasNextPageBtn = $('#tie-next-page a').length > 0;
        const hasExtend = $('.pagination .extend').length > 0;

        const hasNextPage = hasNextLink || hasNextPageBtn || hasExtend;

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
