import { Chapter, PartialSourceManga, Tag, TagSection } from '@paperback/types';
import { CheerioAPI } from 'cheerio';
import { decodeHTML } from 'entities';

export class Parser {
    parseFeaturedSection($: CheerioAPI): PartialSourceManga[] {
        const mangaList: PartialSourceManga[] = [];

        $('.featured-slider-track li').each((_, element) => {
            const $item = $(element);

            // 1. Title & Link
            const $titleLink = $item.find('.box-description a').first();
            const title = $item.find('.film-name').text().trim();

            // 2. Manga ID
            const href = $titleLink.attr('href') || $item.find('a').first().attr('href') || '';
            const mangaId = href.split('/truyen/').pop()?.split('/')[0]?.split('?')[0] ?? '';

            // 3. Image URL (Trích xuất từ style background-image và fallback '')
            const bgStyle = $item.find('.featured-cover').attr('style') || '';
            const match = bgStyle.match(/url\(['"]?(.*?)['"]?\)/);
            let image = match?.[1] || ''; // Dùng optional chaining & fallback ''

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Subtitle
            const lastChapter = $item.find('.info-detail').text().trim();

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

        $('.item-list li.item').each((_, element) => {
            const $item = $(element);

            // 1. Title & Link chính từ thẻ <a> trong .box-description p
            const $titleLink = $item.find('.box-description p a').first();
            const title = $titleLink.text().trim();

            // 2. Manga ID từ href (lấy slug sau /truyen/)
            const href = $titleLink.attr('href') || $item.find('.box-cover a').attr('href') || '';
            const mangaId = href.split('/truyen/').pop()?.split('/')[0]?.split('?')[0] ?? '';

            // 3. Image URL từ thẻ img.img-list
            const $img = $item.find('.box-cover img').first();
            let image = $img.attr('src') || $img.attr('data-src') || '';

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Chapter/Subtitle (Lấy chuỗi thông tin chap trong thẻ <p> chứa tên truyện, ví dụ: "2 chap")
            const fullTitleText = $item.find('.box-description p').first().text().trim();
            const chapterMatch = fullTitleText.match(/-\s*(\d+\s*chap)/i);
            const lastChapter = chapterMatch ? chapterMatch[1] : undefined;

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

    parseHotSection($: CheerioAPI): PartialSourceManga[] {
        const mangaList: PartialSourceManga[] = [];

        $('.item-list li.item').each((_, element) => {
            const $item = $(element);

            // 1. Title & Link chính từ thẻ <a> trong .box-description p
            const $titleLink = $item.find('.box-description p a').first();
            const title = $titleLink.text().trim();

            // 2. Manga ID từ href (lấy slug sau /truyen/)
            const href = $titleLink.attr('href') || $item.find('.box-cover a').attr('href') || '';
            const mangaId = href.split('/truyen/').pop()?.split('/')[0]?.split('?')[0] ?? '';

            // 3. Image URL từ thẻ img.img-list
            const $img = $item.find('.box-cover img').first();
            let image = $img.attr('src') || $img.attr('data-src') || '';

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Chapter/Subtitle (Lấy chuỗi thông tin chap trong thẻ <p> chứa tên truyện, ví dụ: "2 chap")
            const fullTitleText = $item.find('.box-description p').first().text().trim();
            const chapterMatch = fullTitleText.match(/-\s*(\d+\s*chap)/i);
            const lastChapter = chapterMatch ? chapterMatch[1] : undefined;

            // 5. Lấy số lượt xem từ thẻ <p> chứa "Lượt xem:"
            const viewsText = $item
                .find('.box-description p')
                .filter((_, el) => $(el).find('b.info').text().includes('Lượt xem'))
                .text()
                .replace(/Lượt xem:\s*/i, '')
                .trim();

            const subtitle = viewsText ? `👁 ${viewsText}` : undefined;

            if (mangaId && title && !mangaId.includes('javascript')) {
                mangaList.push(
                    App.createPartialSourceManga({
                        mangaId: mangaId,
                        title: title,
                        image: image,
                        subtitle: subtitle,
                    })
                );
            }
        });

        return mangaList;
    }

    parseRandomSection($: CheerioAPI): PartialSourceManga[] {
        const mangaList: PartialSourceManga[] = [];

        $('ul.page-random li').each((_, element) => {
            const $item = $(element);

            // 1. Link & Manga ID từ href (lấy slug sau /truyen/)
            const href = $item.find('a').first().attr('href') || '';
            const mangaId = href.split('/truyen/').pop()?.split('/')[0]?.split('?')[0] ?? '';

            // 2. Title từ .film-name hoặc alt của thẻ <img>
            const title = $item.find('.film-name').text().trim() || $item.find('img').attr('alt')?.trim() || '';

            // 3. Image URL từ thẻ <img>
            const $img = $item.find('img').first();
            let image = $img.attr('src') || $img.attr('data-src') || '';

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Chapter từ .meta (VD: "Chap 2")
            const lastChapter = $item.find('.meta').text().trim() || undefined;

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

    // Parse danh sách truyện (Search, Homepage, ViewMore)
    parseSearchResults($: CheerioAPI): PartialSourceManga[] {
        const mangaList: PartialSourceManga[] = [];

        $('.item-list li.item').each((_, element) => {
            const $item = $(element);

            // 1. Title & Link chính từ thẻ <a> trong .box-description p
            const $titleLink = $item.find('.box-description p a').first();
            const title = $titleLink.text().trim();

            // 2. Manga ID từ href (lấy slug sau /truyen/)
            const href = $titleLink.attr('href') || $item.find('.box-cover a').attr('href') || '';
            const mangaId = href.split('/truyen/').pop()?.split('/')[0]?.split('?')[0] ?? '';

            // 3. Image URL từ thẻ img.img-list
            const $img = $item.find('.box-cover img').first();
            let image = $img.attr('src') || $img.attr('data-src') || '';

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Chapter/Subtitle (Lấy chuỗi thông tin chap trong thẻ <p> chứa tên truyện, ví dụ: "2 chap")
            const fullTitleText = $item.find('.box-description p').first().text().trim();
            const chapterMatch = fullTitleText.match(/-\s*(\d+\s*chap)/i);
            const lastChapter = chapterMatch ? chapterMatch[1] : undefined;

            // 5. Lấy số lượt xem từ thẻ <p> chứa "Lượt xem:"
            const viewsText = $item
                .find('.box-description p')
                .filter((_, el) => $(el).find('b.info').text().includes('Lượt xem'))
                .text()
                .replace(/Lượt xem:\s*/i, '')
                .trim();

            const subtitle = viewsText ? `👁 ${viewsText}` : undefined;

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
        const $pageInfo = $('.page-info').first();

        // 1. Tiêu đề
        const title = $pageInfo.find('h1[itemprop="name"]').text().trim();

        // 2. Ảnh bìa
        let image = $('.page-ava img').first().attr('src') || '';
        if (image.startsWith('//')) {
            image = `https:${image}`;
        }

        // 3. Tác giả & Nhóm dịch
        const getInfoText = (label: string): string => {
            return $pageInfo
                .find('p')
                .filter((_, el) => $(el).find('span.info').text().includes(label))
                .find('span')
                .last()
                .text()
                .trim();
        };

        const authorVal = getInfoText('Tác giả');
        const author = authorVal && authorVal !== 'Đang cập nhật' ? authorVal : 'Đang cập nhật';

        // 4. Trạng thái
        const statusVal = getInfoText('Tình Trạng');
        const status = statusVal.includes('Đã hoàn thành') ? 'Completed' : 'Ongoing';

        // 5. Thể loại (Tags)
        const arrayTags: Tag[] = [];
        $pageInfo.find('a.tag').each((_, element) => {
            const label = $(element).text().trim();
            const href = $(element).attr('href') || '';
            // Lấy slug đằng sau /the-loai/
            const id = href.split('/the-loai/').pop()?.split('/')[0]?.split('?')[0] ?? '';

            if (id && label) {
                arrayTags.push(App.createTag({ id: id, label: label }));
            }
        });

        // 6. Mô tả (Lấy Tên khác + Lượt xem + Nội dung truyện)
        const altName = getInfoText('Tên Khác');

        // Lấy lượt xem nằm trong span đứng sau span.info "Lượt xem:"
        const views = $pageInfo
            .find('span.info')
            .filter((_, el) => $(el).text().includes('Lượt xem'))
            .next('span')
            .text()
            .trim();

        // Nội dung: Lấy text của thẻ <p style="white-space:pre-wrap">
        const rawDesc = $pageInfo.find('p[style*="white-space:pre-wrap"]').text().trim();

        const descParts: string[] = [];
        if (altName) descParts.push(`Tên khác: ${altName}`);
        if (views) descParts.push(`👁 Lượt xem: ${views}`);
        if (rawDesc) descParts.push(`\n${rawDesc}`);

        const description = descParts.join('\n');

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
    parseDate(dateStr: string): Date {
        if (!dateStr) return new Date();

        // Tách "1/8/2026" -> day = 1, month = 8, year = 2026
        const [dayStr, monthStr, yearStr] = dateStr.split('/');

        if (dayStr && monthStr && yearStr) {
            const day = parseInt(dayStr, 10);
            const month = parseInt(monthStr, 10) - 1; // JS Month chạy từ 0 đến 11 (Tháng 8 = index 7)
            const year = parseInt(yearStr, 10);

            return new Date(year, month, day);
        }

        return new Date();
    }

    // Parse trực tiếp mảng JSON thành danh sách Chapter
    parseChapterList($: CheerioAPI): Chapter[] {
        const chapters: Chapter[] = [];

        // Bắt chính xác danh sách các dòng chương từ table.listing
        $('table.listing tbody tr').each((index, element) => {
            const $row = $(element);
            const $a = $row.find('td a').first();

            // 1. Tên chương (Lấy từ h2.chuong_t)
            const chapterName = $row.find('h2.chuong_t').text().trim() || $a.text().trim();

            // 2. Lấy href (Ví dụ: "/truyen/dao-tan-bu-co-ban-tomboy-thuo-nho/1-ban-ngot-lim")
            const href = $a.attr('href') || '';

            // Tách lấy slug làm chapter ID (Kết quả: "dao-tan-bu-co-ban-tomboy-thuo-nho/1-ban-ngot-lim")
            const rawSlug = href.split('/truyen/').pop() ?? '';
            const chapterId = rawSlug.split('?')[0] || href;

            // 3. Trích xuất số chương (chapNum)
            const chapNumMatch = chapterName.match(/(\d+(?:\.\d+)?)/);
            const chapNum = chapNumMatch?.[1] ? parseFloat(chapNumMatch[1]) : index + 1;

            // 4. Thời gian cập nhật (Lấy từ <td> thứ 2: "1/8/2026")
            const timeStr = $row.find('td').last().text().trim(); // "1/8/2026"
            const time = this.parseDate(timeStr); // Trả về đối tượng Date chuẩn (1/8/2026)

            if (chapterId && chapterName) {
                chapters.push(
                    App.createChapter({
                        id: chapterId,
                        name: chapterName,
                        chapNum: chapNum,
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

        // Lấy tất cả ảnh nằm trong #image
        $('#image img').each((_, element) => {
            const $img = $(element);

            // Lấy link ảnh từ src, data-src hoặc data-original
            let pageUrl = $img.attr('src') || $img.attr('data-src') || $img.attr('data-original') || '';

            // Xử lý link bắt đầu bằng //
            if (pageUrl.startsWith('//')) {
                pageUrl = `https:${pageUrl}`;
            }

            // Lọc bỏ đường dẫn rỗng hoặc ảnh thumbnail mặc định
            if (pageUrl && !pageUrl.includes('thumb-default')) {
                pages.push(pageUrl.trim());
            }
        });

        return pages;
    }

    // Parse danh sách thể loại (Tags)
    parseTags($: CheerioAPI): TagSection[] {
        const genreTags: Tag[] = [];
        const sortTags: Tag[] = [];

        // 1. Thể loại (Genres) từ ul.genre-cloud
        $('ul.genre-cloud li a').each((_, element) => {
            const $item = $(element);
            const label = $item.text().trim();
            const href = $item.attr('href') || '';

            // Trích xuất slug từ href (VD: /the-loai/3d-hentai -> 3d-hentai)
            const slug = href.split('/the-loai/').pop()?.split('/')[0]?.split('?')[0];

            if (slug && label) {
                genreTags.push(
                    App.createTag({
                        id: `${slug}`,
                        label: label,
                    })
                );
            }
        });

        // 2. Xếp hạng (Sort Options)
        const sortOptions = [
            { id: 'sort=latest', label: 'Mới nhất' },
            { id: 'sort=oldest', label: 'Cũ nhất' },
            { id: 'sort=most-viewed', label: 'Xem nhiều nhất' },
            { id: 'sort=least-viewed', label: 'Xem ít nhất' },
        ];

        for (const option of sortOptions) {
            sortTags.push(App.createTag({ id: option.id, label: option.label }));
        }

        return [App.createTagSection({ id: 'genres', label: 'Thể loại', tags: genreTags }), App.createTagSection({ id: 'sort', label: 'Sắp xếp', tags: sortTags })];
    }
}
