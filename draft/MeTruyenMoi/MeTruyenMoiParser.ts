import { Chapter, PartialSourceManga, SourceManga, Tag, TagSection } from '@paperback/types';
import { CheerioAPI } from 'cheerio';
import { decodeHTML } from 'entities';
import { parse, format } from 'date-fns';

export class Parser {
    parseFeaturedSection($: CheerioAPI): PartialSourceManga[] {
        const mangaList: PartialSourceManga[] = [];

        $('div[role="group"]').each((_, element) => {
            const $item = $(element);
            const $cardLink = $item.find('a').first();

            // 1. Manga ID từ Href của thẻ <a> ngoài cùng
            const href = $cardLink.attr('href') || '';
            const mangaId = href.split('/truyen-tranh/').pop()?.split('/')[0]?.split('?')[0] ?? '';

            // 2. Title từ thẻ h3
            const title = $cardLink.find('h3').text().trim();

            // 3. Image (Ưu tiên ảnh thumbnail z-20 ở góc phải)
            const $img = $cardLink.find('img[alt^="Thumbnail"]').first().length ? $cardLink.find('img[alt^="Thumbnail"]').first() : $cardLink.find('img').last();

            let image = $img.attr('src') || $img.attr('data-original') || '';

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Subtitle: Số chương (VD: "204 chương")
            const lastChapter = $cardLink.find('span:contains("chương")').text().trim();

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
    parseMangaDetails($: CheerioAPI, mangaId: string): SourceManga {
        // 1. Tiêu đề: Thẻ h1 duy nhất
        const title = $('h1').first().text().trim();

        // 2. Ảnh bìa: Lấy từ thẻ img đầu tiên
        let image = $('article img').first().attr('src') || '';
        if (image.startsWith('//')) image = `https:${image}`;

        // 3. Tác giả: Chuỗi text chứa "Tác giả:" (VD: "Tác giả: Tịnh Vô Ngân")
        const authorText = $('span:contains("Tác giả:")').text().trim();
        const author = authorText.replace(/Tác giả:\s*/i, '').trim() || 'Đang cập nhật';

        // 4. Tình trạng: Lấy text bên cạnh "Tình trạng:"
        const statusText = $('li:contains("Tình trạng:")').text().trim();
        const status = statusText.includes('Hoàn thành') ? 'Completed' : 'Ongoing';

        // 5. Thể loại (Tags): Lấy các thẻ <a> nằm trong khối Thể loại
        const arrayTags: Tag[] = [];
        $('span:contains("Thể loại:") + span a, a[href*="/the-loai/"], a[href*="/genre/"]').each((_, element) => {
            const label = $(element).text().trim();
            const href = $(element).attr('href') || '';
            // Lấy slug từ href (VD: /the-loai/action -> action)
            const id = href.split('/').pop()?.split('?')[0] ?? '';

            if (id && label) {
                arrayTags.push(App.createTag({ id: id, label: label }));
            }
        });

        // 6. Mô tả truyện (Description): Lấy nội dung từ thẻ <p> trong khối chứa H2 "Giới thiệu truyện"
        const $descEl = $('h2:contains("Giới thiệu truyện")').parent().find('p').first().clone();

        // Dọn dẹp nút/tiêu đề rác nếu có
        $descEl.find('h2, button').remove();

        // Xử lý xuống dòng
        $descEl.find('br').replaceWith('\n');

        const description = $descEl
            .text()
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
            .join('\n\n');

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

        $('#image-container img').each((_, element) => {
            let pageUrl = $(element).attr('src') || $(element).attr('data-src') || '';

            if (pageUrl.startsWith('//')) {
                pageUrl = `https:${pageUrl}`;
            }

            // Lọc bỏ ảnh banner, logo, placeholder rác
            if (pageUrl && !pageUrl.includes('/banner/') && !pageUrl.includes('thumb-default') && !pageUrl.includes('nettruyenviet')) {
                pages.push(pageUrl.trim());
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
        genreTags.push(App.createTag({ id: 'all', label: 'Tất cả' }));

        // 2. Thể loại (Genres) - Phân biệt loại /tim-truyen và /tag
        $('#ctl00_divRight .genres ul.nav li a').each((_, element) => {
            const label = decodeHTML($(element).text().trim());
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
            { id: 'status=', label: 'Tất cả' },
            { id: 'status=2', label: 'Hoàn thành' },
            { id: 'status=1', label: 'Đang tiến hành' },
        ];

        for (const option of statusOptions) {
            statusTags.push(App.createTag({ id: option.id, label: option.label }));
        }

        // 4. Xếp hạng (Sort Options)
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
