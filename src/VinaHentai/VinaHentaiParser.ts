import { Chapter, PartialSourceManga, SourceManga, Tag, TagSection } from '@paperback/types';
import { CheerioAPI } from 'cheerio';

export class VinaHentaiParser {
    private imageUrlRegex = /https:\/\/[^"'\s\\]+\/manga-images\/[^"'\s\\]+/g;
    private pageRegex = /page=(\d+)/;
    private numberRegex = /\d+/;

    // ============================ MANGA LIST / SEARCH ============================

    public parseMangaList($: CheerioAPI): PartialSourceManga[] {
        const mangas: PartialSourceManga[] = [];

        $('.grid a[href*="/truyen-hentai/"]').each((_, el) => {
            const href = $(el).attr('href');
            if (!href) return;

            const titleDiv = $(el).find('div.truncate.font-semibold[title]');
            const title = titleDiv.attr('title') || titleDiv.text().trim() || '';
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

    public parseSearchManga($: CheerioAPI): PartialSourceManga[] {
        const mangas: PartialSourceManga[] = [];

        $('a.group[href*="/truyen-hentai/"]').each((_, el) => {
            const href = $(el).attr('href');
            if (!href) return;

            const title = $(el).find('h2').text().trim();
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
        // 1. Tên truyện chính (lấy từ thẻ h1)
        const primaryTitle = $('h1').first().text().trim();
        const titles = [primaryTitle].filter(Boolean);

        // 2. Thể loại (Genres) - Lấy từ a[href*="/genres/"] và bỏ dấu "+"
        const tags: Tag[] = [];
        $('a[href*="/genres/"]').each((_, obj) => {
            const label = $(obj).text().trim();
            const id = $(obj).attr('href')?.split('/genres/')[1]?.split('?')[0]?.split('/')[0]?.trim() || label;
            if (label && !label.startsWith('+')) {
                tags.push(App.createTag({ label, id }));
            }
        });

        // 3. Tác giả (Authors) - Lấy từ a[href*="/authors/"] và bỏ dấu "+"
        const author =
            $('a[href*="/authors/"]')
                .map((_, el) => $(el).text().trim())
                .get()
                .filter((text) => text && !text.startsWith('+'))
                .join(', ') || 'Chưa rõ';

        const artist = ''; // Khung Kotlin không tách riêng artist

        // 4. Ảnh bìa (Thumbnail) - Tìm img alt*=Bìa hoặc img src*=story-images
        let image = $('img[alt*="Bìa"]').attr('src') || $('img[src*="story-images"]').attr('src') || '';
        if (image.startsWith('//')) {
            image = `https:${image}`;
        }

        // 5. Mô tả (Description) - Lấy từ #manga-description-section .text-txt-secondary
        const desc = $('#manga-description-section .text-txt-secondary').text().trim();

        // 6. Tình trạng truyện (Status)
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

        // 1. Duyệt qua danh sách chapter trong DOM và đảo ngược thứ tự
        const elements = $('a.block[href*="/truyen-hentai/"]').get().reverse();

        elements.forEach((el, idx) => {
            const $el = $(el);
            const href = $el.attr('href') || '';
            const parts = href.split('/').filter(Boolean);
            if (parts.length <= 2) return;

            const name = $el.find('span').first().text().trim() || $el.text().trim();
            const dateStr = $el.find('time').first().text().trim();
            const time = this.parseRelativeDate(dateStr);

            const chapterId = href.startsWith('/') ? href : `/${href}`;

            rawChapters.push(
                App.createChapter({
                    id: chapterId,
                    name,
                    chapNum: idx + 1,
                    time,
                })
            );
        });

        return rawChapters;
    }

    public parseChapterDetails(html: string): string[] {
        const matches = html.match(this.imageUrlRegex) || [];
        return Array.from(new Set(matches));
    }

    public parseGenres($: CheerioAPI): TagSection[] {
        const genreTags: Tag[] = [];

        // 1. Lấy thể loại động từ HTML (giữ nguyên logic bóc tách URL /genres/ của bạn)
        $('a[href*="/genres/"]').each((_, el) => {
            const href = $(el).attr('href') || '';

            const slug = href.split('/genres/')[1]?.split('?')[0]?.split('/')[0]?.trim();

            const name = $(el).text().trim();

            if (slug && name) {
                genreTags.push(App.createTag({ id: slug, label: name }));
            }
        });

        // Lọc trùng lặp & sắp xếp Thể loại theo alphabet
        const uniqueGenreTags = Array.from(new Map(genreTags.map((t) => [t.id, t])).values()).sort((a, b) => a.label.localeCompare(b.label));

        // 2. Thêm bộ lọc Sắp xếp (SortFilter) từ Kotlin
        const sortTags: Tag[] = [
            App.createTag({ id: 'updatedAt', label: 'Mới cập nhật' }),
            App.createTag({ id: 'views', label: 'Xem nhiều' }),
            App.createTag({ id: 'likes', label: 'Đánh giá cao' }),
            App.createTag({ id: 'oldest', label: 'Cũ nhất' }),
        ];

        // 3. Thêm bộ lọc Tình trạng (StatusFilter) từ Kotlin
        const statusTags: Tag[] = [
            App.createTag({ id: '', label: 'Tất cả' }),
            App.createTag({ id: 'ongoing', label: 'Đang tiến hành' }),
            App.createTag({ id: 'completed', label: 'Đã hoàn thành' }),
        ];

        // Trả về mảng TagSection[] chứa cả 3 bộ lọc
        return [
            App.createTagSection({
                id: 'genres',
                label: 'Thể loại',
                tags: uniqueGenreTags,
            }),
            App.createTagSection({
                id: 'sort',
                label: 'Sắp xếp theo',
                tags: sortTags,
            }),
            App.createTagSection({
                id: 'status',
                label: 'Tình trạng',
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
