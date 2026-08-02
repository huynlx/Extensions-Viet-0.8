import { Chapter, PartialSourceManga, Tag, TagSection } from '@paperback/types';
import { CheerioAPI } from 'cheerio';

export class Parser {
    // Parse danh sách truyện (Search, Homepage, ViewMore)
    parseSearchResults($: CheerioAPI): PartialSourceManga[] {
        const mangaList: PartialSourceManga[] = [];

        $('.items-slide .item, .items .item').each((_, element) => {
            const href = $(element).find('a').first().attr('href') ?? '';
            // Tách mangaId từ URL /truyen-tranh/manga-id
            const mangaId = href.split('/truyen-tranh/').pop()?.split('/')[0] ?? '';

            const title = $(element).find('h3 a').text().trim() || $(element).find('a').attr('title') || '';

            // Ưu tiên data-original để không bị dính ảnh mặc định thumb-default.jpg
            let image = $(element).find('img').attr('data-original') || $(element).find('img').attr('src') || '';
            if (image.startsWith('//')) image = `https:${image}`;

            const lastChapter = $(element).find('.slide-caption a').last().text().trim() || $(element).find('.chapter a').first().text().trim();

            if (mangaId && title && !mangaId.includes('javascript')) {
                mangaList.push(
                    App.createPartialSourceManga({
                        mangaId: mangaId,
                        title: title,
                        image: image,
                        subtitle: lastChapter,
                    })
                );
            }
        });

        return mangaList;
    }

    // Parse thông tin chi tiết truyện
    parseMangaDetails($: CheerioAPI, mangaId: string) {
        const title = $('h1.title-detail').text().trim() || $('.title-detail').text().trim();

        let image = $('.detail-info img').attr('data-original') || $('.detail-info img').attr('src') || '';
        if (image.startsWith('//')) image = `https:${image}`;

        const description = $('.detail-content p').text().trim();
        const author = $('.author .col-xs-8').text().trim() || 'Unknown';
        const statusStr = $('.status .col-xs-8').text().trim();

        // Trạng thái: 'Completed' hoặc 'Ongoing'
        const status = statusStr.includes('Hoàn thành') ? 'Completed' : 'Ongoing';

        const arrayTags: Tag[] = [];
        $('.kind .col-xs-8 a').each((_, element) => {
            const label = $(element).text().trim();
            const id = $(element).attr('href')?.split('/').pop() ?? '';
            if (id && label) {
                arrayTags.push(App.createTag({ id: id, label: label }));
            }
        });

        return App.createSourceManga({
            id: mangaId,
            mangaInfo: App.createMangaInfo({
                titles: [title],
                image: image,
                status: status,
                author: author,
                desc: description,
                tags: [App.createTagSection({ id: '0', label: 'Thể loại', tags: arrayTags })],
                hentai: false,
            }),
        });
    }

    // Parse danh sách chapter
    parseChapterList(data: any[]): Chapter[] {
        const chapters: Chapter[] = [];

        for (const item of data) {
            // ID chapter có thể dùng chapter_id (dạng chuỗi) hoặc chapter_slug tuỳ theo cách bạn gọi API lấy ảnh chi tiết
            const chapterId = item.chapter_num ?? 0;

            chapters.push(
                App.createChapter({
                    id: chapterId,
                    name: item.chapter_name,
                    chapNum: item.chapter_num ?? 0,
                    time: new Date(item.updated_at), // Khai báo thời gian cập nhật
                })
            );
        }

        return chapters;
    }

    // Parse danh sách trang ảnh trong chapter
    parseChapterDetails($: CheerioAPI): string[] {
        const pages: string[] = [];

        $('.page-chapter img').each((_, element) => {
            let pageUrl = $(element).attr('data-original') || $(element).attr('data-src') || $(element).attr('src') || '';
            if (pageUrl.startsWith('//')) {
                pageUrl = `https:${pageUrl}`;
            }
            if (pageUrl && !pageUrl.includes('thumb-default')) {
                pages.push(pageUrl);
            }
        });

        return pages;
    }

    // Parse danh sách thể loại (Tags)
    parseTags($: CheerioAPI): TagSection[] {
        const arrayTags: Tag[] = [];

        $('.dropdown-menu.megamenu li a').each((_, element) => {
            const label = $(element).text().trim();
            const id = $(element).attr('href')?.split('/').pop() ?? '';
            if (id && label) {
                arrayTags.push(App.createTag({ id: id, label: label }));
            }
        });

        return [App.createTagSection({ id: 'genres', label: 'Thể loại', tags: arrayTags })];
    }
}
