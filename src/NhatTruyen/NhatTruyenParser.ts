import {
    Chapter,
    ChapterDetails,
    PartialSourceManga,
    SourceManga,
    Tag,
    TagSection
} from '@paperback/types'

import { CheerioAPI } from 'cheerio'

// NhatTruyen/NetTruyen clone theme dùng chung cấu trúc HTML.
// Chỉnh selector ở đây nếu site lệch.

const idFromUrl = (url: string): string => {
    // giữ path tương đối làm id, bỏ domain
    return url.replace(/^https?:\/\/[^/]+/, '').replace(/^\/+/, '')
}

export const parseMangaDetails = ($: CheerioAPI, mangaId: string): SourceManga => {
    const info = $('.detail-info, #item-detail')

    const title = $('.title-detail, h1.title-detail', info).first().text().trim() ||
        $('h1').first().text().trim()

    const image = $('.col-image img, .detail-info img').first().attr('data-src') ||
        $('.col-image img, .detail-info img').first().attr('src') || ''

    const author = $('.author.row .col-xs-8, li.author .col-xs-8, .author p.col-xs-8')
        .first().text().trim()

    const statusText = $('.status.row .col-xs-8, li.status .col-xs-8')
        .first().text().trim().toLowerCase()

    const desc = $('.detail-content p, .shortened, #item-detail .detail-content')
        .first().text().trim()

    const tags: Tag[] = []
    $('.kind.row .col-xs-8 a, li.kind .col-xs-8 a').each((_, el) => {
        const label = $(el).text().trim()
        const id = idFromUrl($(el).attr('href') || label)
        if (label) tags.push(App.createTag({ id, label }))
    })

    let status = 'Ongoing'
    if (statusText.includes('hoàn') || statusText.includes('complete')) status = 'Completed'

    return App.createSourceManga({
        id: mangaId,
        mangaInfo: App.createMangaInfo({
            titles: [title],
            image,
            author,
            artist: author,
            desc,
            status,
            tags: [App.createTagSection({ id: 'genres', label: 'Thể loại', tags })]
        })
    })
}

export const parseChapters = ($: CheerioAPI, mangaId: string): Chapter[] => {
    const chapters: Chapter[] = []
    const items = $('.list-chapter li.row:not(.heading), #nt_listchapter li.row:not(.heading), div.list-chapter li.row')

    let sortIndex = items.length
    items.each((_, el) => {
        const link = $('a', el).first()
        const href = link.attr('href') || ''
        const name = link.text().trim()
        const timeText = $('.col-xs-4.text-center, .col-xs-4', el).first().text().trim()

        // rút số chương từ tên: "Chapter 12.5"
        const numMatch = name.match(/([\d]+(?:\.[\d]+)?)/)
        const chapNum = numMatch ? parseFloat(numMatch[1]) : sortIndex

        if (href) {
            chapters.push(App.createChapter({
                id: idFromUrl(href),
                name,
                chapNum: isNaN(chapNum) ? sortIndex : chapNum,
                langCode: '🇻🇳',
                time: parseDate(timeText),
                sortingIndex: sortIndex
            }))
        }
        sortIndex--
    })
    return chapters
}

export const parseChapterDetails = ($: CheerioAPI, mangaId: string, chapterId: string): ChapterDetails => {
    const pages: string[] = []
    $('.reading-detail .page-chapter img, .reading-detail img, .page-chapter img').each((_, el) => {
        const src = $(el).attr('data-original') ||
            $(el).attr('data-src') ||
            $(el).attr('src') || ''
        const clean = src.trim().replace(/^\/\//, 'https://')
        if (clean && !clean.includes('data:image')) pages.push(clean)
    })

    return App.createChapterDetails({ id: chapterId, mangaId, pages })
}

export const parseSearchResults = ($: CheerioAPI): PartialSourceManga[] => {
    return parseMangaList($)
}

export const parseHomeItems = ($: CheerioAPI): PartialSourceManga[] => {
    return parseMangaList($)
}

const parseMangaList = ($: CheerioAPI): PartialSourceManga[] => {
    const results: PartialSourceManga[] = []
    $('.items .item, .ModuleContent .items .item, .row .item').each((_, el) => {
        const link = $('figure.clip a, .image a, h3 a, a', el).first()
        const href = link.attr('href') || ''
        if (!href) return

        const title = $('figcaption h3 a, h3 a, .title, figure figcaption a', el).first().text().trim() ||
            link.attr('title') || ''

        const img = $('img', el).first()
        const image = img.attr('data-src') || img.attr('src') || ''

        const subtitle = $('figcaption ul li a, .comic-item .chapter a', el).first().text().trim()

        results.push(App.createPartialSourceManga({
            mangaId: idFromUrl(href),
            title,
            image: image.replace(/^\/\//, 'https://'),
            subtitle
        }))
    })
    return results
}

// site thường có nhiều trang: /?page=2 hoặc /tim-truyen?keyword=...&page=2
export const isLastPage = ($: CheerioAPI): boolean => {
    const active = $('.pagination li.active, ul.pagination li.active').last()
    const next = active.next()
    return next.length === 0 || next.hasClass('disabled')
}

function parseDate(text: string): Date {
    // các dạng "12/07/25", "20:14 07/07" — fallback về now nếu không parse được
    const dmy = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
    if (dmy) {
        let year = parseInt(dmy[3])
        if (year < 100) year += 2000
        return new Date(year, parseInt(dmy[2]) - 1, parseInt(dmy[1]))
    }
    return new Date()
}
