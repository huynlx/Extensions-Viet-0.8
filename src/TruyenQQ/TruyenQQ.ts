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
import { isLastPage, Parser } from './TruyenQQParser';
import { domainSettings, getDomain, resetSettings } from './TruyenQQSetting';

const DEFAULT_DOMAIN = 'https://truyenqqko.com';

export const TruyenQQInfo: SourceInfo = {
    version: '1.0.0',
    name: 'TruyenQQ',
    icon: 'icon.png',
    author: 'Lê Đại Thiện Nhân',
    authorWebsite: 'https://github.com/huynlx/',
    description: 'Extension that pulls manga from TruyenQQ.',
    contentRating: ContentRating.EVERYONE,
    websiteBaseURL: DEFAULT_DOMAIN,
    sourceTags: [
        {
            text: 'Vietnamese',
            type: BadgeColor.GREEN,
        },
    ],
    intents: SourceIntents.MANGA_CHAPTERS | SourceIntents.HOMEPAGE_SECTIONS | SourceIntents.SETTINGS_UI | SourceIntents.CLOUDFLARE_BYPASS_REQUIRED,
};

export class TruyenQQ implements SearchResultsProviding, MangaProviding, ChapterProviding, HomePageSectionsProviding {
    stateManager = App.createSourceStateManager();
    parser = new Parser();

    constructor(private cheerio: CheerioAPI) {}

    // Lấy domain động từ setting và chuẩn hóa bỏ dấu '/' ở cuối
    private async getBaseUrl(): Promise<string> {
        const domain = await getDomain(this.stateManager);
        return domain.replace(/\/+$/, '');
    }

    readonly requestManager = App.createRequestManager({
        requestsPerSecond: 2,
        requestTimeout: 50000,
        interceptor: {
            interceptRequest: async (request: Request): Promise<Request> => {
                const baseUrl = await this.getBaseUrl();
                request.headers = {
                    ...(request.headers ?? {}),
                    ...{
                        referer: `${baseUrl}/`,
                        'user-agent': await this.requestManager.getDefaultUserAgent(),
                    },
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
        return `${baseUrl}/truyen-tranh/${mangaId}`;
    }

    private async DOMHTML(url: string): Promise<CheerioAPI> {
        const request = App.createRequest({
            url: url,
            method: 'GET',
        });
        const response = await this.requestManager.schedule(request, 1);
        await this.CloudFlareError(response.status);
        return this.cheerio.load(response.data as string);
    }

    async getSearchTags(): Promise<TagSection[]> {
        const baseUrl = await this.getBaseUrl();
        const url = `${baseUrl}/tim-kiem-nang-cao`;
        const $ = await this.DOMHTML(url);
        return this.parser.parseTags($);
    }

    async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
        const baseUrl = await this.getBaseUrl();

        // 1. Khởi tạo danh sách Sections
        const sections: HomeSection[] = [
            App.createHomeSection({ id: 'featured', title: 'Truyện Đề Cử', containsMoreItems: false, type: HomeSectionType.featured }),
            App.createHomeSection({ id: 'hot', title: 'Độc Quyền Truyện QQ', containsMoreItems: false, type: HomeSectionType.singleRowLarge }),
            App.createHomeSection({ id: 'new_updated', title: 'Truyện Mới Cập Nhật', containsMoreItems: true, type: HomeSectionType.singleRowNormal }),
            App.createHomeSection({ id: 'favorite', title: 'Truyện Yêu Thích', containsMoreItems: true, type: HomeSectionType.singleRowNormal }),
            App.createHomeSection({ id: 'new_added', title: 'Truyện Mới Thêm Gần Đây', containsMoreItems: true, type: HomeSectionType.singleRowNormal }),
            App.createHomeSection({ id: 'full', title: 'Truyện Đã Hoàn Thành', containsMoreItems: true, type: HomeSectionType.singleRowNormal }),
        ];

        // 1. Map URL tương ứng cho từng Section ID
        const urlMap: Record<string, string> = {
            featured: `${baseUrl}/doc-truyen`,
            hot: `${baseUrl}/doc-truyen`,
            new_updated: `${baseUrl}/truyen-moi-cap-nhat`,
            favorite: `${baseUrl}/truyen-yeu-thich`,
            new_added: `${baseUrl}/truyen-tranh-moi`,
            full: `${baseUrl}/truyen-hoan-thanh`,
        };

        // 2. Emit tất cả section rỗng ngay lập tức để UI dựng Skeleton Layout
        for (const section of sections) {
            sectionCallback(section);
        }

        // Map quản lý Promise theo URL để tránh gửi trùng HTTP request
        const urlPromiseMap = new Map<string, Promise<CheerioAPI>>();

        // 3. Request song song toàn bộ các section
        const sectionParsers: Record<string, ($: CheerioAPI) => PartialSourceManga[]> = {
            featured: ($) => this.parser.parseFeaturedSection($),
            hot: ($) => this.parser.parseHotSection($),
        };

        const fetchPromises = sections.map(async (section) => {
            const url = urlMap[section.id];
            if (!url) return;

            try {
                // Nếu URL này chưa có request nào đang chạy, tạo Promise mới và lưu vào Map
                if (!urlPromiseMap.has(url)) {
                    urlPromiseMap.set(url, this.DOMHTML(url));
                }

                // Dùng chung kết quả $ từ Promise duy nhất của URL đó
                const $ = await urlPromiseMap.get(url)!;

                const parseFn = sectionParsers[section.id] ?? (($) => this.parser.parseSearchResults($));
                section.items = parseFn($);

                sectionCallback(section);
            } catch (error) {
                console.error(`Failed to load section [${section.id}]:`, error);
            }
        });

        await Promise.allSettled(fetchPromises);
    }

    // 1. Thêm Map cache vào class
    private pageCache = new Map<string, { promise: Promise<CheerioAPI>; timestamp: number }>();

    // 2. Helper fetch HTML dùng chung có caching
    private async fetchMangaPage(mangaId: string): Promise<CheerioAPI> {
        const now = Date.now();
        const cached = this.pageCache.get(mangaId);

        // Giữ cache trong 10 giây để phục vụ các hàm gọi song song
        if (cached && now - cached.timestamp < 10000) {
            return cached.promise;
        }

        const baseUrl = await this.getBaseUrl();
        const promise = this.DOMHTML(`${baseUrl}/truyen-tranh/${mangaId}`);

        this.pageCache.set(mangaId, { promise, timestamp: now });
        return promise;
    }

    async getMangaDetails(mangaId: string): Promise<SourceManga> {
        const $ = await this.fetchMangaPage(mangaId);
        return this.parser.parseMangaDetails($, mangaId);
    }

    async getChapters(mangaId: string): Promise<Chapter[]> {
        const $ = await this.fetchMangaPage(mangaId);
        return this.parser.parseChapterList($);
    }

    async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        const baseUrl = await this.getBaseUrl();
        const $ = await this.DOMHTML(`${baseUrl}/truyen-tranh/${chapterId}`);
        const pages = this.parser.parseChapterDetails($);
        return App.createChapterDetails({
            id: chapterId,
            mangaId: mangaId,
            pages: pages,
        });
    }

    async supportsTagExclusion(): Promise<boolean> {
        return true;
    }

    async getSearchResults(query: SearchRequest, metadata: any): Promise<PagedResults> {
        const baseUrl = await this.getBaseUrl();
        const page = metadata?.page ?? 1;

        const search = {
            genres: '',
            exgenres: '',
            country: '0',
            status: '-1',
            minchapter: '0',
            sort: '0',
        };

        let rankingPath: string | undefined;

        // 1. Xử lý Excluded Tags
        const extags = query.excludedTags?.map((tag) => tag.id) ?? [];
        const exgenres: string[] = [];
        for (const value of extags) {
            if (value.indexOf('.') === -1) {
                exgenres.push(value);
            }
        }

        // 2. Xử lý Included Tags
        const tags = query.includedTags?.map((tag) => tag.id) ?? [];
        const genres: string[] = [];
        for (const value of tags) {
            if (value.indexOf('.') === -1) {
                genres.push(value);
            } else {
                const [key, val] = value.split('.');
                switch (key) {
                    case 'ranking':
                        rankingPath = val;
                        break;
                    case 'minchapter':
                        search.minchapter = String(val);
                        break;
                    case 'country':
                        search.country = String(val);
                        break;
                    case 'sort':
                        search.sort = String(val);
                        break;
                    case 'status':
                        search.status = String(val);
                        break;
                }
            }
        }

        search.genres = genres.join(',');
        search.exgenres = exgenres.join(',');

        let url = '';
        let param = '';

        if (rankingPath) {
            url = `${baseUrl}/${rankingPath}/trang-${page}`;
        } else {
            const paramExgenres = search.exgenres ? `&notcategory=${search.exgenres}` : '';
            url = `${baseUrl}/${query.title ? 'tim-kiem' : 'tim-kiem-nang-cao'}/trang-${page}`;
            param =
                `?q=${encodeURIComponent(query.title ?? '')}` +
                `&category=${search.genres}${paramExgenres}&country=${search.country}&status=${search.status}&minchapter=${search.minchapter}&sort=${search.sort}`;
        }

        console.log('Search URL:', url + param);
        const $ = await this.DOMHTML(url + param);
        const tiles = this.parser.parseSearchResults($);
        metadata = !isLastPage($) ? { page: page + 1 } : undefined;

        return App.createPagedResults({
            results: tiles,
            metadata,
        });
    }

    async getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults> {
        const baseUrl = await this.getBaseUrl();
        const page: number = metadata?.page ?? 1;
        let param = '';
        let url = '';

        switch (homepageSectionId) {
            case 'favorite':
                param = `trang-${page}`;
                url = `${baseUrl}/truyen-yeu-thich/`;
                break;
            case 'new_updated':
                param = `trang-${page}`;
                url = `${baseUrl}/truyen-moi-cap-nhat/`;
                break;
            case 'new_added':
                param = `trang-${page}`;
                url = `${baseUrl}/truyen-tranh-moi/`;
                break;
            case 'full':
                param = `trang-${page}?status=2`;
                url = `${baseUrl}/truyen-hoan-thanh/`;
                break;
            default:
                throw new Error("Requested to getViewMoreItems for a section ID which doesn't exist");
        }

        const request = App.createRequest({
            url,
            method: 'GET',
            param,
        });

        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data as string);

        const manga = this.parser.parseSearchResults($);
        metadata = isLastPage($) ? undefined : { page: page + 1 };

        return App.createPagedResults({
            results: manga,
            metadata,
        });
    }

    async CloudFlareError(status: number): Promise<void> {
        if (status === 503 || status === 403) {
            const baseUrl = await this.getBaseUrl();
            throw new Error(`CLOUDFLARE BYPASS ERROR:\nPlease go to home page ${TruyenQQ.name} source (${baseUrl}) and press the cloud icon.`);
        }
    }

    async getCloudflareBypassRequestAsync(): Promise<Request> {
        const baseUrl = await this.getBaseUrl();
        return App.createRequest({
            url: `${baseUrl}/`,
            method: 'GET',
            headers: {
                referer: `${baseUrl}/`,
                origin: `${baseUrl}/`,
                'user-agent': await this.requestManager.getDefaultUserAgent(),
            },
        });
    }

    async getSourceMenu(): Promise<DUISection> {
        return App.createDUISection({
            id: 'main',
            header: 'Cài đặt Nguồn Truyện',
            rows: async () => [domainSettings(this.stateManager), resetSettings(this.stateManager)],
            isHidden: false,
        });
    }
}
