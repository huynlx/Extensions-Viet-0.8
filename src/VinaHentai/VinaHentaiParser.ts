import { Chapter, PartialSourceManga, SourceManga, Tag, TagSection } from '@paperback/types';
import { CheerioAPI } from 'cheerio';
import { decodeHTML } from 'entities';

export class VinaHentaiParser {
    private imageUrlRegex = /https:\/\/[^"'\s\\]+\/manga-images\/[^"'\s\\]+/g;
    private pageRegex = /page=(\d+)/;
    private numberRegex = /\d+/;

    // ============================ MANGA LIST / SEARCH ============================

    public parseAllTimeSection($: CheerioAPI): PartialSourceManga[] {
        const items: PartialSourceManga[] = [];

        $('a[href^="/truyen-hentai/"]').each((_, element) => {
            const $el = $(element);
            const href = $el.attr('href') ?? '';
            const mangaId = href.split('/').pop() ?? '';

            const title = decodeHTML($el.find('.text-txt-primary.line-clamp-1').text().trim() || $el.find('img').attr('alt') || '');
            const image = $el.find('img').attr('src') ?? '';

            const rank = $el.find('span.w-5').text().trim();
            const views = decodeHTML($el.find('span.text-xs.font-medium').first().text().trim());

            let subtitle = views ? views : undefined;
            if (rank) {
                subtitle = subtitle ? `#${rank} • ${subtitle}` : `#${rank}`;
            }

            if (mangaId && title) {
                items.push(
                    App.createPartialSourceManga({
                        mangaId,
                        title: title,
                        image: image,
                        subtitle: subtitle,
                    })
                );
            }
        });

        return items;
    }

    public parseFeaturedSection($: CheerioAPI): PartialSourceManga[] {
        const items: PartialSourceManga[] = [];

        $('.banner-desktop-card').each((_, element) => {
            const $el = $(element);
            const href = $el.attr('href') ?? '';
            const mangaId = href.split('/').pop() ?? '';

            const title = decodeHTML($el.find('div.mt-1.5.truncate').attr('title') || $el.find('img').attr('alt') || '');
            const image = $el.find('img').attr('src') ?? '';
            const subtitleAttr = $el.find('span.text-white\\/90.font-semibold.truncate').attr('title');
            const subtitle = subtitleAttr ? decodeHTML(subtitleAttr) : undefined;

            if (mangaId && title) {
                items.push(
                    App.createPartialSourceManga({
                        mangaId,
                        title: title.trim(),
                        image: image,
                        subtitle: subtitle?.trim(),
                    })
                );
            }
        });

        return items;
    }

    public parseMangaList($: CheerioAPI): PartialSourceManga[] {
        const mangas: PartialSourceManga[] = [];

        $('.grid a[href*="/truyen-hentai/"]').each((_, el) => {
            const href = $(el).attr('href');
            if (!href) return;

            const titleDiv = $(el).find('div.truncate.font-semibold[title]');
            const title = decodeHTML(titleDiv.attr('title') || titleDiv.text().trim() || '');
            const image = $(el).find('img').first().attr('src') || '';

            const mangaId = href.includes('/truyen-hentai/') ? href.split('/truyen-hentai/')[1]?.replace(/\/$/, '') || href : href;

            const $bottomContainer = $(el).find('div.absolute.inset-x-0.bottom-0.z-\\[2\\].min-w-0');
            const $firstDiv = $bottomContainer.children('div').first();
            const subtitleText = $firstDiv.find('span').first().text().trim();
            const subtitle = subtitleText ? decodeHTML(subtitleText) : undefined;

            if (mangaId && title) {
                mangas.push(
                    App.createPartialSourceManga({
                        mangaId,
                        title,
                        image,
                        subtitle,
                    })
                );
            }
        });

        return this.distinctById(mangas);
    }

    public parseSearchManga($: CheerioAPI): PartialSourceManga[] {
        const mangas: PartialSourceManga[] = [];

        $('a.group[href*="/truyen-hentai/"]').each((_, el) => {
            const href = $(el).attr('href');
            if (!href) return;

            const title = decodeHTML($(el).find('h2').text().trim());
            const image = $(el).find('img').first().attr('src') || '';

            const mangaId = href.includes('/truyen-hentai/') ? href.split('/truyen-hentai/')[1]?.replace(/\/$/, '') || href : href;

            if (mangaId && title) {
                mangas.push(
                    App.createPartialSourceManga({
                        mangaId,
                        title,
                        image,
                    })
                );
            }
        });

        return this.distinctById(mangas);
    }

    public parseHasNextPage($: CheerioAPI, currentMangaCount: number, currentUrl: string, isSearch: boolean): boolean {
        if (!isSearch) {
            return currentMangaCount >= 24;
        }

        const currentPageMatch = currentUrl.match(this.pageRegex);
        const currentPage = currentPageMatch ? parseInt(currentPageMatch[1]!, 10) : 1;

        const maxPageAttr = $('input[type=number][max]').attr('max');
        const maxPage = maxPageAttr ? parseInt(maxPageAttr, 10) : 1;

        const hasNextBtn = $(`a[href*="page=${currentPage + 1}"]`).length > 0 || $(`button[title*="${currentPage + 1}"]`).length > 0;

        return currentPage < maxPage || hasNextBtn;
    }

    // ============================ DETAILS & CHAPTERS ============================

    parseMangaDetails($: CheerioAPI, mangaId: string): SourceManga {
        const primaryTitle = decodeHTML($('h1').first().text().trim());
        const titles = [primaryTitle].filter(Boolean);

        const tags: Tag[] = [];
        $('a[href*="/genres/"]').each((_, obj) => {
            const rawLabel = $(obj).text().trim();
            const label = decodeHTML(rawLabel);
            const id = $(obj).attr('href')?.split('/genres/')[1]?.split('?')[0]?.split('/')[0]?.trim() || label;
            if (label && !label.startsWith('+')) {
                tags.push(App.createTag({ label, id }));
            }
        });

        const author = decodeHTML(
            $('a[href*="/authors/"]')
                .map((_, el) => $(el).text().trim())
                .get()
                .filter((text) => text && !text.startsWith('+'))
                .join(', ') || 'Chưa rõ'
        );

        const artist = '';

        let image = $('img[alt*="Bìa"]').attr('src') || $('img[src*="story-images"]').attr('src') || '';
        if (image.startsWith('//')) {
            image = `https:${image}`;
        }

        const desc = decodeHTML($('#manga-description-section .text-txt-secondary').text().trim());

        const bodyText = $('body').text();
        let status = 'Đang tiến hành';
        if (bodyText.includes('Đã hoàn thành')) {
            status = 'Đã hoàn thành';
        } else if (bodyText.includes('Đang tiến hành')) {
            status = 'Đang tiến hành';
        }

        return App.createSourceManga({
            id: mangaId,
            mangaInfo: App.createMangaInfo({
                titles,
                author,
                artist,
                image,
                desc,
                status,
                tags: [App.createTagSection({ id: '0', label: 'genre', tags })],
            }),
        });
    }

    public parseChapterList($: CheerioAPI): Chapter[] {
        const rawChapters: Chapter[] = [];

        const elements = $('a.block[href*="/truyen-hentai/"]').get().reverse();

        elements.forEach((el, idx) => {
            const $el = $(el);
            const href = $el.attr('href') || '';
            const parts = href.split('/').filter(Boolean);
            if (parts.length <= 2) return;

            const name = decodeHTML($el.find('span').first().text().trim() || $el.text().trim());
            const dateStr = $el.find('time').first().text().trim();
            const time = this.parseRelativeDate(dateStr);

            const chapterId = href.startsWith('/') ? href : `/${href}`;
            const views = decodeHTML($el.find('span.text-txt-secondary').text().trim());
            const group = views ? `${views} lượt xem` : undefined;

            rawChapters.push(
                App.createChapter({
                    id: chapterId,
                    name,
                    chapNum: idx + 1,
                    time,
                    langCode: '🇻🇳',
                    group,
                })
            );
        });

        return rawChapters;
    }

    public parseChapterDetails(html: string): string[] {
        const matches = html.match(this.imageUrlRegex) || [];
        return Array.from(new Set(matches));
    }

    parseGenres($: CheerioAPI): TagSection[] {
        const genreTags: Tag[] = [];

        $('a[href*="/genres/"]').each((_, el) => {
            const href = $(el).attr('href') || '';
            const slug = href.split('/genres/')[1]?.split('?')[0]?.split('/')[0]?.trim();
            const name = decodeHTML($(el).text().trim());

            if (slug && name) {
                genreTags.push(App.createTag({ id: slug, label: name }));
            }
        });

        const uniqueGenreTags = Array.from(new Map(genreTags.map((t) => [t.id, t])).values()).sort((a, b) => a.label.localeCompare(b.label));

        const sortTags: Tag[] = [
            App.createTag({ id: 'updatedAt', label: decodeHTML('Mới cập nhật') }),
            App.createTag({ id: 'views', label: decodeHTML('Xem nhiều') }),
            App.createTag({ id: 'likes', label: decodeHTML('Đánh giá cao') }),
            App.createTag({ id: 'oldest', label: decodeHTML('Cũ nhất') }),
        ];

        const statusTags: Tag[] = [
            App.createTag({ id: '', label: decodeHTML('Tất cả') }),
            App.createTag({ id: 'ongoing', label: decodeHTML('Đang tiến hành') }),
            App.createTag({ id: 'completed', label: decodeHTML('Đã hoàn thành') }),
        ];

        return [
            App.createTagSection({
                id: 'genres',
                label: decodeHTML('Thể loại'),
                tags: uniqueGenreTags,
            }),
            App.createTagSection({
                id: 'sort',
                label: decodeHTML('Sắp xếp theo'),
                tags: sortTags,
            }),
            App.createTagSection({
                id: 'status',
                label: decodeHTML('Tình trạng'),
                tags: statusTags,
            }),
        ];
    }

    private parseRelativeDate(dateStr: string): Date {
        if (!dateStr) return new Date();

        const match = dateStr.match(this.numberRegex);
        if (!match) return new Date();

        const num = parseInt(match[0], 10);
        const now = new Date();

        if (dateStr.includes('giây')) now.setSeconds(now.getSeconds() - num);
        else if (dateStr.includes('phút')) now.setMinutes(now.getMinutes() - num);
        else if (dateStr.includes('giờ')) now.setHours(now.getHours() - num);
        else if (dateStr.includes('ngày')) now.setDate(now.getDate() - num);
        else if (dateStr.includes('tuần')) now.setDate(now.getDate() - num * 7);
        else if (dateStr.includes('tháng')) now.setMonth(now.getMonth() - num);
        else if (dateStr.includes('năm')) now.setFullYear(now.getFullYear() - num);

        return now;
    }

    private distinctById<T extends { mangaId?: string; id?: string }>(items: T[]): T[] {
        const seen = new Set<string>();
        return items.filter((item) => {
            const key = item.mangaId || item.id;
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }
}

export function isLastPageAllTime($: CheerioAPI): boolean {
    const $pagination = $('nav[aria-label="Phân trang manga mọi thời đại"]');
    if ($pagination.length === 0) {
        return true;
    }

    const $pageLinks = $pagination.find('a[href*="page="]');
    if ($pageLinks.length === 0) {
        return true;
    }

    let maxPage = 1;
    let currentPage = 1;

    $pageLinks.each((_, el) => {
        const $el = $(el);
        const href = $el.attr('href') || '';
        const match = href.match(/page=(\d+)/);
        const pageNum = match ? parseInt(match[1] || '1', 10) : 1;

        if (pageNum > maxPage) {
            maxPage = pageNum;
        }

        if ($el.attr('aria-current') === 'page') {
            currentPage = pageNum;
        }
    });

    return currentPage >= maxPage;
}

export function isLastPageSearch($: CheerioAPI): boolean {
    const $lastButton = $('button[aria-label="Tới trang cuối"]');
    if ($lastButton.length === 0) {
        return true;
    }
    const isDisabled = $lastButton.attr('disabled') !== undefined || $lastButton.hasClass('cursor-not-allowed');
    if (isDisabled) {
        return true;
    }

    const $currentPageBtn = $('button[aria-current="page"]');
    if ($currentPageBtn.length > 0) {
        const currentPageTitle = $currentPageBtn.attr('title') || '';
        const currentPageNum = parseInt(currentPageTitle.replace(/\D/g, ''), 10);

        let maxPage = currentPageNum;
        $('button[title^="Trang "]').each((_, el) => {
            const title = $(el).attr('title') || '';
            const pageNum = parseInt(title.replace(/\D/g, ''), 10);
            if (!isNaN(pageNum) && pageNum > maxPage) {
                maxPage = pageNum;
            }
        });

        let hasHigherPage = false;
        $('button[title^="Trang "]').each((_, el) => {
            const title = $(el).attr('title') || '';
            const pageNum = parseInt(title.replace(/\D/g, ''), 10);
            if (!isNaN(pageNum) && pageNum > currentPageNum) {
                hasHigherPage = true;
            }
        });

        if (!hasHigherPage) {
            return true;
        }
    }

    return false;
}
