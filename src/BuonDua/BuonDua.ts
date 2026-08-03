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
import { Parser } from './BuonDuaParser';
import { cdnSettings, domainSettings, getDomain, resetSettings, testConnectionButton } from './BuonDuaSetting';

const DOMAIN = 'https://buondua.com';

export const BuonDuaInfo: SourceInfo = {
    version: '1.0.1',
    name: 'Buon Dua',
    icon: 'icon.png',
    author: 'Lê Đại Thiện Nhân',
    authorWebsite: 'https://github.com/huynlx/',
    description: 'Extension that pulls manga from BuonDua.',
    contentRating: ContentRating.EVERYONE,
    websiteBaseURL: DOMAIN,
    sourceTags: [
        {
            text: 'Adult',
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

export class BuonDua implements SearchResultsProviding, MangaProviding, ChapterProviding, HomePageSectionsProviding {
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
            rows: async () => [domainSettings(this.stateManager), cdnSettings(this.stateManager), testConnectionButton(this.stateManager), resetSettings(this.stateManager)],
            isHidden: false,
        });
    }

    async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
        const baseUrl = await this.getBaseUrl();

        // 1. Khởi tạo các Section
        const newUpdatedSection = App.createHomeSection({
            id: 'new_updated',
            title: 'Mới Nhất',
            containsMoreItems: true,
            type: HomeSectionType.singleRowNormal,
        });

        const hotSection = App.createHomeSection({
            id: 'hot',
            title: 'Nổi Bật',
            containsMoreItems: true,
            type: HomeSectionType.singleRowNormal,
        });

        const mayLikeSection = App.createHomeSection({
            id: 'may-like',
            title: 'Bạn Có Thể Thích',
            containsMoreItems: false,
            type: HomeSectionType.singleRowLarge,
        });

        // 2. Callback khung rỗng ngay lập tức
        sectionCallback(newUpdatedSection);
        sectionCallback(hotSection);
        sectionCallback(mayLikeSection);

        // 3. Xử lý bất đồng bộ độc lập (Trả về UI ngay khi từng request hoàn thành
        // Nguồn 1: Truyện mới nhất
        const fetchNewUpdated = this.DOMHTML(`${baseUrl}`).then(($newUpdated) => {
            newUpdatedSection.items = this.parser.parseNewUpdatedSection($newUpdated);
            sectionCallback(newUpdatedSection);
        });

        // Nguồn 2: Truyện xem nhiều nhất
        const fetchHot = this.DOMHTML(`${baseUrl}/hot`).then(($hot) => {
            hotSection.items = this.parser.parseHotSection($hot);
            sectionCallback(hotSection);
        });

        // Nguồn 3: Truyện bạn có thể thích (Lấy từ trang chủ)
        const fetchMayLike = this.DOMHTML(`${baseUrl}`).then(($mayLike) => {
            mayLikeSection.items = this.parser.parseMayLikeSection($mayLike);
            sectionCallback(mayLikeSection);
        });

        // Đợi tất cả hoàn thành để kết thúc hàm
        await Promise.allSettled([fetchNewUpdated, fetchHot, fetchMayLike]);
    }

    async getSearchTags(): Promise<TagSection[]> {
        const baseUrl = await this.getBaseUrl();
        const $ = await this.DOMHTML(`${baseUrl}/collection`);
        return this.parser.parseTags($);
    }

    async getMangaDetails(mangaId: string): Promise<SourceManga> {
        const baseUrl = await this.getBaseUrl();

        // Tách lấy ID thực sự từ composite ID (Ví dụ: "slug-55851|https%3A%2F%2F...")
        const [realMangaId] = mangaId.split('|');

        const $ = await this.DOMHTML(`${baseUrl}/${realMangaId}`);

        // Đưa cả composite mangaId ban đầu vào parser để giữ nguyên ID cho App
        return this.parser.parseMangaDetails($, mangaId);
    }

    async getChapters(mangaId: string): Promise<Chapter[]> {
        const baseUrl = await this.getBaseUrl();

        // Tách lấy ID thực sự để fetch HTML trang đầu tiên
        const [realMangaId] = mangaId.split('|');

        const $ = await this.DOMHTML(`${baseUrl}/${realMangaId}`);
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

        let basePath = '';
        const params: string[] = [];

        // Tính offset phân trang (Buondua dùng 20 items mỗi trang)
        const startOffset = (page - 1) * 20;

        // 1. Ưu tiên xử lý từ khóa tìm kiếm (Ví dụ: /?search=yu)
        if (query.title?.trim()) {
            basePath = '/';
            params.push(`search=${encodeURIComponent(query.title.trim())}`);
        }
        // 2. Xử lý Thể loại nếu không tìm theo từ khóa (Ví dụ: /tag/cosplay-10688)
        else if (query.includedTags && query.includedTags.length > 0) {
            for (const tag of query.includedTags) {
                const tagId = tag.id;

                if (!tagId || tagId === 'all') {
                    continue;
                }

                if (tagId.includes('=')) {
                    // Tham số query mở rộng nếu có
                    params.push(tagId);
                } else {
                    // Đường dẫn tag dạng /tag/cosplay-10688
                    basePath = `/tag/${tagId}`;
                }
            }
        }

        // 3. Nếu KHÔNG có từ khóa lẫn thể loại (Trang danh sách chung)
        if (!basePath) {
            basePath = '/';
        }

        // 4. Phân trang (Trang 2 trở đi thêm &start=20, start=40...)
        if (page > 1) {
            params.push(`start=${startOffset}`);
        }

        const queryString = params.length > 0 ? `?${params.join('&')}` : '';
        const url = `${baseUrl}${basePath}${queryString}`.replace(/\/\?/g, '/?');

        const $ = await this.DOMHTML(url);
        const manga = this.parser.parseSearchResults($);

        // Kiểm tra xem có trang kế tiếp hay không (nếu mảng danh sách trả về rỗng thì hết trang)
        const hasNextPage = manga.length > 0;

        return App.createPagedResults({
            results: manga,
            metadata: hasNextPage ? { page: page + 1 } : undefined,
        });
    }

    async getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults> {
        const page: number = metadata?.page ?? 1;
        const baseUrl = await this.getBaseUrl();

        // Mapping section với logic tạo URL offset (?start=N)
        const sectionConfig: Record<string, { getUrl: (p: number) => string; parse: ($: CheerioAPI) => PartialSourceManga[] }> = {
            new_updated: {
                // Page 1 -> https://buondua.com/ (hoặc ?start=0)
                // Page 2 -> https://buondua.com/?start=20
                // Page 3 -> https://buondua.com/?start=40
                getUrl: (p) => (p === 1 ? baseUrl : `${baseUrl}/?start=${(p - 1) * 20}`),
                parse: ($) => this.parser.parseNewUpdatedSection($),
            },
            hot: {
                getUrl: (p) => (p === 1 ? `${baseUrl}/hot` : `${baseUrl}/hot?start=${(p - 1) * 20}`),
                parse: ($) => this.parser.parseHotSection($),
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

        // Kiểm tra nút Next hoặc phân trang trong DOM Bulma (.pagination-next)
        const hasNextButton = $('.pagination-next').length > 0;

        // Fallback: Kiểm tra nếu số lượng trả về đạt đủ 20 items/trang
        const isNextAvailable = hasNextButton || manga.length >= 20;

        return App.createPagedResults({
            results: manga,
            metadata: isNextAvailable ? { page: page + 1 } : undefined,
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
