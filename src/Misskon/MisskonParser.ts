import { Chapter, PartialSourceManga, Tag, TagSection } from '@paperback/types';
import { CheerioAPI } from 'cheerio';
import { decodeHTML } from 'entities';

export class Parser {
    parseNewUpdatedSection($: CheerioAPI): PartialSourceManga[] {
        const mangaList: PartialSourceManga[] = [];

        $('.post-listing article.item-list').each((_, element) => {
            const $item = $(element);

            // 1. Title & Link
            const $titleLink = $item.find('.post-box-title a').first();
            const title = $titleLink.text().trim();
            const href = $titleLink.attr('href') || $item.find('.post-thumbnail a').attr('href') || '';

            // 2. Manga ID
            let mangaId = '';
            try {
                const urlObj = new URL(href);
                mangaId = urlObj.pathname.replace(/^\/|\/$/g, '');
            } catch {
                mangaId = href.replace(/^https?:\/\/[^\/]+/, '').replace(/^\/|\/$/g, '');
            }

            // 3. Image URL
            const $img = $item.find('.post-thumbnail img').first();
            let image = $img.attr('data-src') || $img.attr('src') || '';

            if (image.startsWith('data:image')) {
                image = $img.attr('data-src') || '';
            }

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Subtitle (Đã fix lỗi TS2532)
            const subtitleMatch = title.match(/\(([^)]+photos[^)]*)\)/i);
            const subtitle = subtitleMatch?.[1]?.trim();

            const compositeId = `${mangaId}|${encodeURIComponent(image)}`;

            if (mangaId && title) {
                mangaList.push(
                    App.createPartialSourceManga({
                        mangaId: compositeId,
                        title: title,
                        image: image,
                        subtitle: subtitle,
                    })
                );
            }
        });

        return mangaList;
    }

    parseHotSection($: CheerioAPI): PartialSourceManga[] {
        const mangaList: PartialSourceManga[] = [];

        $('.post-listing article.item-list').each((_, element) => {
            const $item = $(element);

            // 1. Title & Link từ thẻ <a> trong .post-box-title
            const $titleLink = $item.find('.post-box-title a').first();
            const title = $titleLink.text().trim();
            const href = $titleLink.attr('href') || $item.find('.post-thumbnail a').attr('href') || '';

            // 2. Manga ID từ URL (VD: "https://misskon.com/99983-pure-media-vol300-yeha-165-photos/"
            // -> "99983-pure-media-vol300-yeha-165-photos")
            let mangaId = '';
            try {
                const urlObj = new URL(href);
                mangaId = urlObj.pathname.replace(/^\/|\/$/g, '');
            } catch {
                mangaId = href.replace(/^https?:\/\/[^\/]+/, '').replace(/^\/|\/$/g, '');
            }

            // 3. Image URL: Ưu tiên data-src do site sử dụng Lazy Loading (src mặc định chứa SVG placeholder)
            const $img = $item.find('.post-thumbnail img').first();
            let image = $img.attr('data-src') || $img.attr('src') || '';

            if (image.startsWith('data:image')) {
                image = $img.attr('data-src') || '';
            }

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Subtitle: Bóc tách số lượng photos/videos trong tiêu đề (VD: "(38 photos + 2 videos)")
            const subtitleMatch = title.match(/\(([^)]*(?:photos|pictures|videos)[^)]*)\)/i);
            const subtitle = subtitleMatch?.[1]?.trim();

            // Ghép ID và URL ảnh bìa
            const compositeId = `${mangaId}|${encodeURIComponent(image)}`;

            if (mangaId && title) {
                mangaList.push(
                    App.createPartialSourceManga({
                        mangaId: compositeId,
                        title: title,
                        image: image,
                        subtitle: subtitle,
                    })
                );
            }
        });

        return mangaList;
    }

    parseMayLikeSection($: CheerioAPI): PartialSourceManga[] {
        const mangaList: PartialSourceManga[] = [];

        $('.widget-container .post-thumbnail').each((_, element) => {
            const $thumb = $(element);
            const $thumbLink = $thumb.find('a').first();

            // 1. Tiêu đề: Lấy từ h3 đứng liền sau .post-thumbnail
            const $h3 = $thumb.next('h3');
            const $titleLink = $h3.find('a').first();
            const title = $titleLink.text().trim() || $thumbLink.attr('title')?.trim() || '';

            // 2. Link & Manga ID
            const href = $titleLink.attr('href') || $thumbLink.attr('href') || '';
            let mangaId = '';
            try {
                const urlObj = new URL(href);
                mangaId = urlObj.pathname.replace(/^\/|\/$/g, '');
            } catch {
                mangaId = href.replace(/^https?:\/\/[^\/]+/, '').replace(/^\/|\/$/g, '');
            }

            // 3. Image URL: Ưu tiên data-src do site dùng Lazy Loading
            const $img = $thumb.find('img').first();
            let image = $img.attr('data-src') || $img.attr('src') || '';

            if (image.startsWith('data:image')) {
                image = $img.attr('data-src') || '';
            }

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Subtitle: Bóc tách thông tin (VD: "129 photos + 3 videos" hoặc "23 photos")
            const subtitleMatch = title.match(/\(([^)]*(?:photos|anh|pictures|videos)[^)]*)\)/i);
            const subtitle = subtitleMatch?.[1]?.trim();

            // Ghép ID và URL ảnh bìa
            const compositeId = `${mangaId}|${encodeURIComponent(image)}`;

            if (mangaId && title) {
                mangaList.push(
                    App.createPartialSourceManga({
                        mangaId: compositeId,
                        title: title,
                        image: image,
                        subtitle: subtitle,
                    })
                );
            }
        });

        return mangaList;
    }

    // Parse danh sách truyện (Search, Homepage, ViewMore)
    parseSearchResults($: CheerioAPI): PartialSourceManga[] {
        const mangaList: PartialSourceManga[] = [];

        $('.post-listing article.item-list').each((_, element) => {
            const $item = $(element);

            // 1. Title & Link từ thẻ <a> trong .post-box-title
            const $titleLink = $item.find('.post-box-title a').first();
            const title = $titleLink.text().trim();
            const href = $titleLink.attr('href') || $item.find('.post-thumbnail a').attr('href') || '';

            // 2. Manga ID từ URL (VD: "https://misskon.com/99983-pure-media-vol300-yeha-165-photos/"
            // -> "99983-pure-media-vol300-yeha-165-photos")
            let mangaId = '';
            try {
                const urlObj = new URL(href);
                mangaId = urlObj.pathname.replace(/^\/|\/$/g, '');
            } catch {
                mangaId = href.replace(/^https?:\/\/[^\/]+/, '').replace(/^\/|\/$/g, '');
            }

            // 3. Image URL: Ưu tiên data-src do site sử dụng Lazy Loading (src mặc định chứa SVG placeholder)
            const $img = $item.find('.post-thumbnail img').first();
            let image = $img.attr('data-src') || $img.attr('src') || '';

            if (image.startsWith('data:image')) {
                image = $img.attr('data-src') || '';
            }

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Subtitle: Bóc tách số lượng photos/videos trong tiêu đề (VD: "(38 photos + 2 videos)")
            const subtitleMatch = title.match(/\(([^)]*(?:photos|pictures|videos)[^)]*)\)/i);
            const subtitle = subtitleMatch?.[1]?.trim();

            // Ghép ID và URL ảnh bìa
            const compositeId = `${mangaId}|${encodeURIComponent(image)}`;

            if (mangaId && title) {
                mangaList.push(
                    App.createPartialSourceManga({
                        mangaId: compositeId,
                        title: title,
                        image: image,
                        subtitle: subtitle,
                    })
                );
            }
        });

        return mangaList;
    }

    // Parse thông tin chi tiết truyện
    parseMangaDetails($: CheerioAPI, compositeId: string) {
        // 1. Tiêu đề
        const rawTitle = $('h1.post-title, .entry-title, h1').first().text().trim();
        const title = rawTitle.replace(/\s*-\s*\(\s*Page\s*\d+\s*\/\s*\d+\s*\)$/i, '').trim();

        // 2. Bóc tách Lượt xem (Views)
        const viewsText = $('.post-meta .post-views').text().trim();
        const viewsMatch = viewsText.match(/([\d,.]+)/);
        const views = viewsMatch?.[1] ? parseInt(viewsMatch[1].replace(/[,.]/g, ''), 10) : undefined;

        // 3. Tác giả / Nguồn đăng
        let author = 'MissKON';
        const infoText = $('.box.info').text();
        const albumMatch = infoText.match(/Album title:\s*([^\n\r]+)/i);
        if (albumMatch?.[1]) {
            author = albumMatch[1].trim();
        }

        // 4. Tags
        const arrayTags: Tag[] = [];
        $('.post-tags a, .box.info a[href*="/tag/"]').each((_, element) => {
            const $tag = $(element);
            const label = $tag.text().trim();
            const href = $tag.attr('href') || '';

            const id = href.replace(/\/$/, '').split('/tag/')[1]?.trim() || '';

            if (id && label && !arrayTags.some((t) => t.id === id)) {
                arrayTags.push(App.createTag({ id: id, label: label }));
            }
        });

        // 5. Mô tả (Đã fix lỗi bị xuống dòng ở dấu :)
        const descParts: string[] = [];

        if (views !== undefined) {
            descParts.push(`👁️ ${viewsText}`);
        }

        // Lấy html trong box info, chuyển thẻ <br> thành ký tự xuống dòng
        const $boxInner = $('.box.info .box-inner-block').clone();
        $boxInner.find('br').replaceWith('\n');

        const cleanInfoText = $boxInner
            .text()
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line && !line.includes('INFORMATION:') && !line.includes('For albums with'))
            .join('\n')
            // Nối các dòng bị ngắt ngay sau dấu ":" (Ví dụ: "Dimensions:\n8K" -> "Dimensions: 8K")
            .replace(/:\s*\n\s*/g, ': ');

        if (cleanInfoText) {
            descParts.push(cleanInfoText);
        }

        const description = descParts.length > 0 ? descParts.join('\n') : infoText.trim();

        // 6. Ảnh bìa
        const [realMangaId, encodedCover] = compositeId.split('|');
        let homeCoverUrl = encodedCover ? decodeURIComponent(encodedCover) : '';

        if (!homeCoverUrl) {
            const $firstImg = $('.entry img').first();
            homeCoverUrl = $firstImg.attr('data-src') || $firstImg.attr('src') || '';
            if (homeCoverUrl.startsWith('data:image')) {
                homeCoverUrl = $firstImg.attr('data-src') || '';
            }
            if (homeCoverUrl.startsWith('//')) {
                homeCoverUrl = `https:${homeCoverUrl}`;
            }
        }

        return App.createSourceManga({
            id: compositeId,
            mangaInfo: App.createMangaInfo({
                titles: [decodeHTML(title)],
                image: homeCoverUrl,
                status: 'Completed',
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
        const seenChapNums = new Set<number>();

        // 1. Lấy canonical slug của bài viết (dùng làm ID cho Trang 1)
        const canonicalHref = $('link[rel="canonical"]').attr('href') || '';
        const mainSlug = canonicalHref
            ? canonicalHref
                  .replace(/^https?:\/\/[^\/]+\//, '')
                  .replace(/\/$/, '')
                  .trim()
            : '';

        // 2. Duyệt qua tất cả các phần tử phân trang trong .page-link
        $('.page-link .post-page-numbers').each((_, element) => {
            const $el = $(element);
            const pageText = $el.text().trim();
            const chapNum = parseInt(pageText, 10);

            // Bỏ qua nếu không phải số hoặc đã được thêm vào danh sách
            if (isNaN(chapNum) || seenChapNums.has(chapNum)) return;

            let chapterId = '';

            if ($el.is('a')) {
                // Các trang 2, 3... (thẻ <a>) -> Lấy href bóc tách slug
                // VD: "https://misskon.com/114784-x-level-rosy-hardcore-debut-73-photos/2/"
                // -> "114784-x-level-rosy-hardcore-debut-73-photos/2"
                const href = $el.attr('href') || '';
                chapterId = href
                    .replace(/^https?:\/\/[^\/]+\//, '')
                    .replace(/\/$/, '')
                    .trim();
            } else {
                // Trang 1 hiện tại (thẻ <span>) -> Dùng mainSlug
                chapterId = mainSlug;
            }

            if (chapterId) {
                seenChapNums.add(chapNum);
                chapters.push(
                    App.createChapter({
                        id: chapterId,
                        name: `Trang ${chapNum}`,
                        chapNum: chapNum,
                        time: new Date(),
                    })
                );
            }
        });

        // 3. Fallback: Nếu bài viết ngắn chỉ có 1 trang (không có block .page-link)
        if (chapters.length === 0 && mainSlug) {
            chapters.push(
                App.createChapter({
                    id: mainSlug,
                    name: 'Trang 1',
                    chapNum: 1,
                    time: new Date(),
                })
            );
        }

        return chapters;
    }

    // Parse danh sách trang ảnh trong chapter
    parseChapterDetails($: CheerioAPI): string[] {
        const pages: string[] = [];

        // 1. Selector đổi từ .article-fulltext sang .entry img
        $('.entry img').each((_, element) => {
            const $img = $(element);

            // 2. Ưu tiên lấy data-src trước do site dùng Lazy Load (src mặc định chứa chuỗi SVG placeholder)
            let pageUrl = $img.attr('data-src') || $img.attr('src') || $img.attr('data-original') || '';
            pageUrl = pageUrl.trim();

            // 3. Nếu giá trị lấy được dính SVG placeholder của Lazy Load thì fallback lại data-src
            if (pageUrl.startsWith('data:image')) {
                pageUrl = $img.attr('data-src') || '';
            }

            // 4. Chuẩn hóa link tương đối (bắt đầu bằng //)
            if (pageUrl.startsWith('//')) {
                pageUrl = `https:${pageUrl}`;
            }

            // 5. Lọc bỏ link rỗng, ảnh SVG placeholder và các ảnh trùng lặp
            if (pageUrl && !pageUrl.startsWith('data:image') && !pageUrl.includes('thumb-default') && !pages.includes(pageUrl)) {
                pages.push(pageUrl);
            }
        });

        return pages;
    }

    // Parse danh sách thể loại (Tags)
    parseTags($: CheerioAPI): TagSection[] {
        const sections: TagSection[] = [];

        // Danh sách các tiêu đề/nhóm tag cần bóc tách
        const categoryTitles = ['Chinese', 'Korean', 'Other'];

        categoryTitles.forEach((catTitle, index) => {
            const tags: Tag[] = [];

            // Tìm thẻ <p class="post-meta"> chứa tiêu đề nhóm tương ứng
            $('.entry p.post-meta').each((_, pEl) => {
                const $p = $(pEl);
                if ($p.text().toLowerCase().includes(catTitle.toLowerCase())) {
                    // Lấy tất cả thẻ span.tag-counterz nằm sau tiêu đề cho tới tiêu đề/clear tiếp theo
                    $p.nextUntil('p.post-meta, .clear', 'span.tag-counterz').each((_, spanEl) => {
                        const $span = $(spanEl);
                        const $a = $span.find('a').first();
                        const href = $a.attr('href') || '';

                        // Lấy nhãn tên tag (ví dụ: "XIUREN")
                        const label = $a.find('strong').text().trim() || $a.text().trim();

                        // Lấy số lượng bài viết đính kèm trong ngoặc (ví dụ: "(7571)")
                        const countMatch = $span.text().match(/\((\d+)\)/);
                        const countText = countMatch ? ` (${countMatch[1]})` : '';

                        // Bóc tách slug/id từ URL /tag/xiuren/ -> "xiuren"
                        let id = '';
                        try {
                            const urlObj = new URL(href);
                            id = urlObj.pathname.replace(/^\/tag\/|\/$/g, '');
                        } catch {
                            id = href.replace(/^https?:\/\/[^\/]+\/tag\//, '').replace(/\/$/, '');
                        }

                        if (id && label) {
                            tags.push(
                                App.createTag({
                                    id: id,
                                    label: `${label}${countText}`,
                                })
                            );
                        }
                    });
                }
            });

            if (tags.length > 0) {
                sections.push(
                    App.createTagSection({
                        id: `cat_${index + 1}`,
                        label: catTitle,
                        tags: tags,
                    })
                );
            }
        });

        return sections;
    }
}
