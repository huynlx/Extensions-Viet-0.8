import { Chapter, PartialSourceManga, Tag, TagSection } from '@paperback/types';
import { CheerioAPI } from 'cheerio';
import { decodeHTML } from 'entities';
import { parse, format } from 'date-fns';

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

        let image = $('.detail-info img').attr('data-original') || $('.detail-info img').attr('src') || '';
        if (image.startsWith('//')) image = `https:${image}`;

        // 🛠️ XỬ LÝ LẤY MÔ TẢ GIỮ NGUYÊN TỪNG ĐOẠN VĂN
        const $descEl = $('.list-title + div, .detail-content').first().clone();

        // ❌ LOẠI BỎ THẺ H2, TIÊU ĐỀ RÁC VÀ THẺ "Xem thêm"
        $descEl.find('h2, .list-title, a.morelink, .morelink').remove();

        // 1. Chuyển thẻ <br> thành ký tự \n
        $descEl.find('br').replaceWith('\n');

        // 2. Chèn \n vào cuối mỗi thẻ div/p con để ép Cheerio tách dòng
        $descEl.find('div, p').each((_, el) => {
            $(el).append('\n');
        });

        // 3. Tách từng dòng, làm sạch khoảng trắng và ghép lại
        const description = $descEl
            .text()
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
            .join('\n\n');

        const author = $('.author .col-xs-8').text().trim() || 'Đang cập nhật';
        const statusStr = $('.status .col-xs-8').text().trim();
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
                titles: [decodeHTML(title)],
                image: image,
                status: status,
                author: author,
                artist: author,
                desc: description,
                tags: [App.createTagSection({ id: '0', label: 'Thể loại', tags: arrayTags })],
                hentai: false,
            }),
        });
    }

    // Parse trực tiếp mảng JSON thành danh sách Chapter
    parseChapterList(data: any[]): Chapter[] {
        const chapters: Chapter[] = [];

        for (const item of data) {
            // ID chapter có thể dùng chapter_id (dạng chuỗi) hoặc chapter_slug tuỳ theo cách bạn gọi API lấy ảnh chi tiết
            //   { id: '523', name: 'Chapter 523', chapNum: 523, langCode: 'vi' }

            const formattedView = new Intl.NumberFormat('vi-VN').format(item.view);

            // Dùng thư viện ép kiểu chuỗi 'yyyy-MM-dd HH:mm:ss' sang 'dd/MM/yyyy'
            const formattedTime = item.updated_at ? format(parse(item.updated_at, 'yyyy-MM-dd HH:mm:ss', new Date()), 'dd/MM/yyyy') : '';

            chapters.push(
                App.createChapter({
                    id: item.chapter_num.toString(),
                    name: item.chapter_name,
                    chapNum: item.chapter_num,
                    time: new Date(item.updated_at), // Khai báo thời gian cập nhật
                    group: formattedTime + ' • ' + formattedView + ' lượt xem',
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
        const genreTags: Tag[] = [];
        const statusTags: Tag[] = [];
        const sortTags: Tag[] = [];

        // 1. Thể loại (Genres)
        // Thêm tùy chọn "Tất cả" thủ công ở đầu danh sách với id quy ước là 'all'
        genreTags.push(App.createTag({ id: 'all', label: 'Tất cả' }));

        $('#ctl00_divRight .genres ul.nav li a').each((_, element) => {
            const label = decodeHTML($(element).text().trim());
            const href = $(element).attr('href') || '';
            const id = href.split('/tim-truyen/').pop()?.split('/')[0]?.split('?')[0] ?? '';

            // Lọc bỏ các mục rỗng, trùng 'tim-truyen' hoặc nhãn 'Tất cả' để tránh lặp
            if (id && label && id !== 'tim-truyen' && label.toLowerCase() !== 'tất cả') {
                genreTags.push(App.createTag({ id: id, label: label }));
            }
        });

        // 2. Trạng thái (Status)
        const statusOptions = [
            { id: 'status=-1', label: 'Tất cả' },
            { id: 'status=2', label: 'Hoàn thành' },
            { id: 'status=1', label: 'Đang tiến hành' },
        ];

        for (const option of statusOptions) {
            statusTags.push(App.createTag({ id: option.id, label: option.label }));
        }

        // 3. Xếp hạng (Sort Options)
        const sortOptions = [
            { id: 'sort=15', label: 'Truyện mới' },
            { id: 'sort=10', label: 'Top all' },
            { id: 'sort=11', label: 'Top tháng' },
            { id: 'sort=12', label: 'Top tuần' },
            { id: 'sort=13', label: 'Top ngày' },
            { id: 'sort=20', label: 'Theo dõi nhiều' },
            { id: 'sort=25', label: 'Bình luận nhiều' },
            { id: 'sort=30', label: 'Số chapter' },
        ];

        for (const option of sortOptions) {
            sortTags.push(App.createTag({ id: option.id, label: option.label }));
        }

        return [
            App.createTagSection({ id: 'genres', label: 'Thể loại', tags: genreTags }),
            App.createTagSection({ id: 'status', label: 'Trạng thái', tags: statusTags }),
            App.createTagSection({ id: 'sort', label: 'Xếp hạng', tags: sortTags }),
        ];
    }
}
