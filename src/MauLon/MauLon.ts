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

export class MauLon implements SearchResultsProviding, MangaProviding, ChapterProviding, HomePageSectionsProviding {
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
        const $ = await this.DOMHTML(`${baseUrl}/tags`);
        return this.parser.parseTags($);
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
        // 1. Tách realMangaId từ compositeId (mangaId dạng: "id-bai-viet|url_cover")
        const realMangaId = mangaId.split('|')[0] ?? '';

        // 2. Fetch nội dung HTML của trang truyện
        const $ = await this.fetchMangaPage(realMangaId);

        // 3. Gọi hàm parser để trích xuất dữ liệu chi tiết
        return this.parser.parseMangaDetails($, mangaId);
    }

    async getChapters(mangaId: string): Promise<Chapter[]> {
        const realMangaId = mangaId.split('|')[0] ?? '';
        const $ = await this.fetchMangaPage(realMangaId);

        return this.parser.parseChapterList($, realMangaId);
    }

    async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        const $ = await this.fetchMangaPage(chapterId);
        const pages: string[] = [];

        // Tìm vị trí phần tử footer.entry-footer trong DOM
        const $footer = $('footer.entry-footer, .entry-footer').first();
        const footerIndex = $footer.length > 0 ? $('*').index($footer) : Infinity;

        // Duyệt tất cả thẻ img trong .entry-content
        $('.entry-content img').each((_, element) => {
            const $img = $(element);

            // ĐIỀU KIỆN CHỐT: Chỉ lấy img có vị trí đứng trước footer.entry-footer
            const imgIndex = $('*').index($img);
            if (imgIndex >= footerIndex) return;

            // Bỏ qua ảnh thuộc quảng cáo hoặc bài viết liên quan
            if ($img.closest('.crp_related, .post-topad, .banner-ci2, .widget_text').length > 0) return;

            // Ưu tiên lấy URL ảnh gốc từ thẻ <a> bao ngoài
            const $parentLink = $img.closest('a');
            let src = $parentLink.attr('href') || $img.attr('src') || $img.attr('data-src') || '';

            // Kiểm tra định dạng ảnh hợp lệ
            if (!src || !src.match(/\.(jpg|jpeg|png|webp|gif)/i)) return;

            if (src.startsWith('//')) {
                src = `https:${src}`;
            }

            if (src && !pages.includes(src)) {
                pages.push(src);
            }
        });

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

        // Trường hợp 1: Có cả Tag lẫn Keyword -> /{tagId}[/page/{page}]?s={keyword}
        if (firstTagId && keyword) {
            const basePath = `${cleanBaseUrl}/${firstTagId}`;
            const pagePath = page > 1 ? `/page/${page}` : '';
            targetUrl = `${basePath}${pagePath}?s=${encodeURIComponent(keyword)}`;
        }
        // Trường hợp 2: Chỉ search theo Tag -> /{tagId}[/page/{page}/]
        else if (firstTagId) {
            const basePath = `${cleanBaseUrl}/${firstTagId}`;
            const pagePath = page > 1 ? `/page/${page}/` : '/';
            targetUrl = `${basePath}${pagePath}`;
        }
        // Trường hợp 3: Chỉ search theo Keyword -> [/page/{page}]?s={keyword}
        else if (keyword) {
            const pagePath = page > 1 ? `/page/${page}` : '';
            targetUrl = `${cleanBaseUrl}${pagePath}?s=${encodeURIComponent(keyword)}`;
        }
        // Trường hợp 4: Không chọn Tag lẫn Keyword -> Lấy danh sách trang chủ theo trang
        else {
            targetUrl = page > 1 ? `${cleanBaseUrl}/page/${page}/` : `${cleanBaseUrl}/`;
        }

        const $ = await this.DOMHTML(targetUrl);
        const manga = this.parser.parseSearchResults($);

        // Xử lý hasNextPage dựa trên HTML phân trang thực tế (.wp-pagenavi)
        const nextPageNum = page + 1;

        // 1. Kiểm tra sự tồn tại của nút "Trang sau" (.nextpostslink)
        const hasNextBtn = $('.wp-pagenavi a.nextpostslink').length > 0;

        // 2. Kiểm tra thẻ <a> có title matching "Page N" hoặc nằm sau span.current
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

        // Mapping section với logic tạo URL phân trang WordPress (/page/N/)
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
        const $ = await this.DOMHTML(requestUrl);
        const manga = config.parse($);

        // Dừng phân trang nếu không lấy được item nào
        if (!manga || manga.length === 0) {
            return App.createPagedResults({
                results: [],
                metadata: undefined,
            });
        }

        // Kiểm tra trang tiếp theo trong wp-pagenavi
        const nextPageNum = page + 1;

        // 1. Kiểm tra sự tồn tại của nút "Trang sau" (.nextpostslink)
        const hasNextBtn = $('.wp-pagenavi a.nextpostslink').length > 0;

        // 2. Kiểm tra sự tồn tại của thẻ <a> dẫn đến trang kế tiếp (VD: title="Page 3" khi đang ở page 2)
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
