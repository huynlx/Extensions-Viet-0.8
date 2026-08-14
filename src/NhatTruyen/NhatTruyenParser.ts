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
            const rawTitle = $titleLink.attr('title')?.trim() || $titleLink.text().trim();
            const title = decodeHTML(rawTitle);

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
            const rawLastChapter = $item.find('.slide-caption a').last().text().trim();
            const lastChapter = decodeHTML(rawLastChapter);

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
            const rawTitle = $titleLink.attr('title')?.trim() || $titleLink.text().trim();
            const title = decodeHTML(rawTitle);

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
            const rawLastChapter = $item.find('ul li.chapter:first-child a').text().trim() || $item.find('.comic-item .chapter:first-child a').text().trim();
            const lastChapter = decodeHTML(rawLastChapter);

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
            const rawTitle = $titleLink.attr('title')?.trim() || $titleLink.text().trim();
            const title = decodeHTML(rawTitle);

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
            const rawLastChapter = $item.find('.comic-item .chapter').first().find('a').text().trim();
            const lastChapter = decodeHTML(rawLastChapter);

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
            const rawTitle = $titleLink.attr('title')?.trim() || $titleLink.text().trim();
            const title = decodeHTML(rawTitle);

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
            const rawLastChapter = $item.find('.comic-item .chapter').first().find('a').text().trim();
            const lastChapter = decodeHTML(rawLastChapter);

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

    // Parse thông tin chi tiết truyện
    parseMangaDetails($: CheerioAPI, mangaId: string) {
        const rawTitle = $('h1.title-detail').text().trim() || $('.title-detail').text().trim();
        const title = decodeHTML(rawTitle);

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
        const rawDescription = $descEl
            .text()
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
            .join('\n\n');
        const description = decodeHTML(rawDescription);

        const rawAuthor = $('.author .col-xs-8').text().trim() || 'Đang cập nhật';
        const author = decodeHTML(rawAuthor);

        const statusStr = $('.status .col-xs-8').text().trim();
        const status = statusStr.includes('Hoàn thành') ? 'Completed' : 'Ongoing';

        const arrayTags: Tag[] = [];
        $('.kind .col-xs-8 a').each((_, element) => {
            const rawLabel = $(element).text().trim();
            const label = decodeHTML(rawLabel);
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
                artist: author,
                desc: description,
                tags: [App.createTagSection({ id: '0', label: decodeHTML('Thể loại'), tags: arrayTags })],
                hentai: false,
            }),
        });
    }

    // Parse trực tiếp mảng JSON thành danh sách Chapter
    parseChapterList(data: any[]): Chapter[] {
        const chapters: Chapter[] = [];

        for (const item of data) {
            const formattedView = new Intl.NumberFormat('vi-VN').format(item.view);

            // Dùng thư viện ép kiểu chuỗi 'yyyy-MM-dd HH:mm:ss' sang 'dd/MM/yyyy'
            const formattedTime = item.updated_at ? format(parse(item.updated_at, 'yyyy-MM-dd HH:mm:ss', new Date()), 'dd/MM/yyyy') : '';

            const rawName = item.chapter_name;
            const name = decodeHTML(rawName);

            chapters.push(
                App.createChapter({
                    id: item.chapter_num.toString(),
                    name: name,
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

        $('.reading-detail.box_doc .page-chapter img').each((_, element) => {
            let pageUrl = $(element).attr('data-original') || $(element).attr('data-src') || $(element).attr('src') || '';

            if (pageUrl.startsWith('//')) {
                pageUrl = `https:${pageUrl}`;
            }

            // Lọc bỏ ảnh rỗng, thumb-default và ảnh logo/watermark nettruyenviet
            if (pageUrl && !pageUrl.includes('thumb-default') && !pageUrl.includes('nettruyenviet.webp')) {
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

        // 1. Thêm thủ công tag "Tất cả" vào đầu danh sách Thể loại
        genreTags.push(App.createTag({ id: 'all', label: decodeHTML('Tất cả') }));

        // 2. Thể loại (Genres) - Phân biệt loại /tim-truyen và /tag
        $('#ctl00_divRight .genres ul.nav li a').each((_, element) => {
            const rawLabel = $(element).text().trim();
            const label = decodeHTML(rawLabel);
            const href = $(element).attr('href') || '';

            if (!href || label.toLowerCase() === 'tất cả') {
                return;
            }

            let id = '';
            if (href.includes('/tim-truyen/')) {
                id = href.split('/tim-truyen/').pop()?.split('/')[0]?.split('?')[0] ?? '';
            } else if (href.includes('/tag/')) {
                const tagSlug = href.split('/tag/').pop()?.split('/')[0]?.split('?')[0] ?? '';
                if (tagSlug) {
                    id = `tag/${tagSlug}`;
                }
            }

            if (id && label) {
                genreTags.push(App.createTag({ id: id, label: label }));
            }
        });

        // 3. Trạng thái (Status)
        const statusOptions = [
            { id: 'status=', label: decodeHTML('Tất cả') },
            { id: 'status=2', label: decodeHTML('Hoàn thành') },
            { id: 'status=1', label: decodeHTML('Đang tiến hành') },
        ];

        for (const option of statusOptions) {
            statusTags.push(App.createTag({ id: option.id, label: option.label }));
        }

        // 4. Xếp hạng (Sort Options)
        const sortOptions = [
            { id: 'sort=15', label: decodeHTML('Truyện mới') },
            { id: 'sort=10', label: decodeHTML('Top all') },
            { id: 'sort=11', label: decodeHTML('Top tháng') },
            { id: 'sort=12', label: decodeHTML('Top tuần') },
            { id: 'sort=13', label: decodeHTML('Top ngày') },
            { id: 'sort=20', label: decodeHTML('Theo dõi nhiều') },
            { id: 'sort=25', label: decodeHTML('Bình luận nhiều') },
            { id: 'sort=30', label: decodeHTML('Số chapter') },
        ];

        for (const option of sortOptions) {
            sortTags.push(App.createTag({ id: option.id, label: option.label }));
        }

        return [
            App.createTagSection({ id: 'genres', label: decodeHTML('Thể loại'), tags: genreTags }),
            App.createTagSection({ id: 'status', label: decodeHTML('Trạng thái'), tags: statusTags }),
            App.createTagSection({ id: 'sort', label: decodeHTML('Xếp hạng'), tags: sortTags }),
        ];
    }
}
