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
import { Parser } from './CuuTruyenParser';
import { domainSettings, getDomain, resetSettings } from './CuuTruyenSetting';

const DEFAULT_DOMAIN = 'https://cuutruyen.moe';

export const CuuTruyenInfo: SourceInfo = {
    version: '1.0.2',
    name: 'CuuTruyen',
    icon: 'icon.png',
    author: 'Lê Đại Thiện Nhân',
    authorWebsite: 'https://github.com/huynlx/',
    description: 'Extension that pulls manga from CuuTruyen.',
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

export class CuuTruyen implements SearchResultsProviding, MangaProviding, ChapterProviding, HomePageSectionsProviding {
    stateManager = App.createSourceStateManager();
    parser = new Parser();

    constructor(private cheerio: CheerioAPI) {}

    private async getBaseUrl(): Promise<string> {
        const domain = await getDomain(this.stateManager);
        return domain.replace(/\/+$/, '');
    }

    readonly requestManager = App.createRequestManager({
        requestsPerSecond: 1,
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

    async submitConfiguredPassword(html: string, currentUrl: string): Promise<boolean> {
        const wireDataMatch = html.match(/wire:initial-data="([^"]+)"/);
        const rawWireData = wireDataMatch?.[1];
        if (!rawWireData) return false;

        const rawJson = rawWireData
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>');

        let wireData: any;
        try {
            wireData = JSON.parse(rawJson);
        } catch {
            return false;
        }

        const fingerprint = wireData.fingerprint;
        const serverMemo = wireData.serverMemo;

        const csrfMatch = html.match(/livewire_token\s*=\s*'([^']+)'/) || html.match(/name="csrf-token"\s+content="([^"]+)"/);
        const csrfToken = csrfMatch?.[1] ?? '';

        if (!csrfToken) return false;

        const password = '5';
        const baseUrl = await this.getBaseUrl();

        const submitPayload = {
            fingerprint: fingerprint,
            serverMemo: serverMemo,
            updates: [
                {
                    type: 'syncInput',
                    payload: {
                        id: 's1',
                        name: 'password',
                        value: password,
                    },
                },
                {
                    type: 'callMethod',
                    payload: {
                        id: 'c1',
                        method: 'submit',
                        params: [],
                    },
                },
            ],
        };

        const submitReq = App.createRequest({
            url: `${baseUrl}/livewire/message/enter-secret`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken,
                'X-Livewire': 'true',
                Accept: 'text/html, application/xhtml+xml',
                Referer: currentUrl,
            },
            data: JSON.stringify(submitPayload),
        });

        const response = await this.requestManager.schedule(submitReq, 1);
        return response.status === 200;
    }

    async DOMHTML(url: string, param?: any): Promise<CheerioAPI> {
        const req = App.createRequest({
            url: url,
            method: 'GET',
            headers: {
                Referer: url,
            },
            param,
        });

        let res = await this.requestManager.schedule(req, 1);
        let html = (res.data as string) ?? '';

        if (html.includes('wire:initial-data') && html.includes('enter-secret')) {
            const success = await this.submitConfiguredPassword(html, url);

            if (success) {
                res = await this.requestManager.schedule(req, 1);
                html = (res.data as string) ?? '';
            }
        }

        return this.cheerio.load(html);
    }

    async getMangaShareUrl(mangaId: string): Promise<string> {
        const baseUrl = await this.getBaseUrl();
        return `${baseUrl}/truyen/${mangaId}`;
    }

    async getSearchTags(): Promise<TagSection[]> {
        return this.parser.parseTags();
    }

    // 🎯 TỐI ƯU: Đã gom request trùng giữa `featured` và `recommend`
    async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
        const baseUrl = await this.getBaseUrl();

        const sections = [
            App.createHomeSection({ id: 'featured', title: 'Truyện Hot', containsMoreItems: false, type: HomeSectionType.featured }),
            App.createHomeSection({ id: 'new_updated', title: 'Mới Cập Nhật', containsMoreItems: true, type: HomeSectionType.singleRowNormal }),
            App.createHomeSection({ id: 'recommend', title: 'Truyện Đề Cử', containsMoreItems: false, type: HomeSectionType.singleRowLarge }),
            App.createHomeSection({ id: 'favorite', title: 'Xem Nhiều', containsMoreItems: true, type: HomeSectionType.singleRowNormal }),
            App.createHomeSection({ id: 'new_added', title: 'Mới Nhất', containsMoreItems: true, type: HomeSectionType.singleRowNormal }),
        ];

        // Khai báo trước với UI
        for (const section of sections) {
            sectionCallback(section);
        }

        // Cache DOM tạm thời theo URL trong lần tải Trang chủ
        const domCache = new Map<string, Promise<CheerioAPI>>();
        const fetchCachedDOM = (url: string): Promise<CheerioAPI> => {
            if (!domCache.has(url)) {
                domCache.set(url, this.DOMHTML(url));
            }
            return domCache.get(url)!;
        };

        for (const section of sections) {
            let url: string;
            switch (section.id) {
                case 'featured':
                case 'recommend':
                    url = `${baseUrl}`;
                    break;
                case 'new_updated':
                    url = `${baseUrl}/tim-kiem?sort=-updated_at&page=1`;
                    break;
                case 'favorite':
                    url = `${baseUrl}/tim-kiem?sort=-views&page=1`;
                    break;
                case 'new_added':
                    url = `${baseUrl}/tim-kiem?sort=-created_at&page=1`;
                    break;
                default:
                    continue;
            }

            const $ = await fetchCachedDOM(url);

            switch (section.id) {
                case 'featured':
                    section.items = this.parser.parseFeaturedSection($);
                    break;
                case 'new_updated':
                    section.items = this.parser.parseSearchResults($);
                    break;
                case 'recommend':
                    section.items = this.parser.parseHotSection($);
                    break;
                case 'favorite':
                    section.items = this.parser.parseSearchResults($);
                    break;
                case 'new_added':
                    section.items = this.parser.parseSearchResults($);
                    break;
            }

            sectionCallback(section);
        }
    }

    private pageCache = new Map<string, { promise: Promise<CheerioAPI>; timestamp: number }>();

    private async fetchMangaPage(mangaId: string): Promise<CheerioAPI> {
        const now = Date.now();
        const cached = this.pageCache.get(mangaId);

        if (cached && now - cached.timestamp < 10000) {
            return cached.promise;
        }

        const baseUrl = await this.getBaseUrl();
        const promise = this.DOMHTML(`${baseUrl}/truyen/${mangaId}`);

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
        const $ = await this.DOMHTML(`${baseUrl}/truyen/${mangaId}/${chapterId}`);
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

        const keyword = query.title?.trim() ?? '';
        const genre = query.includedTags?.[0]?.id;

        let fullUrl = '';

        if (keyword) {
            fullUrl = `${baseUrl}/tim-kiem?keyword=${encodeURIComponent(keyword)}&page=${page}`;
        } else if (genre) {
            fullUrl = `${baseUrl}/the-loai/${genre}?page=${page}`;
        } else {
            fullUrl = `${baseUrl}/tim-kiem?page=${page}`;
        }

        const $ = await this.DOMHTML(fullUrl);
        const tiles = this.parser.parseSearchResults($);

        return App.createPagedResults({
            results: tiles,
            metadata: { page: page + 1 },
        });
    }

    async getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults> {
        const baseUrl = await this.getBaseUrl();
        const page: number = metadata?.page ?? 1;
        let url = '';

        switch (homepageSectionId) {
            case 'favorite':
                url = `${baseUrl}/tim-kiem?sort=-views&page=${page}`;
                break;
            case 'new_updated':
                url = `${baseUrl}/tim-kiem?sort=-updated_at&page=${page}`;
                break;
            case 'new_added':
                url = `${baseUrl}/tim-kiem?sort=-created_at&page=${page}`;
                break;
            case 'full':
                url = `${baseUrl}/truyen-hoan-thanh/`;
                break;
            default:
                throw new Error("Requested to getViewMoreItems for a section ID which doesn't exist");
        }

        const $ = await this.DOMHTML(url);
        const manga = this.parser.parseSearchResults($);

        return App.createPagedResults({
            results: manga,
            metadata: { page: page + 1 },
        });
    }

    async CloudFlareError(status: number): Promise<void> {
        if (status === 503 || status === 403) {
            const baseUrl = await this.getBaseUrl();
            throw new Error(`CLOUDFLARE BYPASS ERROR:\nPlease go to home page ${CuuTruyen.name} source (${baseUrl}) and press the cloud icon.`);
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
