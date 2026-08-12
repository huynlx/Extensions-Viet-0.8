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

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

export class MiMiHentai implements SearchResultsProviding, MangaProviding, ChapterProviding, HomePageSectionsProviding {
    constructor(private cheerio: CheerioAPI) {}

    stateManager = App.createSourceStateManager();
    parser = new Parser();

    private cache = new Map<string, CacheEntry<any>>();
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 phút mặc định
    private readonly TAGS_CACHE_TTL = 24 * 60 * 60 * 1000; // 1 ngày cho tags
    private readonly MANGA_DETAIL_CACHE_TTL = 24 * 60 * 60 * 1000; // 1 ngày cho manga details
    private readonly CHAPTER_DETAIL_CACHE_TTL = 24 * 60 * 60 * 1000; // 1 ngày cho chapter details

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

    private async DOMHTML(url: string, param?: any): Promise<CheerioAPI> {
        const cacheKey = `dom-${url}-${JSON.stringify(param ?? '')}`;
        const now = Date.now();
        const cached = this.cache.get(cacheKey);

        if (cached && now - cached.timestamp < this.CACHE_TTL) {
            return cached.data;
        }

        const request = App.createRequest({
            url: url,
            method: 'GET',
        });
        const response = await this.requestManager.schedule(request, 1);
        this.CloudFlareError(response.status);

        const $ = this.cheerio.load(response.data as string);
        this.cache.set(cacheKey, { data: $, timestamp: now });
        return $;
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
        const cacheKey = 'search-tags';
        const now = Date.now();
        const cached = this.cache.get(cacheKey);

        if (cached && now - cached.timestamp < this.TAGS_CACHE_TTL) {
            return cached.data;
        }

        const baseUrl = await this.getBaseUrl();

        // Tải song song HTML từ trang thể loại và trang chủ
        const [$genres, $home] = await Promise.all([this.DOMHTML(`${baseUrl}/genres`), this.DOMHTML(`${baseUrl}`)]);

        const tags = this.parser.parseTags($genres, $home);
        this.cache.set(cacheKey, { data: tags, timestamp: now });
        return tags;
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

        const viewsSection = App.createHomeSection({
            id: 'views',
            title: 'TRUYỆN XEM NHIỀU',
            containsMoreItems: true,
            type: HomeSectionType.singleRowNormal,
        });

        // 2. Callback khung rỗng ngay lập tức
        sectionCallback(featuredSection);
        sectionCallback(staffPickSection);
        sectionCallback(newUpdatedSection);
        sectionCallback(viewsSection);
        sectionCallback(randomSection);
        sectionCallback(newReupSection);

        // 3. Xử lý bất đồng bộ độc lập

        // Nguồn 1: Truyện đề cử (Top)
        const fetchHome = (async () => {
            const url = `${baseUrl}/api/manga/top`;
            const cacheKey = `api-${url}`;
            const now = Date.now();
            const cached = this.cache.get(cacheKey);

            let json: any;
            if (cached && now - cached.timestamp < this.CACHE_TTL) {
                json = cached.data;
            } else {
                const request = App.createRequest({
                    url: url,
                    method: 'GET',
                    headers: {
                        Referer: `${baseUrl}/`,
                    },
                });

                const response = await this.requestManager.schedule(request, 1);
                json = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
                this.cache.set(cacheKey, { data: json, timestamp: now });
            }

            featuredSection.items = this.parser.parseFeaturedSection(json);
            sectionCallback(featuredSection);
        })();

        // Nguồn 2: Lựa Chọn Từ Staff
        const fetchStaffPick = (async () => {
            const url = `${baseUrl}/api/manga/staff-picks?limit=10`;
            const cacheKey = `api-${url}`;
            const now = Date.now();
            const cached = this.cache.get(cacheKey);

            let json: any;
            if (cached && now - cached.timestamp < this.CACHE_TTL) {
                json = cached.data;
            } else {
                const request = App.createRequest({
                    url: url,
                    method: 'GET',
                    headers: {
                        Referer: `${baseUrl}/`,
                    },
                });

                const response = await this.requestManager.schedule(request, 1);
                json = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
                this.cache.set(cacheKey, { data: json, timestamp: now });
            }

            staffPickSection.items = this.parser.parseStaffPickSection(json);
            sectionCallback(staffPickSection);
        })();

        // Nguồn 3: Truyện mới nhất (Tự động loại trừ genre=196)
        const fetchNewUpdated = (async () => {
            const url = `${baseUrl}/api/manga?sort=updated_at&exclude_genre=196&page=1&page_size=45&allow_reup=false`;
            const cacheKey = `api-${url}`;
            const now = Date.now();
            const cached = this.cache.get(cacheKey);

            let json: any;
            if (cached && now - cached.timestamp < this.CACHE_TTL) {
                json = cached.data;
            } else {
                const request = App.createRequest({
                    url: url,
                    method: 'GET',
                    headers: {
                        Referer: `${baseUrl}/lib`,
                    },
                });

                const response = await this.requestManager.schedule(request, 1);
                json = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
                this.cache.set(cacheKey, { data: json, timestamp: now });
            }

            newUpdatedSection.items = this.parser.parseNewUpdatedSection(json);
            sectionCallback(newUpdatedSection);
        })();

        // Nguồn 4: Xem Nhiều
        const fetchViews = (async () => {
            const url = `${baseUrl}/api/manga?sort=views&exclude_genre=196&page=1&page_size=45`;
            const cacheKey = `api-${url}`;
            const now = Date.now();
            const cached = this.cache.get(cacheKey);

            let json: any;
            if (cached && now - cached.timestamp < this.CACHE_TTL) {
                json = cached.data;
            } else {
                const request = App.createRequest({
                    url: url,
                    method: 'GET',
                    headers: {
                        Referer: `${baseUrl}/lib`,
                    },
                });

                const response = await this.requestManager.schedule(request, 1);
                json = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
                this.cache.set(cacheKey, { data: json, timestamp: now });
            }

            viewsSection.items = this.parser.parseSearchResults(json);
            sectionCallback(viewsSection);
        })();

        // Nguồn 5: Hôm Nay Đọc Gì? (Random 10 truyện)
        const fetchRandom = (async () => {
            const timestamp = Date.now();
            const url = `${baseUrl}/api/manga/random?limit=10&_t=${timestamp}`;
            const request = App.createRequest({
                url: url,
                method: 'GET',
                headers: {
                    Referer: `${baseUrl}/`,
                },
            });

            const response = await this.requestManager.schedule(request, 1);
            const json = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;

            randomSection.items = this.parser.parseRandomSection(json);
            sectionCallback(randomSection);
        })();

        // Nguồn 6: Truyện Reup Mới
        const fetchNewReup = (async () => {
            const url = `${baseUrl}/api/manga?sort=updated_at&exclude_genre=196&page=1&page_size=45&reup_only=true`;
            const cacheKey = `api-${url}`;
            const now = Date.now();
            const cached = this.cache.get(cacheKey);

            let json: any;
            if (cached && now - cached.timestamp < this.CACHE_TTL) {
                json = cached.data;
            } else {
                const request = App.createRequest({
                    url: url,
                    method: 'GET',
                    headers: {
                        Referer: `${baseUrl}/lib`,
                    },
                });

                const response = await this.requestManager.schedule(request, 1);
                json = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
                this.cache.set(cacheKey, { data: json, timestamp: now });
            }

            newReupSection.items = this.parser.parseNewReupSection(json);
            sectionCallback(newReupSection);
        })();

        // Đợi tất cả request hoàn thành
        await Promise.allSettled([fetchHome, fetchStaffPick, fetchNewUpdated, fetchViews, fetchRandom, fetchNewReup]);
    }

    private async fetchMangaPageCached(mangaId: string): Promise<CheerioAPI> {
        const cacheKey = `manga-page-${mangaId}`;
        const now = Date.now();
        const cached = this.cache.get(cacheKey);

        if (cached && now - cached.timestamp < this.MANGA_DETAIL_CACHE_TTL) {
            return cached.data;
        }

        const baseUrl = await this.getBaseUrl();
        const $ = await this.DOMHTML(`${baseUrl}/manga/${mangaId}`);

        this.cache.set(cacheKey, { data: $, timestamp: now });
        return $;
    }

    async getMangaDetails(mangaId: string): Promise<SourceManga> {
        const $ = await this.fetchMangaPageCached(mangaId);
        return this.parser.parseMangaDetails($, mangaId);
    }

    async getChapters(mangaId: string): Promise<Chapter[]> {
        const cacheKey = `chapters-${mangaId}`;
        const now = Date.now();
        const cached = this.cache.get(cacheKey);

        if (cached && now - cached.timestamp < this.MANGA_DETAIL_CACHE_TTL) {
            return cached.data;
        }

        const $ = await this.fetchMangaPageCached(mangaId);
        const chapters = this.parser.parseChapterList($);

        this.cache.set(cacheKey, { data: chapters, timestamp: now });
        return chapters;
    }

    async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        const cacheKey = `chapter-details-${chapterId}`;
        const now = Date.now();
        const cached = this.cache.get(cacheKey);

        let pages: string[];
        if (cached && now - cached.timestamp < this.CHAPTER_DETAIL_CACHE_TTL) {
            pages = cached.data;
        } else {
            const baseUrl = await this.getBaseUrl();
            const $ = await this.DOMHTML(`${baseUrl}/manga/${chapterId}`);
            pages = this.parser.parseChapterDetails($);
            this.cache.set(cacheKey, { data: pages, timestamp: now });
        }

        return App.createChapterDetails({
            id: chapterId,
            mangaId: mangaId,
            pages: pages,
        });
    }

    async getSearchResults(query: SearchRequest, metadata: any): Promise<PagedResults> {
        const baseUrl = await this.getBaseUrl();
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
        let endpoint = '';
        const params: string[] = [];

        if (albumId) {
            endpoint = `/api/albums/${albumId}/manga`;
            if (sortParam) params.push(`sort=${sortParam}`);
        } else if (parodyId) {
            endpoint = `/api/manga/by-parody/${parodyId}`;
            if (sortParam) params.push(`sort=${sortParam}`);
        } else if (characterId) {
            endpoint = `/api/manga/by-character/${characterId}`;
            if (sortParam) params.push(`sort=${sortParam}`);
        } else if (query.title?.trim() && genreIds.length === 0) {
            endpoint = '/api/manga/search';
            params.push(`q=${encodeURIComponent(query.title.trim())}`);
            if (sortParam) params.push(`sort=${sortParam}`);
        } else if (genreIds.length === 1 && !query.title?.trim()) {
            endpoint = `/api/manga/by-genre/${genreIds[0]}`;
            if (sortParam) params.push(`sort=${sortParam}`);
        } else if (genreIds.length > 0) {
            endpoint = '/api/manga/advanced-search';
            if (query.title?.trim()) {
                params.push(`title=${encodeURIComponent(query.title.trim())}`);
            }
            params.push(`genre=${genreIds.join(',')}`);
            if (sortParam) params.push(`sort=${sortParam}`);
        } else {
            endpoint = '/api/manga';
            if (sortParam) params.push(`sort=${sortParam}`);
        }

        params.push(`page=${page}`);
        params.push(`page_size=${pageSize}`);
        params.push('exclude_genre=196');

        const fullUrl = `${baseUrl}${endpoint}?${params.join('&')}`;

        const cacheKey = `api-${fullUrl}`;
        const now = Date.now();
        const cached = this.cache.get(cacheKey);

        let json: any;
        if (cached && now - cached.timestamp < this.CACHE_TTL) {
            json = cached.data;
        } else {
            const request = App.createRequest({
                url: fullUrl,
                method: 'GET',
                headers: {
                    accept: '*/*',
                    Referer: `${baseUrl}/search`,
                },
            });

            const response = await this.requestManager.schedule(request, 1);
            json = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
            this.cache.set(cacheKey, { data: json, timestamp: now });
        }

        const manga = this.parser.parseSearchResults(json);
        const hasNextPage = true;

        return App.createPagedResults({
            results: manga,
            metadata: hasNextPage ? { page: page + 1 } : undefined,
        });
    }

    async getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults> {
        const baseUrl = await this.getBaseUrl();
        const page: number = metadata?.page ?? 1;
        const pageSize = 45;

        let apiUrl = '';
        let manga: PartialSourceManga[] = [];

        if (homepageSectionId === 'new_updated') {
            apiUrl = `${baseUrl}/api/manga?sort=updated_at&exclude_genre=196&page=${page}&page_size=${pageSize}&allow_reup=false`;
        } else if (homepageSectionId === 'new_reup') {
            apiUrl = `${baseUrl}/api/manga?sort=updated_at&exclude_genre=196&page=${page}&page_size=${pageSize}&reup_only=true`;
        } else {
            const sortMapping: Record<string, string> = {
                views: 'views',
            };

            const sortParam = sortMapping[homepageSectionId];

            if (!sortParam) {
                throw new Error(`Invalid homepage section ID: ${homepageSectionId}`);
            }

            apiUrl = `${baseUrl}/api/manga?sort=${sortParam}&exclude_genre=196&page=${page}&page_size=${pageSize}`;
        }

        const cacheKey = `api-${apiUrl}`;
        const now = Date.now();
        const cached = this.cache.get(cacheKey);

        let json: any;
        if (cached && now - cached.timestamp < this.CACHE_TTL) {
            json = cached.data;
        } else {
            const request = App.createRequest({
                url: apiUrl,
                method: 'GET',
                headers: {
                    Referer: `${baseUrl}/lib`,
                },
            });

            const response = await this.requestManager.schedule(request, 1);
            json = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
            this.cache.set(cacheKey, { data: json, timestamp: now });
        }

        if (homepageSectionId === 'new_reup') {
            manga = this.parser.parseNewReupSection(json);
        } else {
            manga = this.parser.parseNewUpdatedSection(json);
        }

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
