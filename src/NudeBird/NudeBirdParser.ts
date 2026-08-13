import { Chapter, PartialSourceManga, Tag, TagSection } from '@paperback/types';
import { CheerioAPI } from 'cheerio';
import { decodeHTML } from 'entities';

export class Parser {
    parseFeaturedSection($: CheerioAPI): PartialSourceManga[] {
        const mangaList: PartialSourceManga[] = [];

        $('.full-slider-container .slider-item').each((_, element) => {
            const $item = $(element);

            // 1. Title & Link
            const $titleLink = $item.find('a.for-ads').first();
            const $titleEl = $item.find('.slide-title').first();
            const title = $titleEl.text().trim();
            const href = $titleLink.attr('href') || '';

            // 2. Manga ID
            let mangaId = '';
            try {
                const urlObj = new URL(href);
                mangaId = urlObj.pathname.replace(/^\/|\/$/g, '');
            } catch {
                mangaId = href.replace(/^https?:\/\/[^\/]+/, '').replace(/^\/|\/$/g, '');
            }

            // 3. Image URL
            const $img = $item.find('img').first();
            let image = $img.attr('data-lazy-src') || $img.attr('data-src') || $img.attr('src') || '';

            if (image.startsWith('data:image')) {
                image = $img.attr('data-lazy-src') || $img.attr('data-src') || '';
            }

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Subtitle (khớp logic lấy số trang từ tiêu đề)
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

        // Cập nhật selector theo cấu trúc HTML mới: li.post-box.horizontal-small
        $('li.post-box.horizontal-small').each((_, element) => {
            const $item = $(element);

            // 1. Title & Link: Ưu tiên lấy từ thẻ <a> trong .post-title, lấy thuộc tính title (nếu có) để tránh bị cắt chữ (…), sau đó đến text
            const $titleLink = $item.find('.post-title a').first();
            const $thumbLink = $item.find('.post-img a').first();

            const title = $titleLink.attr('title')?.trim() || $titleLink.text().trim() || $thumbLink.attr('title')?.trim() || '';

            // 2. Link & Manga ID
            const href = $titleLink.attr('href') || $thumbLink.attr('href') || '';
            let mangaId = '';
            try {
                const urlObj = new URL(href);
                mangaId = urlObj.pathname.replace(/^\/|\/$/g, '');
            } catch {
                mangaId = href.replace(/^https?:\/\/[^\/]+/, '').replace(/^\/|\/$/g, '');
            }

            // 3. Image URL: Ưu tiên data-lazy-src do site dùng Lazy Loading, sau đó đến src
            const $img = $item.find('.post-img img').first();
            let image = $img.attr('data-lazy-src') || $img.attr('data-src') || $img.attr('src') || '';

            if (image.startsWith('data:image')) {
                image = $img.attr('data-lazy-src') || $img.attr('data-src') || '';
            }

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Subtitle: Bóc tách thông tin (VD: "[43P]" hoặc số lượng ảnh/video từ title)
            const subtitleMatch = title.match(/\(([^)]*(?:photos|anh|pictures|videos|P)[^)]*)\)/i);
            const subtitle = subtitleMatch?.[1]?.trim();

            // Ghép ID và URL ảnh bìa
            const compositeId = `${mangaId}|${encodeURIComponent(image)}`;

            if (mangaId && title) {
                mangaList.push(
                    App.createPartialSourceManga({
                        mangaId: compositeId,
                        title: decodeHTML(title),
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

        // Cập nhật selector theo cấu trúc HTML mới: article.latestPost.excerpt
        $('article.latestPost.excerpt').each((_, element) => {
            const $item = $(element);

            // 1. Title & Link từ thẻ <a> bao bọc ảnh hoặc thẻ <h2> tiêu đề
            const $titleLink = $item.find('header h2.title a').first();
            const $thumbLink = $item.find('a.post-image').first();

            const title = $titleLink.text().trim() || $thumbLink.attr('title') || '';
            const href = $titleLink.attr('href') || $thumbLink.attr('href') || '';

            // 2. Manga ID từ URL
            let mangaId = '';
            try {
                const urlObj = new URL(href);
                mangaId = urlObj.pathname.replace(/^\/|\/$/g, '');
            } catch {
                mangaId = href.replace(/^https?:\/\/[^\/]+/, '').replace(/^\/|\/$/g, '');
            }

            // 3. Image URL: Ưu tiên data-lazy-src, sau đó đến data-src và src
            const $img = $item.find('img').first();
            let image = $img.attr('data-lazy-src') || $img.attr('data-src') || $img.attr('src') || '';

            if (image.startsWith('data:image')) {
                image = $img.attr('data-lazy-src') || $img.attr('data-src') || '';
            }

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Subtitle: Bóc tách số lượng photos/videos trong tiêu đề (VD: "[44P]")
            const subtitleMatch = title.match(/\(([^)]*(?:photos|pictures|videos|P)[^)]*)\)/i);
            const subtitle = subtitleMatch?.[1]?.trim();

            // Ghép ID và URL ảnh bìa
            const compositeId = `${mangaId}|${encodeURIComponent(image)}`;

            if (mangaId && title) {
                mangaList.push(
                    App.createPartialSourceManga({
                        mangaId: compositeId,
                        title: decodeHTML(title),
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
        let author = 'ADMIN';

        // 4. Tags
        const arrayTags: Tag[] = [];
        $('.tags a, .post-tags a, .box.info a[href*="/tag/"]').each((_, element) => {
            const $tag = $(element);
            const label = $tag.text().trim();
            const href = $tag.attr('href') || '';

            // Lấy nguyên toàn bộ slug từ pathname làm id
            let id = '';
            try {
                const urlObj = new URL(href);
                id = urlObj.pathname.replace(/^\/|\/$/g, '');
            } catch {
                id = href.replace(/^https?:\/\/[^\/]+/, '').replace(/^\/|\/$/g, '');
            }

            if (id && label && !arrayTags.some((t) => t.id === id)) {
                arrayTags.push(App.createTag({ id: id, label: label }));
            }
        });

        // 5. Mô tả
        const descParts: string[] = [];

        if (views !== undefined) {
            descParts.push(`👁️ ${viewsText}`);
        }

        const dateText = $('.post-info .thetime').first().text().trim();
        if (dateText) {
            descParts.push(dateText);
        }

        const description = descParts.length > 0 ? descParts.join('\n') : '';

        // 6. Ảnh bìa
        const [realMangaId, encodedCover] = compositeId.split('|');
        let homeCoverUrl = encodedCover ? decodeURIComponent(encodedCover) : '';

        if (!homeCoverUrl) {
            const $firstImg = $('.entry-content img, .thecontent img').first();
            homeCoverUrl = $firstImg.attr('data-lazy-src') || $firstImg.attr('data-src') || $firstImg.attr('src') || '';
            if (homeCoverUrl.startsWith('data:image')) {
                homeCoverUrl = $firstImg.attr('data-lazy-src') || $firstImg.attr('data-src') || '';
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

        // 2. Duyệt qua tất cả các phần tử phân trang trong .page-link hoặc cấu trúc phân trang tương tự
        $('.page-link .post-page-numbers, .pagination .page-numbers, .wp-pagenavi .pages, .pagination span, .pagination a').each((_, element) => {
            const $el = $(element);
            const pageText = $el.text().trim();
            const chapNum = parseInt(pageText, 10);

            // Bỏ qua nếu không phải số hợp lệ hoặc đã được thêm vào danh sách
            if (isNaN(chapNum) || seenChapNums.has(chapNum)) return;

            let chapterId = '';

            if ($el.is('a')) {
                // Các trang 2, 3... (thẻ <a>) -> Lấy href bóc tách slug
                const href = $el.attr('href') || '';
                chapterId = href
                    .replace(/^https?:\/\/[^\/]+\//, '')
                    .replace(/\/$/, '')
                    .trim();
            } else {
                // Trang 1 hiện tại (thẻ <span> hoặc thẻ khác không có href) -> Dùng mainSlug
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

        // 3. Fallback: Nếu bài viết ngắn chỉ có 1 trang (không có phân trang)
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

        // Lấy tất cả ảnh từ phần nội dung bài viết
        $('.entry-content img, .thecontent img').each((_, element) => {
            const $img = $(element);

            // Ưu tiên lấy từ các thuộc tính lazy-load (data-lazy-src, data-src) rồi mới đến src
            let pageUrl = $img.attr('data-lazy-src') || $img.attr('data-src') || $img.attr('src') || $img.attr('data-original') || '';
            pageUrl = pageUrl.trim();

            // Nếu giá trị lấy được là placeholder dạng base64/SVG, fallback lại lần nữa
            if (pageUrl.startsWith('data:image')) {
                pageUrl = $img.attr('data-lazy-src') || $img.attr('data-src') || '';
            }

            // Chuẩn hóa link dạng protocol-relative (//)
            if (pageUrl.startsWith('//')) {
                pageUrl = `https:${pageUrl}`;
            }

            // Lọc bỏ link rỗng, ảnh placeholder hoặc ảnh trùng lặp
            if (pageUrl && !pageUrl.startsWith('data:image') && !pageUrl.includes('thumb-default') && !pages.includes(pageUrl)) {
                pages.push(pageUrl);
            }
        });

        return pages;
    }

    // Parse danh sách thể loại (Tags)
    parseTags($: CheerioAPI): TagSection[] {
        const tags: Tag[] = [];

        $('div.tagcloud a.tag-cloud-link').each((_, el) => {
            const $a = $(el);
            const href = $a.attr('href') || '';

            const $countSpan = $a.find('span.tag-link-count');
            const countText = $countSpan.text().trim();

            $countSpan.remove();
            const label = $a.text().trim();

            // Lấy nguyên toàn bộ slug từ pathname làm id (ví dụ: /category/cosplay/ -> category/cosplay hoặc cosplay tùy cấu trúc)
            let id = '';
            try {
                const urlObj = new URL(href);
                // Giữ lại toàn bộ path sạch (bỏ dấu / ở đầu và cuối)
                id = urlObj.pathname.replace(/^\/|\/$/g, '');
            } catch {
                id = href.replace(/^https?:\/\/[^\/]+/, '').replace(/^\/|\/$/g, '');
            }

            if (id && label) {
                tags.push(
                    App.createTag({
                        id: id,
                        label: `${label} ${countText}`.trim(),
                    })
                );
            }
        });

        if (tags.length === 0) {
            return [];
        }

        return [
            App.createTagSection({
                id: 'categories',
                label: 'Categories',
                tags: tags,
            }),
        ];
    }

    isLastPage($: CheerioAPI): boolean {
        const $pagination = $('.pagination.pagination-numeric');

        if ($pagination.length === 0) {
            return true;
        }

        const $currentPage = $pagination.find('li.current span.currenttext').text().trim();

        let maxPage = 1;
        $pagination.find('li a[href*="/page/"]').each((_, el) => {
            const href = $(el).attr('href') || '';
            const match = href.match(/\/page\/(\d+)\//);
            const pageStr = match?.[1];
            if (pageStr) {
                const pageNum = parseInt(pageStr, 10);
                if (pageNum > maxPage) {
                    maxPage = pageNum;
                }
            }
        });

        const currentNum = parseInt($currentPage, 10) || 1;

        return currentNum >= maxPage;
    }
}
