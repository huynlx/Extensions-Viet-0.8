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
import { Parser } from './HentaiVNXParser';
import { cdnSettings, domainSettings, getDomain, resetSettings, testConnectionButton } from './HentaiVNXSetting';

const DOMAIN = 'https://www.hentaivnx.com/';

export const HentaiVNXInfo: SourceInfo = {
    version: '1.0.1',
    name: 'HentaiVNX',
    icon: 'icon.png',
    author: 'Lê Đại Thiện Nhân',
    authorWebsite: 'https://github.com/huynlx/',
    description: 'Extension that pulls manga from HentaiVNX.',
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

export class HentaiVNX implements SearchResultsProviding, MangaProviding, ChapterProviding, HomePageSectionsProviding {
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
        return `${DOMAIN}/truyen-hentai/${mangaId}`;
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

        // 2. Callback khung rỗng trước để UI hiển thị skeleton loading
        sectionCallback(featuredSection);
        sectionCallback(newUpdatedSection);
        sectionCallback(hotSection);

        // 3. Tải và parse dữ liệu bất đồng bộ độc lập

        // Nguồn 1: Trang chủ (chứa cả Featured & New Updated)
        const fetchHome = this.DOMHTML(baseUrl).then(($home) => {
            featuredSection.items = this.parser.parseFeaturedSection($home);
            sectionCallback(featuredSection);

            newUpdatedSection.items = this.parser.parseNewUpdatedSection($home);
            sectionCallback(newUpdatedSection);
        });

        // Nguồn 2: Tìm truyện nâng cao (Xếp hạng Top All)
        const hotUrl = `${baseUrl}/tim-truyen-nang-cao?genres=&notgenres=&minchapter=0&sort=10&contain=`;
        const fetchHot = this.DOMHTML(hotUrl).then(($hot) => {
            hotSection.items = this.parser.parseHotSection($hot);
            sectionCallback(hotSection);
        });

        // Chờ tất cả hoàn thành mà không làm nghẽn tiến trình render từng phần
        await Promise.allSettled([fetchHome, fetchHot]);
    }

    async getSearchTags(): Promise<TagSection[]> {
        const baseUrl = await this.getBaseUrl();
        const $ = await this.DOMHTML(`${baseUrl}/tim-truyen-nang-cao`);
        return this.parser.parseTags($);
    }

    async getMangaDetails(mangaId: string): Promise<SourceManga> {
        const baseUrl = await this.getBaseUrl();
        const $ = await this.DOMHTML(`${baseUrl}/truyen-hentai/${mangaId}`);
        return this.parser.parseMangaDetails($, mangaId);
    }

    async getChapters(mangaId: string): Promise<Chapter[]> {
        const baseUrl = await this.getBaseUrl();
        const $ = await this.DOMHTML(`${baseUrl}/truyen-hentai/${mangaId}`);
        return this.parser.parseChapterList($);
    }

    async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        const baseUrl = await this.getBaseUrl();
        const $ = await this.DOMHTML(`${baseUrl}/truyen-hentai/${chapterId}`);
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

        // Duyệt qua tất cả các tag được chọn
        if (query.includedTags && query.includedTags.length > 0) {
            for (const tag of query.includedTags) {
                const tagId = tag.id;

                // Bỏ qua tag "Tất cả" hoặc root ID
                if (!tagId || tagId === 'all' || tagId === 'tim-truyen') {
                    continue;
                }

                if (tagId.includes('=')) {
                    // Tham số query string (VD: status=1, sort=10)
                    params.push(tagId);
                } else {
                    // Slug thể loại (VD: action-95)
                    basePath = `/tim-truyen/${tagId}`;
                }
            }
        }

        // Từ khóa tìm kiếm
        if (query.title?.trim()) {
            params.push(`keyword=${encodeURIComponent(query.title.trim())}`);
        }

        // Phân trang
        params.push(`page=${page}`);

        const queryString = params.length > 0 ? `?${params.join('&')}` : '';
        const url = `${baseUrl}${basePath}${queryString}`;

        const $ = await this.DOMHTML(url);
        const manga = this.parser.parseSearchResults($);

        // Kiểm tra trang tiếp theo bằng pagination active
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
                url: `${baseUrl}/tim-truyen-nang-cao?genres=&notgenres=&minchapter=0&sort=10&contain=&page=${page}`,
                parse: ($) => this.parser.parseHotSection($),
            },
            new_updated: {
                url: `${baseUrl}?page=${page}`,
                parse: ($) => this.parser.parseNewUpdatedSection($),
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
