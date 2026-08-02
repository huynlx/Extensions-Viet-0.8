import { Chapter, PartialSourceManga, Tag, TagSection } from '@paperback/types';
import { CheerioAPI } from 'cheerio';

export class Parser {
    parseFeaturedSection($: CheerioAPI): PartialSourceManga[] {
        const mangaList: PartialSourceManga[] = [];

        $('.items-slide .item').each((_, element) => {
            const $item = $(element);

            // 1. Title & Link chính từ thẻ h3
            const $titleLink = $item.find('.slide-caption h3 a').first();
            const title = $titleLink.attr('title')?.trim() || $titleLink.text().trim();

            // 2. Manga ID từ Href
            const href = $titleLink.attr('href') || $item.find('a').first().attr('href') || '';
            const mangaId = href.split('/truyen-tranh/').pop()?.split('/')[0]?.split('?')[0] ?? '';

            // 3. Image (bỏ qua src placeholder, ưu tiên data-original -> data-retries)
            const $img = $item.find('img').first();
            let image = $img.attr('data-original') || $img.attr('data-retries') || $img.attr('src') || '';

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Chapter mới nhất (lấy thẻ <a> thứ hai trong .slide-caption)
            const lastChapter = $item.find('.slide-caption a').last().text().trim();

            if (mangaId && title && !mangaId.includes('javascript')) {
                mangaList.push(
                    App.createPartialSourceManga({
                        mangaId: mangaId,
                        title: title,
                        image: image,
                        subtitle: lastChapter || undefined,
                    })
                );
            }
        });

        return mangaList;
    }

    parseNewUpdatedSection($: CheerioAPI): PartialSourceManga[] {
        const mangaList: PartialSourceManga[] = [];

        $('#ctl00_divCenter .items .row .item').each((_, element) => {
            const $item = $(element);

            // 1. Title & Link chính từ figcaption h3 a
            const $titleLink = $item.find('figcaption h3 a').first();
            const title = $titleLink.attr('title')?.trim() || $titleLink.text().trim();

            // 2. Manga ID từ Href
            const href = $titleLink.attr('href') || $item.find('a').first().attr('href') || '';
            const mangaId = href.split('/truyen-tranh/').pop()?.split('/')[0]?.split('?')[0] ?? '';

            // 3. Image (ưu tiên data-original -> data-retries -> src)
            const $img = $item.find('.image img').first();
            let image = $img.attr('data-original') || $img.attr('data-retries') || $img.attr('src') || '';

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Chapter mới nhất (lấy thẻ <a> chapter đầu tiên trong danh sách li.chapter)
            const lastChapter = $item.find('ul li.chapter:first-child a').text().trim() || $item.find('.comic-item .chapter:first-child a').text().trim();

            if (mangaId && title && !mangaId.includes('javascript')) {
                mangaList.push(
                    App.createPartialSourceManga({
                        mangaId: mangaId,
                        title: title,
                        image: image,
                        subtitle: lastChapter || undefined,
                    })
                );
            }
        });

        return mangaList;
    }

    parseHotSection($: CheerioAPI): PartialSourceManga[] {
        const mangaList: PartialSourceManga[] = [];

        $('#ctl00_divCenter .items .row .item').each((_, element) => {
            const $item = $(element);

            // 1. Title & Link từ figcaption h3 a
            const $titleLink = $item.find('figcaption h3 a').first();
            const title = $titleLink.attr('title')?.trim() || $titleLink.text().trim();

            // 2. Manga ID từ Href
            const href = $titleLink.attr('href') || $item.find('a').first().attr('href') || '';
            const mangaId = href.split('/truyen-tranh/').pop()?.split('/')[0]?.split('?')[0] ?? '';

            // 3. Image (ưu tiên data-original -> data-retries -> src)
            const $img = $item.find('.image img').first();
            let image = $img.attr('data-original') || $img.attr('data-retries') || $img.attr('src') || '';

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Chapter mới nhất
            const lastChapter = $item.find('.comic-item .chapter').first().find('a').text().trim();

            if (mangaId && title && !mangaId.includes('javascript')) {
                mangaList.push(
                    App.createPartialSourceManga({
                        mangaId: mangaId,
                        title: title,
                        image: image,
                        subtitle: lastChapter || undefined,
                    })
                );
            }
        });

        return mangaList;
    }

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

        const description = $('.list-title + div').text().trim();
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

    // Parse trực tiếp mảng JSON thành danh sách Chapter
    parseChapterList(data: any[]): Chapter[] {
        console.log('💀 ⮕ Parser ⮕ parseChapterList ⮕ data:', data);

        const chapters: Chapter[] = [];

        for (const item of data) {
            // ID chapter có thể dùng chapter_id (dạng chuỗi) hoặc chapter_slug tuỳ theo cách bạn gọi API lấy ảnh chi tiết
            //   { id: '523', name: 'Chapter 523', chapNum: 523, langCode: 'vi' }

            const formattedView = new Intl.NumberFormat('vi-VN').format(item.view);

            chapters.push(
                App.createChapter({
                    id: item.chapter_num.toString(),
                    name: item.chapter_name,
                    chapNum: item.chapter_num,
                    time: new Date(item.updated_at), // Khai báo thời gian cập nhật
                    group: formattedView + ' lượt xem',
                    langCode: '🇻🇳',
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

        $('#ctl00_divRight .genres ul.nav li a').each((_, element) => {
            const label = $(element).text().trim();
            const href = $(element).attr('href') || '';

            // Lấy phần slug ở cuối url (VD: "https://nhattruyenqq.com/tim-truyen/action-95" -> "action-95")
            const id = href.split('/tim-truyen/').pop()?.split('/')[0]?.split('?')[0] ?? '';

            // Bỏ qua mục "Tất cả" (slug rỗng hoặc trùng link root /tim-truyen)
            if (id && label && id !== 'tim-truyen') {
                arrayTags.push(App.createTag({ id: id, label: label }));
            }
        });

        return [App.createTagSection({ id: 'genres', label: 'Thể loại', tags: arrayTags })];
    }
}
