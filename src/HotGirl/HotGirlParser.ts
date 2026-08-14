import { Chapter, PartialSourceManga, Tag, TagSection } from '@paperback/types';
import { CheerioAPI } from 'cheerio';
import { decodeHTML } from 'entities';

export class Parser {
    parseFeaturedSection($: CheerioAPI): PartialSourceManga[] {
        const mangaList: PartialSourceManga[] = [];

        $('.full-slider-container .slider-item').each((_, element) => {
            const $item = $(element);

            // 1. Title & Link
            const $link = $item.find('a').first();
            const $titleEl = $item.find('.slide-title').first();

            const rawTitle = $titleEl.text().trim();
            const title = decodeHTML(rawTitle);
            const href = $link.attr('href') || '';

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

            // 4. Subtitle
            const subtitleMatch = title.match(/\(([^)]+photos[^)]*)\)/i);
            const subtitle = subtitleMatch?.[1] ? decodeHTML(subtitleMatch[1].trim()) : undefined;

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
            const rawTitle = $titleLink.text().trim();
            const title = decodeHTML(rawTitle);
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
            const subtitleMatch = title.match(/\(([^)]+photos[^)]*)\)/i);
            const subtitle = subtitleMatch?.[1] ? decodeHTML(subtitleMatch[1].trim()) : undefined;

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
            const rawTitle = $titleLink.text().trim();
            const title = decodeHTML(rawTitle);
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
            const subtitleMatch = title.match(/\(([^)]*(?:photos|pictures|videos)[^)]*)\)/i);
            const subtitle = subtitleMatch?.[1] ? decodeHTML(subtitleMatch[1].trim()) : undefined;

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

            // 1. Title & Link
            const $titleLink = $item.find('.post-title a').first();
            const $thumbLink = $item.find('.post-img a').first();

            const rawTitle = $titleLink.attr('title')?.trim() || $titleLink.text().trim() || $thumbLink.attr('title')?.trim() || '';
            const title = decodeHTML(rawTitle);

            // 2. Link & Manga ID
            const href = $titleLink.attr('href') || $thumbLink.attr('href') || '';
            let mangaId = '';
            try {
                const urlObj = new URL(href);
                mangaId = urlObj.pathname.replace(/^\/|\/$/g, '');
            } catch {
                mangaId = href.replace(/^https?:\/\/[^\/]+/, '').replace(/^\/|\/$/g, '');
            }

            // 3. Image URL
            const $img = $item.find('.post-img img').first();
            let image = $img.attr('data-lazy-src') || $img.attr('data-src') || $img.attr('src') || '';

            if (image.startsWith('data:image')) {
                image = $img.attr('data-lazy-src') || $img.attr('data-src') || '';
            }

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Subtitle
            const subtitleMatch = title.match(/\(([^)]*(?:photos|anh|pictures|videos|P)[^)]*)\)/i);
            const subtitle = subtitleMatch?.[1] ? decodeHTML(subtitleMatch[1].trim()) : undefined;

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

            // 1. Title & Link
            const $titleLink = $item.find('header h2.title a').first();
            const $thumbLink = $item.find('a.post-image').first();

            const rawTitle = $titleLink.text().trim() || $thumbLink.attr('title') || '';
            const title = decodeHTML(rawTitle);
            const href = $titleLink.attr('href') || $thumbLink.attr('href') || '';

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

            // 4. Subtitle
            const subtitleMatch = title.match(/\(([^)]*(?:photos|pictures|videos|P)[^)]*)\)/i);
            const subtitle = subtitleMatch?.[1] ? decodeHTML(subtitleMatch[1].trim()) : undefined;

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
        // 1. Tiêu đề (title)
        const rawTitle = $('h1.post-title, .entry-title, h1').first().text().trim();
        const cleanTitle = rawTitle.replace(/\s*-\s*\(\s*Page\s*\d+\s*\/\s*\d+\s*\)$/i, '').trim();
        const title = decodeHTML(cleanTitle);

        // 2. Lượt xem (Views)
        const viewsText = $('.post-meta .post-views').text().trim();
        const viewsMatch = viewsText.match(/([\d,.]+)/);
        const views = viewsMatch?.[1] ? parseInt(viewsMatch[1].replace(/[,.]/g, ''), 10) : undefined;

        // 3. Tác giả & Họa sĩ (author & artist)
        // Nếu trang web có hiển thị tên tác giả/nghệ sĩ cụ thể có thể bóc tách ở đây, hiện tại chuẩn hóa về 'Admin' hoặc 'Unknown' sạch sẽ
        const author = 'Admin';
        const artist = 'Admin';

        // 4. Tags (label)
        const arrayTags: Tag[] = [];
        $('.tags a, .post-tags a, .box.info a[href*="/tag/"]').each((_, element) => {
            const $tag = $(element);
            const rawLabel = $tag.text().trim();
            const label = decodeHTML(rawLabel);
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

        // 5. Mô tả (description)
        const descParts: string[] = [];

        if (views !== undefined) {
            descParts.push(`👁️ ${decodeHTML(viewsText)}`);
        }

        const dateText = $('.post-info .thetime').first().text().trim();
        if (dateText) {
            descParts.push(decodeHTML(dateText));
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
                titles: [title],
                image: homeCoverUrl,
                status: 'Completed',
                author: author,
                artist: artist,
                desc: description,
                tags: [App.createTagSection({ id: '0', label: decodeHTML('Thể loại'), tags: arrayTags })],
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
                        name: decodeHTML(`Trang ${chapNum}`), // Tên chapter (name) được chuẩn hóa và giải mã HTML entity
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
                    name: decodeHTML('Trang 1'),
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
            const rawLabel = $a.text().trim();
            const label = decodeHTML(rawLabel);

            let id = '';
            try {
                const urlObj = new URL(href);
                id = urlObj.pathname.replace(/^\/|\/$/g, '');
            } catch {
                id = href.replace(/^https?:\/\/[^\/]+/, '').replace(/^\/|\/$/g, '');
            }

            if (id && label) {
                tags.push(
                    App.createTag({
                        id: id,
                        label: decodeHTML(`${label} ${countText}`.trim()), // Nhãn thẻ (label) được chuẩn hóa và giải mã an toàn
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
                label: decodeHTML('Categories'),
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
