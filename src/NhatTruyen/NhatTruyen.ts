import {
    ChapterDetails,
    ChapterProviding,
    ContentRating,
    HomePageSectionsProviding,
    HomeSection,
    HomeSectionType,
    MangaProviding,
    PagedResults,
    Request,
    Response,
    SearchRequest,
    SearchResultsProviding,
    Source,
    SourceInfo,
    SourceIntents,
    SourceManga,
    Chapter
} from '@paperback/types'

import {
    isLastPage,
    parseChapterDetails,
    parseChapters,
    parseHomeItems,
    parseMangaDetails,
    parseSearchResults
} from './NhatTruyenParser'

import {
    contentSettings,
    DEFAULT_DOMAIN,
    getDomain,
    resetSettingsButton
} from './NhatTruyenSettings'

export const NhatTruyenInfo: SourceInfo = {
    version: '1.0.0',
    name: 'NhatTruyen',
    icon: 'icon.png',
    author: 'you',
    authorWebsite: '',
    description: 'Nguồn NhatTruyen/NetTruyen (clone theme). Có thể đổi tên miền trong cài đặt.',
    contentRating: ContentRating.MATURE,
    websiteBaseURL: DEFAULT_DOMAIN,
    sourceTags: [{ text: 'Vietnamese', type: 'grey' }],
    intents:
        SourceIntents.MANGA_CHAPTERS |
        SourceIntents.HOMEPAGE_SECTIONS |
        SourceIntents.SETTINGS_UI
}

export class NhatTruyen
    implements SearchResultsProviding, MangaProviding, ChapterProviding, HomePageSectionsProviding {

    stateManager = App.createSourceStateManager()

    requestManager = App.createRequestManager({
        requestsPerSecond: 4,
        requestTimeout: 20000,
        interceptor: {
            interceptRequest: async (request: Request): Promise<Request> => {
                const domain = await getDomain(this.stateManager)
                request.headers = {
                    ...(request.headers ?? {}),
                    referer: `${domain}/`,
                    'user-agent':
                        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
                }
                return request
            },
            interceptResponse: async (response: Response): Promise<Response> => response
        }
    })

    // ---- settings ----
    async getSourceMenu(): Promise<any> {
        return App.createDUISection({
            id: 'main',
            header: 'Cài đặt nguồn',
            isHidden: false,
            rows: async () => [
                contentSettings(this.stateManager),
                resetSettingsButton(this.stateManager)
            ]
        })
    }

    private async fetchCheerio(url: string): Promise<CheerioStatic> {
        const request = App.createRequest({ url, method: 'GET' })
        const response = await this.requestManager.schedule(request, 2)
        this.checkResponseError(response)
        return this.cheerio.load(response.data as string)
    }

    private checkResponseError(response: Response): void {
        if (response.status < 200 || response.status >= 400) {
            throw new Error(`Request thất bại (HTTP ${response.status}). Có thể tên miền đã đổi — vào cài đặt để cập nhật.`)
        }
    }

    async getMangaDetails(mangaId: string): Promise<SourceManga> {
        const domain = await getDomain(this.stateManager)
        const $ = await this.fetchCheerio(`${domain}/${mangaId}`)
        return parseMangaDetails($, mangaId)
    }

    async getChapters(mangaId: string): Promise<Chapter[]> {
        const domain = await getDomain(this.stateManager)
        const $ = await this.fetchCheerio(`${domain}/${mangaId}`)
        return parseChapters($, mangaId)
    }

    async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        const domain = await getDomain(this.stateManager)
        const $ = await this.fetchCheerio(`${domain}/${chapterId}`)
        return parseChapterDetails($, mangaId, chapterId)
    }

    async getSearchResults(query: SearchRequest, metadata: any): Promise<PagedResults> {
        const domain = await getDomain(this.stateManager)
        const page: number = metadata?.page ?? 1
        const keyword = encodeURIComponent(query.title ?? '')

        // pattern phổ biến: /tim-truyen?keyword=...&page=
        const url = `${domain}/tim-truyen?keyword=${keyword}&page=${page}`
        const $ = await this.fetchCheerio(url)
        const results = parseSearchResults($)

        return App.createPagedResults({
            results,
            metadata: isLastPage($) ? undefined : { page: page + 1 }
        })
    }

    async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
        const domain = await getDomain(this.stateManager)

        const sections = [
            {
                section: App.createHomeSection({
                    id: 'hot',
                    title: 'Truyện HOT',
                    containsMoreItems: true,
                    type: HomeSectionType.singleRowNormal
                }),
                url: `${domain}/hot`
            },
            {
                section: App.createHomeSection({
                    id: 'latest',
                    title: 'Mới cập nhật',
                    containsMoreItems: true,
                    type: HomeSectionType.singleRowNormal
                }),
                url: `${domain}/?page=1`
            }
        ]

        for (const { section, url } of sections) {
            sectionCallback(section)
            try {
                const $ = await this.fetchCheerio(url)
                section.items = parseHomeItems($)
            } catch {
                section.items = []
            }
            sectionCallback(section)
        }
    }

    async getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults> {
        const domain = await getDomain(this.stateManager)
        const page: number = metadata?.page ?? 1

        const path = homepageSectionId === 'hot' ? 'hot' : ''
        const url = `${domain}/${path}${path ? '?' : '?'}page=${page}`.replace('/?', '/?')

        const $ = await this.fetchCheerio(url)
        const results = parseHomeItems($)

        return App.createPagedResults({
            results,
            metadata: isLastPage($) ? undefined : { page: page + 1 }
        })
    }

    getMangaShareUrl(mangaId: string): string {
        return `${DEFAULT_DOMAIN}/${mangaId}`
    }
}
