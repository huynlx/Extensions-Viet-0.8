import { Chapter, PartialSourceManga, Tag, TagSection } from '@paperback/types';
import { CheerioAPI } from 'cheerio';
import { decodeHTML } from 'entities';

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
            const mangaId = href.split('/truyen-hentai/').pop()?.split('/')[0]?.split('?')[0] ?? '';

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
            const mangaId = href.split('/truyen-hentai/').pop()?.split('/')[0]?.split('?')[0] ?? '';

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
            const mangaId = href.split('/truyen-hentai/').pop()?.split('/')[0]?.split('?')[0] ?? '';

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

        $('#ctl00_divCenter .items .row .item').each((_, element) => {
            const $item = $(element);

            // 1. Title & Link từ figcaption h3 a
            const $titleLink = $item.find('figcaption h3 a').first();
            const title = $titleLink.attr('title')?.trim() || $titleLink.text().trim();

            // 2. Manga ID từ Href
            const href = $titleLink.attr('href') || $item.find('a').first().attr('href') || '';
            const mangaId = href.split('/truyen-hentai/').pop()?.split('/')[0]?.split('?')[0] ?? '';

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
                        title: decodeHTML(title),
                        image: image,
                        subtitle: lastChapter || undefined,
                    })
                );
            }
        });

        return mangaList;
    }

    // Parse thông tin chi tiết truyện
    parseMangaDetails($: CheerioAPI, mangaId: string) {
        const title = $('h1.title-detail').text().trim() || $('.title-detail').text().trim();

        // Lấy ảnh bìa
        let image = $('.detail-info .col-image img').attr('src') || $('.detail-info img').attr('data-original') || '';
        if (image.startsWith('//')) image = `https:${image}`;

        // Lấy tác giả
        const authorStr = $('.list-info .author .col-xs-8').text().trim();
        const author = authorStr && authorStr !== 'Đang cập nhật' ? authorStr : 'Đang cập nhật';

        // Xác định trạng thái
        const statusStr = $('.list-info .status .col-xs-8').text().trim();
        const status = statusStr.includes('Hoàn thành') ? 'Completed' : 'Ongoing';

        // Lấy danh sách thể loại
        const arrayTags: Tag[] = [];
        $('.list-info .kind .col-xs-8 a').each((_, element) => {
            const label = $(element).text().trim();
            const href = $(element).attr('href') || '';
            // Lấy slug ID đằng sau /tim-truyen/
            const id = href.split('/tim-truyen/').pop()?.split('/')[0]?.split('?')[0] ?? '';

            if (id && label) {
                arrayTags.push(App.createTag({ id: id, label: label }));
            }
        });

        // Lấy rating và lượt xem để đưa vào phần mô tả nếu không có đoạn text mô tả riêng
        const views = $('.list-info .row:has(.fa-eye) .col-xs-8').text().trim();
        const rating = $('.mrt5.mrb10 span:has(span)').text().replace(/\s+/g, ' ').trim();
        const description = `Lượt xem: ${views}\nXếp hạng: ${rating}`;

        return App.createSourceManga({
            id: mangaId,
            mangaInfo: App.createMangaInfo({
                titles: [decodeHTML(title)],
                image: image,
                status: status,
                author: author,
                artist: author,
                desc: decodeHTML(description),
                tags: [App.createTagSection({ id: '0', label: 'Thể loại', tags: arrayTags })],
                hentai: true,
            }),
        });
    }

    // Helper quy đổi thời gian tương đối (VD: "58 phút trước", "26 ngày trước") thành Date
    private parseDate(dateStr: string): Date {
        const now = new Date();
        if (!dateStr) return now;

        const lower = dateStr.toLowerCase();
        const amountMatch = lower.match(/\d+/);
        const amount = amountMatch ? parseInt(amountMatch[0], 10) : 0;

        if (lower.includes('phút')) {
            now.setMinutes(now.getMinutes() - amount);
        } else if (lower.includes('giờ')) {
            now.setHours(now.getHours() - amount);
        } else if (lower.includes('ngày')) {
            now.setDate(now.getDate() - amount);
        } else if (lower.includes('tháng')) {
            now.setMonth(now.getMonth() - amount);
        } else if (lower.includes('năm')) {
            now.setFullYear(now.getFullYear() - amount);
        }

        return now;
    }

    // Parse trực tiếp mảng JSON thành danh sách Chapter
    parseChapterList($: CheerioAPI): Chapter[] {
        const chapters: Chapter[] = [];

        $('#nt_listchapter ul li.row').each((_, element) => {
            const $row = $(element);
            const $a = $row.find('.chapter a');

            const chapterName = $a.text().trim(); // VD: "Chapter 5"
            const dataId = $a.attr('data-id') || ''; // VD: "853722"
            const href = $a.attr('href') || ''; // VD: "https://www.hentaivnx.com/truyen-hentai/tong-hop-truyen-cua-tac-gia-otokam/chapter-5/853722"

            // Lấy slug path đằng sau /truyen-hentai/ làm ID duy nhất cho chapter
            const chapterId = href.split('/truyen-hentai/').pop() || dataId;

            // Trích xuất số chương (VD: "Chapter 5" -> 5)
            // const chapNumMatch = chapterName.match(/(\d+(\.\d+)?)/);
            // const chapNum = chapNumMatch ? parseFloat(chapNumMatch[1]) : 0;

            // Parse thời gian cập nhật
            const timeStr = $row.find('.col-xs-4.text-center').text().trim();
            const time = this.parseDate(timeStr);

            if (chapterId && chapterName) {
                chapters.push(
                    App.createChapter({
                        id: chapterId,
                        name: chapterName,
                        chapNum: chapterName.replace(/\D/g, '') ? parseFloat(chapterName.replace(/\D/g, '')) : 0,
                        langCode: '🇻🇳',
                        group: timeStr,
                        time: time,
                    })
                );
            }
        });

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
        const genreTags: Tag[] = [];
        const minChapterTags: Tag[] = [];
        const sortTags: Tag[] = [];

        // 1. Thể loại (Genres)
        genreTags.push(App.createTag({ id: 'all', label: 'Tất cả' }));

        // Lấy container chứa các thể loại ngay dưới label "Thể loại"
        const $genresContainer = $('label.col-sm-2.control-label:contains("Thể loại")').next('.col-sm-10');

        $genresContainer.find('.genre-item').each((_, element) => {
            const $item = $(element);

            // Lấy label từ thuộc tính title hoặc text của .genre-item
            const label = decodeHTML($item.attr('title')?.trim() || $item.text().trim());

            // Lấy data-id từ thẻ span bên trong (VD: data-id="25" -> id: "genres=25" hoặc "25")
            const dataId = $item.find('span').attr('data-id')?.trim();

            if (dataId && label) {
                // Lưu ID dưới dạng query parameter "genres=id" để dễ truyền vào search
                genreTags.push(App.createTag({ id: `genres=${dataId}`, label: label }));
            }
        });

        // 2. Số lượng chapter (Min Chapters)
        const minChapterOptions = [
            { id: 'minchapter=0', label: '>= 0 chapter' },
            { id: 'minchapter=10', label: '>= 10 chapter' },
            { id: 'minchapter=20', label: '>= 20 chapter' },
            { id: 'minchapter=50', label: '>= 50 chapter' },
            { id: 'minchapter=100', label: '>= 100 chapter' },
            { id: 'minchapter=200', label: '>= 200 chapter' },
            { id: 'minchapter=500', label: '>= 500 chapter' },
            { id: 'minchapter=1000', label: '>= 1000 chapter' },
        ];

        for (const option of minChapterOptions) {
            minChapterTags.push(App.createTag({ id: option.id, label: option.label }));
        }

        // 3. Xếp hạng (Sort Options)
        const sortOptions = [
            { id: 'sort=10', label: 'Top all' },
            { id: 'sort=11', label: 'Top tháng' },
            { id: 'sort=12', label: 'Top tuần' },
            { id: 'sort=13', label: 'Top ngày' },
            { id: 'sort=20', label: 'Theo dõi' },
            { id: 'sort=25', label: 'Bình luận' },
            { id: 'sort=30', label: 'Số chapter' },
            { id: 'sort=19', label: 'Top Follow' },
            { id: 'sort=15', label: 'Truyện mới' },
        ];

        for (const option of sortOptions) {
            sortTags.push(App.createTag({ id: option.id, label: option.label }));
        }

        return [
            App.createTagSection({ id: 'genres', label: 'Thể loại', tags: genreTags }),
            App.createTagSection({ id: 'minchapter', label: 'Số lượng chapter', tags: minChapterTags }),
            App.createTagSection({ id: 'sort', label: 'Xếp hạng', tags: sortTags }),
        ];
    }
}
