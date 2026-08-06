import {
    BadgeColor,
    Chapter,
    ChapterDetails,
    ChapterProviding,
    ContentRating,
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

const DOMAIN = 'https://truyenqqko.com/';

export const TruyenQQInfo: SourceInfo = {
    version: '1.0.0',
    name: 'TruyenQQ',
    icon: 'icon.png',
    author: 'Lê Đại Thiện Nhân',
    authorWebsite: 'https://github.com/huynlx/',
    description: 'Extension that pulls manga from TruyenQQ.',
    contentRating: ContentRating.EVERYONE,
    websiteBaseURL: DOMAIN,
    sourceTags: [
        {
            text: 'Vietnamese',
            type: BadgeColor.BLUE,
        },
    ],
    intents: SourceIntents.MANGA_CHAPTERS | SourceIntents.HOMEPAGE_SECTIONS | SourceIntents.CLOUDFLARE_BYPASS_REQUIRED,
};

export class TruyenQQ implements SearchResultsProviding, MangaProviding, ChapterProviding, HomePageSectionsProviding {
    constructor(private cheerio: CheerioAPI) {}

    readonly requestManager = App.createRequestManager({
        requestsPerSecond: 2,
        requestTimeout: 50000,
        interceptor: {
            interceptRequest: async (request: Request): Promise<Request> => {
                request.headers = {
                    ...(request.headers ?? {}),
                    ...{
                        referer: DOMAIN,
                        'user-agent': await this.requestManager.getDefaultUserAgent(),
                        // 'user-agent': 'a',
                    },
                };
                return request;
            },
            interceptResponse: async (response: Response): Promise<Response> => {
                return response;
            },
        },
    });

    getMangaShareUrl(mangaId: string): string {
        return `${DOMAIN}truyen-tranh/${mangaId}`;
    }

    parser = new Parser();

    private async DOMHTML(url: string): Promise<CheerioAPI> {
        const request = App.createRequest({
            url: url,
            method: 'GET',
        });
        const response = await this.requestManager.schedule(request, 1);
        this.CloudFlareError(response.status);
        return this.cheerio.load(response.data as string);
    }

    async getSearchTags(): Promise<TagSection[]> {
        const url = `${DOMAIN}tim-kiem-nang-cao`;
        const $ = await this.DOMHTML(url);
        return this.parser.parseTags($);
    }

    async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
        // 1. Khởi tạo danh sách Sections
        const sections: HomeSection[] = [
            App.createHomeSection({ id: 'featured', title: 'Truyện Đề Cử', containsMoreItems: false, type: HomeSectionType.featured }),
            App.createHomeSection({ id: 'hot', title: 'Độc Quyền Truyện QQ', containsMoreItems: false, type: HomeSectionType.singleRowLarge }),
            App.createHomeSection({ id: 'new_updated', title: 'Truyện Mới Cập Nhật', containsMoreItems: true, type: HomeSectionType.singleRowNormal }),
            App.createHomeSection({ id: 'favorite', title: 'Truyện Yêu Thích', containsMoreItems: true, type: HomeSectionType.singleRowNormal }),
            App.createHomeSection({ id: 'new_added', title: 'Truyện Mới Thêm Gần Đây', containsMoreItems: true, type: HomeSectionType.singleRowNormal }),
            App.createHomeSection({ id: 'full', title: 'Truyện Đã Hoàn Thành', containsMoreItems: true, type: HomeSectionType.singleRowNormal }),
        ];

        // Map URL tương ứng cho từng Section ID
        const urlMap: Record<string, string> = {
            featured: `${DOMAIN}doc-truyen`,
            hot: `${DOMAIN}doc-truyen`,
            new_updated: `${DOMAIN}truyen-moi-cap-nhat`,
            favorite: `${DOMAIN}truyen-yeu-thich`,
            new_added: `${DOMAIN}truyen-tranh-moi`,
            full: `${DOMAIN}truyen-hoan-thanh`,
        };

        // 2. Emit tất cả section rỗng ngay lập tức để UI dựng Skeleton Layout
        for (const section of sections) {
            sectionCallback(section);
        }

        // 3. Request song song toàn bộ các section
        // Khai báo parser map bên ngoài hoặc ở đầu class/method
        const sectionParsers: Record<string, ($: CheerioAPI) => PartialSourceManga[]> = {
            featured: ($) => this.parser.parseFeaturedSection($),
            hot: ($) => this.parser.parseHotSection($),
        };

        // Viết lại hàm fetchPromises
        const fetchPromises = sections.map(async (section) => {
            const url = urlMap[section.id];
            if (!url) return;

            try {
                const $ = await this.DOMHTML(url);

                // Lấy hàm parse tương ứng từ map, nếu không có thì fallback về parseSearchResults
                const parseFn = sectionParsers[section.id] ?? (($) => this.parser.parseSearchResults($));
                section.items = parseFn($);

                // Emit dữ liệu ngay khi hoàn thành section
                sectionCallback(section);
            } catch (error) {
                console.error(`Failed to load section [${section.id}]:`, error);
            }
        });

        // Chờ toàn bộ requests hoàn tất
        await Promise.allSettled(fetchPromises);
    }

    async getMangaDetails(mangaId: string): Promise<SourceManga> {
        const $ = await this.DOMHTML(`${DOMAIN}truyen-tranh/${mangaId}`);
        return this.parser.parseMangaDetails($, mangaId);
    }

    async getChapters(mangaId: string): Promise<Chapter[]> {
        const $ = await this.DOMHTML(`${DOMAIN}truyen-tranh/${mangaId}`);
        return this.parser.parseChapterList($);
    }

    async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        const $ = await this.DOMHTML(`${DOMAIN}truyen-tranh/${chapterId}`);
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
        const page = metadata?.page ?? 1;

        const search = {
            genres: '',
            exgenres: '',
            country: '0',
            status: '-1',
            minchapter: '0',
            sort: '0',
        };

        const extags = query.excludedTags?.map((tag) => tag.id) ?? [];
        const exgenres: string[] = [];
        for (const value of extags) {
            if (value.indexOf('.') === -1) {
                exgenres.push(value);
            }
        }

        const tags = query.includedTags?.map((tag) => tag.id) ?? [];
        const genres: string[] = [];
        for (const value of tags) {
            if (value.indexOf('.') === -1) {
                genres.push(value);
            } else {
                const [key, val] = value.split('.');
                switch (key) {
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
        const paramExgenres = search.exgenres ? `&notcategory==${search.exgenres}` : '';

        const url = `${DOMAIN}${query.title ? 'tim-kiem' : 'tim-kiem-nang-cao'}/trang-${page}`;
        const param =
            `?q=${query.title?.replaceAll(' ', '%20') ?? ''}` +
            encodeURI(`&category=${search.genres}${paramExgenres}&country=${search.country}&status=${search.status}&minchapter=${search.minchapter}&sort=${search.sort}`);
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
        const page: number = metadata?.page ?? 1;
        let param = '';
        let url = '';

        switch (homepageSectionId) {
            case 'favorite':
                param = `trang-${page}`;
                url = `${DOMAIN}truyen-yeu-thich/`;
                break;
            case 'new_updated':
                param = `trang-${page}`;
                url = `${DOMAIN}truyen-moi-cap-nhat/`;
                break;
            case 'new_added':
                param = `trang-${page}`;
                url = `${DOMAIN}truyen-tranh-moi/`;
                break;
            case 'full':
                param = `trang-${page}?status=2`;
                url = `${DOMAIN}truyen-hoan-thanh/`;
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

    CloudFlareError(status: number): void {
        if (status == 503 || status == 403) {
            throw new Error(`CLOUDFLARE BYPASS ERROR:\nPlease go to home page ${TruyenQQ.name} source and press the cloud icon.`);
        }
    }

    async getCloudflareBypassRequestAsync(): Promise<Request> {
        return App.createRequest({
            url: DOMAIN,
            method: 'GET',
            headers: {
                referer: `${DOMAIN}/`,
                origin: `${DOMAIN}/`,
                'user-agent': await this.requestManager.getDefaultUserAgent(),
            },
        });
    }
}
