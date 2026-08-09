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
import { Parser } from './MiMiHentaiParser';
import { domainSettings, getDomain, resetSettings } from './MiMiHentaiSetting';

const DOMAIN = 'https://mimihentai.moe';

export const MiMiHentaiInfo: SourceInfo = {
    version: '1.0.0',
    name: 'MiMiHentai',
    icon: 'icon.png',
    author: 'Lê Đại Thiện Nhân',
    authorWebsite: 'https://github.com/huynlx/',
    description: 'Extension that pulls manga from MiMiHentai.',
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

export class MiMiHentai implements SearchResultsProviding, MangaProviding, ChapterProviding, HomePageSectionsProviding {
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

        // Tải song song HTML từ trang thể loại và trang chủ
        const [$genres, $home] = await Promise.all([this.DOMHTML(`${baseUrl}/genres`), this.DOMHTML(`${baseUrl}`)]);

        return this.parser.parseTags($genres, $home);
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

        const staffPickSection = App.createHomeSection({
            id: 'staff_pick',
            title: 'LỰA CHỌN TỪ STAFF',
            containsMoreItems: false,
            type: HomeSectionType.singleRowLarge,
        });

        const randomSection = App.createHomeSection({
            id: 'random',
            title: 'HÔM NAY ĐỌC GÌ?',
            containsMoreItems: false,
            type: HomeSectionType.singleRowNormal,
        });

        const newUpdatedSection = App.createHomeSection({
            id: 'new_updated',
            title: 'TRUYỆN MỚI CẬP NHẬT',
            containsMoreItems: true,
            type: HomeSectionType.singleRowNormal,
        });

        const newReupSection = App.createHomeSection({
            id: 'new_reup',
            title: 'TRUYỆN REUP MỚI',
            containsMoreItems: true,
            type: HomeSectionType.singleRowNormal,
        });

        // 2. Callback khung rỗng ngay lập tức
        sectionCallback(featuredSection);
        sectionCallback(staffPickSection);
        sectionCallback(newUpdatedSection);
        sectionCallback(newReupSection);
        sectionCallback(randomSection);

        // 3. Xử lý bất đồng bộ độc lập

        // Nguồn 1: Truyện đề cử (Top)
        const fetchHome = (async () => {
            const request = App.createRequest({
                url: 'https://mimihentai.moe/api/manga/top',
                method: 'GET',
                headers: {
                    Referer: 'https://mimihentai.moe/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',
                },
            });

            const response = await this.requestManager.schedule(request, 1);
            const json = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;

            featuredSection.items = this.parser.parseFeaturedSection(json);
            sectionCallback(featuredSection);
        })();

        // Nguồn 2: Lựa Chọn Từ Staff
        const fetchStaffPick = (async () => {
            const apiUrl = 'https://mimihentai.moe/api/manga/staff-picks?limit=10';
            const request = App.createRequest({
                url: apiUrl,
                method: 'GET',
                headers: {
                    Referer: 'https://mimihentai.moe/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',
                },
            });

            const response = await this.requestManager.schedule(request, 1);
            const json = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;

            staffPickSection.items = this.parser.parseStaffPickSection(json);
            sectionCallback(staffPickSection);
        })();

        // Nguồn 3: Truyện mới nhất (Tự động loại trừ genre=196)
        const fetchNewUpdated = (async () => {
            const apiUrl = 'https://mimihentai.moe/api/manga?sort=updated_at&exclude_genre=196&page=1&page_size=45&allow_reup=false';
            const request = App.createRequest({
                url: apiUrl,
                method: 'GET',
                headers: {
                    Referer: 'https://mimihentai.moe/lib',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',
                },
            });

            const response = await this.requestManager.schedule(request, 1);
            const json = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;

            newUpdatedSection.items = this.parser.parseNewUpdatedSection(json);
            sectionCallback(newUpdatedSection);
        })();

        // Nguồn 4: Truyện Reup Mới (Tự động bao gồm genre=196)
        const fetchNewReup = (async () => {
            const apiUrl = 'https://mimihentai.moe/api/manga?sort=updated_at&exclude_genre=196&page=1&page_size=45&reup_only=true';
            const request = App.createRequest({
                url: apiUrl,
                method: 'GET',
                headers: {
                    Referer: 'https://mimihentai.moe/lib',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',
                },
            });

            const response = await this.requestManager.schedule(request, 1);
            const json = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;

            newReupSection.items = this.parser.parseNewReupSection(json);
            sectionCallback(newReupSection);
        })();

        // Nguồn 5: Hôm Nay Đọc Gì? (Random 10 truyện)
        const fetchRandom = (async () => {
            const timestamp = Date.now();
            const request = App.createRequest({
                url: `https://mimihentai.moe/api/manga/random?limit=10&_t=${timestamp}`,
                method: 'GET',
                headers: {
                    Referer: 'https://mimihentai.moe/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',
                },
            });

            const response = await this.requestManager.schedule(request, 1);
            const json = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;

            randomSection.items = this.parser.parseRandomSection(json);

            sectionCallback(randomSection);
        })();

        // Đợi tất cả request hoàn thành
        await Promise.allSettled([fetchHome, fetchStaffPick, fetchNewUpdated, fetchNewReup, fetchRandom]);
    }

    // Cache lưu Promise HTML theo mangaId
    private pageCache = new Map<string, { promise: Promise<CheerioAPI>; timestamp: number }>();

    private async fetchMangaPage(mangaId: string): Promise<CheerioAPI> {
        const now = Date.now();
        const cached = this.pageCache.get(mangaId);

        // Giữ cache trong 10 giây
        if (cached && now - cached.timestamp < 10000) {
            return cached.promise;
        }

        const baseUrl = await this.getBaseUrl();
        const promise = this.DOMHTML(`${baseUrl}/manga/${mangaId}`);

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
        const $ = await this.DOMHTML(`${baseUrl}/manga/${chapterId}`);
        const pages = this.parser.parseChapterDetails($);
        return App.createChapterDetails({
            id: chapterId,
            mangaId: mangaId,
            pages: pages,
        });
    }

    async getSearchResults(query: SearchRequest, metadata: any): Promise<PagedResults> {
        const page: number = metadata?.page ?? 1;
        const pageSize = 45;

        const genreIds: string[] = [];
        let albumId = '';
        let parodyId = '';
        let characterId = '';
        let sortParam = 'updated_at';

        // 1. Phân loại tất cả các loại Tags được truyền vào từ query
        if (query.includedTags && query.includedTags.length > 0) {
            for (const tag of query.includedTags) {
                const tagId = tag.id;

                if (!tagId || tagId === 'all') continue;

                if (tagId.startsWith('album-')) {
                    albumId = tagId.replace('album-', '');
                } else if (tagId.startsWith('sort-')) {
                    sortParam = tagId.replace('sort-', '');
                } else if (tagId.startsWith('sort=')) {
                    sortParam = tagId.replace('sort=', '');
                } else if (tagId.startsWith('parody-')) {
                    parodyId = tagId.replace('parody-', '');
                } else if (tagId.startsWith('character-')) {
                    characterId = tagId.replace('character-', '');
                } else if (tagId.startsWith('genre-')) {
                    genreIds.push(tagId.replace('genre-', ''));
                } else {
                    genreIds.push(tagId);
                }
            }
        }

        // 2. Định tuyến Endpoint và Tham số API tương ứng
        let apiUrl = '';
        const params: string[] = [];

        if (albumId) {
            // Lấy truyện theo Album
            apiUrl = `https://mimihentai.moe/api/albums/${albumId}/manga`;
            if (sortParam) params.push(`sort=${sortParam}`);
        } else if (parodyId) {
            // Lấy truyện theo Parody
            apiUrl = `https://mimihentai.moe/api/manga/by-parody/${parodyId}`;
            if (sortParam) params.push(`sort=${sortParam}`);
        } else if (characterId) {
            // Lấy truyện theo Nhân vật
            apiUrl = `https://mimihentai.moe/api/manga/by-character/${characterId}`;
            if (sortParam) params.push(`sort=${sortParam}`);
        } else if (query.title?.trim() && genreIds.length === 0) {
            // Chỉ có TỪ KHÓA (không chọn thể loại) -> dùng /api/manga/search với tham số `q`
            apiUrl = 'https://mimihentai.moe/api/manga/search';
            params.push(`q=${encodeURIComponent(query.title.trim())}`);
            if (sortParam) {
                params.push(`sort=${sortParam}`);
            }
        } else if (genreIds.length === 1 && !query.title?.trim()) {
            // Chỉ chọn 1 THỂ LOẠI (không có từ khóa) -> dùng /api/manga/by-genre/{id}
            apiUrl = `https://mimihentai.moe/api/manga/by-genre/${genreIds[0]}`;
            if (sortParam) {
                params.push(`sort=${sortParam}`);
            }
        } else if (genreIds.length > 0) {
            // Tìm kiếm NÂNG CAO (vừa có từ khóa vừa chọn thể loại, hoặc chọn nhiều thể loại)
            apiUrl = 'https://mimihentai.moe/api/manga/advanced-search';

            if (query.title?.trim()) {
                params.push(`title=${encodeURIComponent(query.title.trim())}`);
            }
            params.push(`genre=${genreIds.join(',')}`);
            if (sortParam) {
                params.push(`sort=${sortParam}`);
            }
        } else {
            // Sắp xếp danh mục chung (Mới cập nhật, A-Z, Xem nhiều, Theo dõi, Thích)
            apiUrl = 'https://mimihentai.moe/api/manga';
            if (sortParam) {
                params.push(`sort=${sortParam}`);
            }
        }

        // Các tham số chung
        params.push(`page=${page}`);
        params.push(`page_size=${pageSize}`);
        params.push('exclude_genre=196');

        const fullUrl = `${apiUrl}?${params.join('&')}`;

        // 3. Thực hiện Request API
        const request = App.createRequest({
            url: fullUrl,
            method: 'GET',
            headers: {
                accept: '*/*',
                Referer: 'https://mimihentai.moe/search',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',
            },
        });

        const response = await this.requestManager.schedule(request, 1);
        const json = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;

        // 4. Parse kết quả danh sách truyện
        const manga = this.parser.parseSearchResults(json);
        const hasNextPage = true;

        return App.createPagedResults({
            results: manga,
            metadata: hasNextPage ? { page: page + 1 } : undefined,
        });
    }

    async getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults> {
        const page: number = metadata?.page ?? 1;
        const pageSize = 45;

        let apiUrl = '';
        let manga: PartialSourceManga[] = [];

        // 1. Phân nhánh tạo API URL kèm exclude_genre / include_genre
        if (homepageSectionId === 'new_updated') {
            apiUrl = `https://mimihentai.moe/api/manga?sort=updated_at&exclude_genre=196&page=${page}&page_size=${pageSize}&allow_reup=false`;
        } else if (homepageSectionId === 'new_reup') {
            apiUrl = `https://mimihentai.moe/api/manga?sort=updated_at&exclude_genre=196&page=${page}&page_size=${pageSize}&reup_only=true`;
        } else {
            const sortMapping: Record<string, string> = {
                hot: '-view',
                old: 'created_at',
                bad: 'view',
            };

            const sortParam = sortMapping[homepageSectionId];

            if (!sortParam) {
                throw new Error(`Invalid homepage section ID: ${homepageSectionId}`);
            }

            apiUrl = `https://mimihentai.moe/api/manga?sort=${sortParam}&exclude_genre=196&page=${page}&page_size=${pageSize}`;
        }

        // 2. Gửi request
        const request = App.createRequest({
            url: apiUrl,
            method: 'GET',
            headers: {
                Referer: 'https://mimihentai.moe/lib',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',
            },
        });

        const response = await this.requestManager.schedule(request, 1);
        const json = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;

        // 3. Phân nhánh Parser tương ứng cho từng section
        if (homepageSectionId === 'new_reup') {
            manga = this.parser.parseNewReupSection(json);
        } else {
            manga = this.parser.parseNewUpdatedSection(json);
        }

        // 4. Kiểm tra trang tiếp theo
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
