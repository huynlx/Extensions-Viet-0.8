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
            let title = $titleEl.text().trim();
            title = decodeHTML(title).replace(/\s+/g, ' ').trim();
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

            // 4. Subtitle (Chuẩn hóa sạch sẽ, giữ nguyên định nghĩa số lượng ảnh)
            const subtitleMatch = title.match(/\(([^)]+(?:photos|pictures|videos|P)[^)]*)\)/i);
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
            let title = $titleLink.text().trim();
            title = decodeHTML(title).replace(/\s+/g, ' ').trim();
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

            // 4. Subtitle
            const subtitleMatch = title.match(/\(([^)]+(?:photos|pictures|videos|P)[^)]*)\)/i);
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

            // 1. Title & Link
            const $titleLink = $item.find('.post-box-title a').first();
            let title = $titleLink.text().trim();
            title = decodeHTML(title).replace(/\s+/g, ' ').trim();
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

            // 4. Subtitle
            const subtitleMatch = title.match(/\(([^)]+(?:photos|pictures|videos|P)[^)]*)\)/i);
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

    parseMayLikeSection($: CheerioAPI): PartialSourceManga[] {
        const mangaList: PartialSourceManga[] = [];

        $('li.post-box.horizontal-small').each((_, element) => {
            const $item = $(element);

            const $titleLink = $item.find('.post-title a').first();
            const $thumbLink = $item.find('.post-img a').first();

            let title = $titleLink.attr('title')?.trim() || $titleLink.text().trim() || $thumbLink.attr('title')?.trim() || '';
            title = decodeHTML(title).replace(/\s+/g, ' ').trim();

            const href = $titleLink.attr('href') || $thumbLink.attr('href') || '';
            let mangaId = '';
            try {
                const urlObj = new URL(href);
                mangaId = urlObj.pathname.replace(/^\/|\/$/g, '');
            } catch {
                mangaId = href.replace(/^https?:\/\/[^\/]+/, '').replace(/^\/|\/$/g, '');
            }

            const $img = $item.find('.post-img img').first();
            let image = $img.attr('data-lazy-src') || $img.attr('data-src') || $img.attr('src') || '';

            if (image.startsWith('data:image')) {
                image = $img.attr('data-lazy-src') || $img.attr('data-src') || '';
            }

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            const subtitleMatch = title.match(/\(([^)]*(?:photos|anh|pictures|videos|P)[^)]*)\)/i);
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

    parseSearchResults($: CheerioAPI): PartialSourceManga[] {
        const mangaList: PartialSourceManga[] = [];

        $('article.latestPost.excerpt').each((_, element) => {
            const $item = $(element);

            const $titleLink = $item.find('header h2.title a').first();
            const $thumbLink = $item.find('a.post-image').first();

            let title = $titleLink.text().trim() || $thumbLink.attr('title') || '';
            title = decodeHTML(title).replace(/\s+/g, ' ').trim();
            const href = $titleLink.attr('href') || $thumbLink.attr('href') || '';

            let mangaId = '';
            try {
                const urlObj = new URL(href);
                mangaId = urlObj.pathname.replace(/^\/|\/$/g, '');
            } catch {
                mangaId = href.replace(/^https?:\/\/[^\/]+/, '').replace(/^\/|\/$/g, '');
            }

            const $img = $item.find('img').first();
            let image = $img.attr('data-lazy-src') || $img.attr('data-src') || $img.attr('src') || '';

            if (image.startsWith('data:image')) {
                image = $img.attr('data-lazy-src') || $img.attr('data-src') || '';
            }

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            const subtitleMatch = title.match(/\(([^)]*(?:photos|pictures|videos|P)[^)]*)\)/i);
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

    parseMangaDetails($: CheerioAPI, compositeId: string) {
        // 1. Title (Clean & Decode)
        const rawTitle = $('h1.post-title, .entry-title, h1').first().text().trim();
        let title = rawTitle.replace(/\s*-\s*\(\s*Page\s*\d+\s*\/\s*\d+\s*\)$/i, '').trim();
        title = decodeHTML(title).replace(/\s+/g, ' ').trim();

        // 2. Views
        const viewsText = $('.post-meta .post-views').text().trim();
        const viewsMatch = viewsText.match(/([\d,.]+)/);
        const views = viewsMatch?.[1] ? parseInt(viewsMatch[1].replace(/[,.]/g, ''), 10) : undefined;

        // 3. Author / Artist (Chuẩn hóa tên nguồn/tác giả hiển thị đẹp hơn)
        const rawAuthor = $('.post-meta .author, .post-author a, .source-item').first().text().trim();
        const author = rawAuthor ? decodeHTML(rawAuthor).replace(/\s+/g, ' ').trim() : 'ADMIN';

        // 4. Tags & Labels
        const arrayTags: Tag[] = [];
        $('.tags a, .post-tags a, .box.info a[href*="/tag/"]').each((_, element) => {
            const $tag = $(element);
            let label = $tag.text().trim();
            label = decodeHTML(label).replace(/\s+/g, ' ').trim();
            const href = $tag.attr('href') || '';

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

        // 5. Description (Lọc các dòng mô tả, lượt xem, ngày tháng sạch sẽ)
        const descParts: string[] = [];

        if (views !== undefined && viewsText) {
            descParts.push(`👁️ Lượt xem: ${viewsText.replace(/\D/g, '')}`);
        }

        const dateText = $('.post-info .thetime, .date.meta-item').first().text().trim();
        if (dateText) {
            descParts.push(`${dateText}`);
        }

        // Lấy thêm nội dung tóm tắt ngắn từ bài viết nếu có
        const rawExcerpt = $('.entry-content p').first().text().trim();
        if (rawExcerpt && rawExcerpt.length < 200) {
            descParts.push(`\n${decodeHTML(rawExcerpt).replace(/\s+/g, ' ').trim()}`);
        }

        const description = descParts.length > 0 ? descParts.join('\n') : 'Không có mô tả chi tiết.';

        // 6. Cover Image
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
                titles: [title],
                image: homeCoverUrl,
                status: 'Completed',
                author: author,
                artist: author,
                desc: description,
                tags: [App.createTagSection({ id: '0', label: 'Thể loại', tags: arrayTags })],
                hentai: true,
            }),
        });
    }

    parseDate(dateStr: string): Date {
        if (!dateStr) return new Date();
        const [dayStr, monthStr, yearStr] = dateStr.split('/');
        if (dayStr && monthStr && yearStr) {
            const day = parseInt(dayStr, 10);
            const month = parseInt(monthStr, 10) - 1;
            const year = parseInt(yearStr, 10);
            return new Date(year, month, day);
        }
        return new Date();
    }

    parseChapterList($: CheerioAPI): Chapter[] {
        const chapters: Chapter[] = [];
        const seenChapNums = new Set<number>();

        const canonicalHref = $('link[rel="canonical"]').attr('href') || '';
        const mainSlug = canonicalHref
            ? canonicalHref
                  .replace(/^https?:\/\/[^\/]+\//, '')
                  .replace(/\/$/, '')
                  .trim()
            : '';

        $('.page-link .post-page-numbers, .pagination .page-numbers, .wp-pagenavi .pages, .pagination span, .pagination a').each((_, element) => {
            const $el = $(element);
            const pageText = $el.text().trim();
            const chapNum = parseInt(pageText, 10);

            if (isNaN(chapNum) || seenChapNums.has(chapNum)) return;

            let chapterId = '';

            if ($el.is('a')) {
                const href = $el.attr('href') || '';
                chapterId = href
                    .replace(/^https?:\/\/[^\/]+\//, '')
                    .replace(/\/$/, '')
                    .trim();
            } else {
                chapterId = mainSlug;
            }

            if (chapterId) {
                seenChapNums.add(chapNum);
                chapters.push(
                    App.createChapter({
                        id: chapterId,
                        name: `Trang ${chapNum}`, // Đổi tên chapter từ "Trang X" thành "Phần X" chuyên nghiệp hơn
                        chapNum: chapNum,
                        time: new Date(),
                    })
                );
            }
        });

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

    parseChapterDetails($: CheerioAPI): string[] {
        const pages: string[] = [];

        $('.entry-content img, .thecontent img').each((_, element) => {
            const $img = $(element);

            let pageUrl = $img.attr('data-lazy-src') || $img.attr('data-src') || $img.attr('src') || $img.attr('data-original') || '';
            pageUrl = pageUrl.trim();

            if (pageUrl.startsWith('data:image')) {
                pageUrl = $img.attr('data-lazy-src') || $img.attr('data-src') || '';
            }

            if (pageUrl.startsWith('//')) {
                pageUrl = `https:${pageUrl}`;
            }

            if (pageUrl && !pageUrl.startsWith('data:image') && !pageUrl.includes('thumb-default') && !pages.includes(pageUrl)) {
                pages.push(pageUrl);
            }
        });

        return pages;
    }

    parseTags($: CheerioAPI): TagSection[] {
        const tags: Tag[] = [];

        $('div.tagcloud a.tag-cloud-link').each((_, el) => {
            const $a = $(el);
            const href = $a.attr('href') || '';

            const $countSpan = $a.find('span.tag-link-count');
            const countText = $countSpan.text().trim();

            $countSpan.remove();
            let label = $a.text().trim();
            // Chuẩn hóa và decode HTML cho nhãn thể loại
            label = decodeHTML(label).replace(/\s+/g, ' ').trim();

            let id = '';
            try {
                const urlObj = new URL(href);
                id = urlObj.pathname.replace(/^\/|\/$/g, '');
            } catch {
                id = href.replace(/^https?:\/\/[^\/]+/, '').replace(/^\/|\/$/g, '');
            }

            if (id && label) {
                // Tùy chỉnh hiển thị label của tag (có kèm số lượng hoặc giữ nguyên)
                const formattedLabel = countText ? `${label} (${countText.replace(/\D/g, '')})` : label;
                tags.push(
                    App.createTag({
                        id: id,
                        label: formattedLabel,
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
