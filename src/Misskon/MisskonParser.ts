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
            const title = decodeHTML($titleLink.text().trim());
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
            const subtitle = subtitleMatch?.[1]?.trim() ? decodeHTML(subtitleMatch[1].trim()) : undefined;

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
            const title = decodeHTML($titleLink.text().trim());
            const href = $titleLink.attr('href') || $item.find('.post-thumbnail a').attr('href') || '';

            // 2. Manga ID từ URL
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
            const subtitle = subtitleMatch?.[1]?.trim() ? decodeHTML(subtitleMatch[1].trim()) : undefined;

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

            // 1. Tiêu đề
            const $h3 = $thumb.next('h3');
            const $titleLink = $h3.find('a').first();
            const title = decodeHTML($titleLink.text().trim() || $thumbLink.attr('title')?.trim() || '');

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
            const $img = $thumb.find('img').first();
            let image = $img.attr('data-src') || $img.attr('src') || '';

            if (image.startsWith('data:image')) {
                image = $img.attr('data-src') || '';
            }

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Subtitle
            const subtitleMatch = title.match(/\(([^)]*(?:photos|anh|pictures|videos)[^)]*)\)/i);
            const subtitle = subtitleMatch?.[1]?.trim() ? decodeHTML(subtitleMatch[1].trim()) : undefined;

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
            const title = decodeHTML($titleLink.text().trim());
            const href = $titleLink.attr('href') || $item.find('.post-thumbnail a').attr('href') || '';

            // 2. Manga ID từ URL
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
            const subtitle = subtitleMatch?.[1]?.trim() ? decodeHTML(subtitleMatch[1].trim()) : undefined;

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
        const title = decodeHTML(rawTitle.replace(/\s*-\s*\(\s*Page\s*\d+\s*\/\s*\d+\s*\)$/i, '').trim());

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
        const decodedAuthor = decodeHTML(author);

        // 4. Tags
        const arrayTags: Tag[] = [];
        $('.post-tags a, .box.info a[href*="/tag/"]').each((_, element) => {
            const $tag = $(element);
            const label = decodeHTML($tag.text().trim());
            const href = $tag.attr('href') || '';

            const id = href.replace(/\/$/, '').split('/tag/')[1]?.trim() || '';

            if (id && label && !arrayTags.some((t) => t.id === id)) {
                arrayTags.push(App.createTag({ id: id, label: label }));
            }
        });

        // 5. Mô tả
        const descParts: string[] = [];

        if (views !== undefined) {
            descParts.push(`👁️ ${viewsText}`);
        }

        const $boxInner = $('.box.info .box-inner-block').clone();
        $boxInner.find('br').replaceWith('\n');

        const cleanInfoText = $boxInner
            .text()
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line && !line.includes('INFORMATION:') && !line.includes('For albums with'))
            .join('\n')
            .replace(/:\s*\n\s*/g, ': ');

        if (cleanInfoText) {
            descParts.push(cleanInfoText);
        }

        const description = decodeHTML(descParts.length > 0 ? descParts.join('\n') : infoText.trim());

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
                titles: [title],
                image: homeCoverUrl,
                status: 'Completed',
                author: decodedAuthor,
                artist: decodedAuthor,
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

        $('.page-link .post-page-numbers').each((_, element) => {
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
                        name: decodeHTML(`Trang ${chapNum}`),
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

        $('.entry img').each((_, element) => {
            const $img = $(element);

            let pageUrl = $img.attr('data-src') || $img.attr('src') || $img.attr('data-original') || '';
            pageUrl = pageUrl.trim();

            if (pageUrl.startsWith('data:image')) {
                pageUrl = $img.attr('data-src') || '';
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
        const sections: TagSection[] = [];
        const categoryTitles = ['Chinese', 'Korean', 'Other'];

        categoryTitles.forEach((catTitle, index) => {
            const tags: Tag[] = [];

            $('.entry p.post-meta').each((_, pEl) => {
                const $p = $(pEl);
                if ($p.text().toLowerCase().includes(catTitle.toLowerCase())) {
                    $p.nextUntil('p.post-meta, .clear', 'span.tag-counterz').each((_, spanEl) => {
                        const $span = $(spanEl);
                        const $a = $span.find('a').first();
                        const href = $a.attr('href') || '';

                        const rawLabel = $a.find('strong').text().trim() || $a.text().trim();
                        const label = decodeHTML(rawLabel);

                        const countMatch = $span.text().match(/\((\d+)\)/);
                        const countText = countMatch ? ` (${countMatch[1]})` : '';

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
                        label: decodeHTML(catTitle),
                        tags: tags,
                    })
                );
            }
        });

        return sections;
    }
}
