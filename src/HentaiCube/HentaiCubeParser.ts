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

        $('.page-listing-item .page-item-detail').each((_, element) => {
            const $item = $(element);

            // 1. Title & Link chính từ thẻ <a> trong .post-title
            const $titleLink = $item.find('.post-title a').first();
            const title = $titleLink.text().replace(/\s+/g, ' ').trim();

            // 2. Manga ID từ href (Lấy slug sau /read/ hoặc fallback theo URL path)
            const href = $titleLink.attr('href') || $item.find('.item-thumb a').attr('href') || '';
            let mangaId = '';

            if (href.includes('/read/')) {
                mangaId = href.split('/read/').pop()?.split('/')[0] ?? '';
            } else {
                // Fallback nếu link cấu trúc khác: lấy segment cuối cùng trước slash kết thúc
                const segments = href.replace(/\/$/, '').split('/');
                mangaId = segments.pop() ?? '';
            }

            // 3. Image URL từ thẻ img trong .item-thumb
            const $img = $item.find('.item-thumb img').first();
            let image = $img.attr('src') || $img.attr('data-src') || $img.attr('srcset')?.split(' ')[0] || '';

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Chapter/Subtitle (Lấy tên chapter mới nhất từ .list-chapter .chapter-item)
            const lastChapter = $item.find('.list-chapter .chapter-item .chapter a').first().text().replace(/\s+/g, ' ').trim() || undefined;

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
        // 1. Tiêu đề (Nằm trong .post-title h1)
        const title = $('.post-title h1').text().replace(/\s+/g, ' ').trim();

        // 2. Ảnh bìa (Nằm trong .summary_image img)
        const $img = $('.summary_image img').first();
        let image = $img.attr('src') || $img.attr('data-src') || $img.attr('srcset')?.split(' ')[0] || '';
        if (image.startsWith('//')) {
            image = `https:${image}`;
        }

        // Helper hàm lấy nội dung theo nhãn (dựa vào cấu trúc .post-content_item)
        const getSummaryContent = (label: string): string => {
            let result = '';
            $('.post-content_item').each((_, el) => {
                const heading = $(el).find('.summary-heading h5').text().replace(/\s+/g, ' ').trim();
                if (heading.toLowerCase().includes(label.toLowerCase())) {
                    result = $(el).find('.summary-content').text().replace(/\s+/g, ' ').trim();
                    return false; // break loop
                }
            });
            return result;
        };

        // 3. Tác giả
        const authorVal = getSummaryContent('Tác giả');
        const author = authorVal && authorVal !== 'Đang cập nhật' ? authorVal : 'Đang cập nhật';

        // 4. Trạng thái (Nằm trong .post-status .summary-content)
        const statusVal = getSummaryContent('Tình trạng');
        const status = statusVal.toLowerCase().includes('hoàn thành') ? 'Completed' : 'Ongoing';

        // 5. Thể loại (Tags - Nằm trong .genres-content a)
        const arrayTags: Tag[] = [];
        $('.genres-content a').each((_, element) => {
            const label = $(element).text().replace(/\s+/g, ' ').trim();
            const href = $(element).attr('href') || '';

            // Lấy slug từ URL thể loại
            const segments = href.replace(/\/$/, '').split('/');
            const id = segments.pop() ?? '';

            if (id && label) {
                arrayTags.push(App.createTag({ id: id, label: label }));
            }
        });

        // 6. Mô tả & Metadata mở rộng
        const altName = getSummaryContent('Tên khác');

        // Lấy thời gian đăng từ .thoigian
        const postTime = $('.thoigian p').text().replace(/\s+/g, ' ').trim();

        // Lượt xem nằm trong .manga-rate-view-comment .icon.ion-ios-eye
        const views = $('.manga-rate-view-comment .ion-ios-eye').parent().text().replace(/\s+/g, ' ').trim();

        // Nội dung tóm tắt
        const rawDesc = $('.manga-excerpt, .description-summary .summary__content, .entry-content_wrap').first().text().trim();

        const descParts: string[] = [];
        if (altName) descParts.push(`Tên khác: ${altName}`);
        if (postTime) descParts.push(`⏰ ${postTime}`);
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

        // Chuyển Cheerio object thành Array và đảo ngược thứ tự (CỦ NHẤT -> MỚI NHẤT)
        const chapterElements = $('.listing-chapters_wrap ul.main li.wp-manga-chapter').toArray().reverse();

        chapterElements.forEach((element, index) => {
            const $li = $(element);
            const $a = $li.find('a').first();

            // 1. Tên chương (Xóa khoảng trắng thừa)
            const chapterName = $a.text().replace(/\s+/g, ' ').trim();

            // 2. Lấy href và bóc tách chapterId
            const href = $a.attr('href') || '';
            const rawSlug = href.replace(/\/$/, '').split('/read/').pop() ?? '';
            const chapterId = rawSlug.split('?')[0] || href;

            // 3. Thời gian đăng
            const $dateContainer = $li.find('.chapter-release-date');
            const timeStr = ($dateContainer.find('a.c-new-tag').attr('title') || $dateContainer.find('i').text() || $dateContainer.text()).replace(/\s+/g, ' ').trim();

            const time = this.parseDate(timeStr);

            if (chapterId && chapterName) {
                chapters.push(
                    App.createChapter({
                        id: chapterId,
                        name: chapterName,
                        chapNum: index + 1, // index 0 (Chap 1A) -> 1, index 1 (Chap 1B) -> 2, ...
                        langCode: '🇻🇳',
                        group: timeStr,
                        time: time,
                    })
                );
            }
        });

        return chapters;
    }

    // Parse danh sách thể loại (Tags)
    parseTags($: CheerioAPI): TagSection[] {
        const genreTags: Tag[] = [];
        const sortTags: Tag[] = [];

        // 1. Thể loại: ID CHỈ NÊN LÀ SLUG (Ví dụ: "3d-hentai", không chứa "=")
        $('ul.genre-cloud li a').each((_, element) => {
            const $item = $(element);
            const label = $item.text().trim();
            const href = $item.attr('href') || '';

            // Trích xuất slug từ href (VD: /the-loai/3d-hentai -> 3d-hentai)
            const slug = href.split('/the-loai/').pop()?.split('/')[0]?.split('?')[0];

            if (slug && label) {
                genreTags.push(
                    App.createTag({
                        id: slug, // Chỉ lưu slug thuần túy
                        label: label,
                    })
                );
            }
        });

        // 2. Sắp xếp: ID giữ dạng "key=value" (chứa "=")
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
