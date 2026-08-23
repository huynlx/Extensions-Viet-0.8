import { Chapter, PartialSourceManga, Tag, TagSection } from '@paperback/types';
import { CheerioAPI } from 'cheerio';
import { decodeHTML } from 'entities';

export class Parser {
    parseNewUpdatedSection($: CheerioAPI): PartialSourceManga[] {
        const mangaList: PartialSourceManga[] = [];

        $('.blog .items-row').each((_, element) => {
            const $item = $(element);

            // 1. Title & Link từ thẻ <a> trong .page-header h2
            const $titleLink = $item.find('.page-header h2 a.item-link').first();
            const title = decodeHTML($titleLink.text().trim());

            // 2. Manga ID từ href (Lấy toàn bộ slug đường dẫn, bỏ dấu / ở đầu nếu có)
            const href = $titleLink.attr('href') || $item.find('.item-thumb a').attr('href') || '';
            const mangaId = href.replace(/^\//, '').split('?')[0];

            // 3. Image URL từ thẻ img trong .item-thumb
            const $img = $item.find('.item-thumb img').first();
            let image = $img.attr('src') || $img.attr('data-src') || '';

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Subtitle: Bóc tách số lượng ảnh từ tiêu đề nếu có
            const subtitleMatch = title.match(/\((\d+\s*photos?)\)/i);
            const subtitle = subtitleMatch ? decodeHTML(subtitleMatch[1]) : undefined;

            // Ghép ID và URL ảnh bìa lại với nhau
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

        $('.blog .items-row').each((_, element) => {
            const $item = $(element);

            // 1. Title & Link từ thẻ <a> trong .page-header h2
            const $titleLink = $item.find('.page-header h2 a.item-link').first();
            const title = decodeHTML($titleLink.text().trim());

            // 2. Manga ID từ href
            const href = $titleLink.attr('href') || $item.find('.item-thumb a').attr('href') || '';
            const mangaId = href.replace(/^\//, '').split('?')[0];

            // 3. Image URL từ thẻ img trong .item-thumb
            const $img = $item.find('.item-thumb img').first();
            let image = $img.attr('src') || $img.attr('data-src') || '';

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Subtitle: Bóc tách số lượng ảnh từ tiêu đề nếu có
            const subtitleMatch = title.match(/\((\d+\s*photos?)\)/i);
            const subtitle = subtitleMatch ? decodeHTML(subtitleMatch[1]) : undefined;

            // Ghép ID và URL ảnh bìa lại với nhau
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

        $('.footer .popular-item').each((_, element) => {
            const $item = $(element);

            // 1. Title & Link từ thẻ <a> trong .item-title
            const $titleLink = $item.find('.item-title a').first();
            const rawTitle = $titleLink.attr('title')?.trim() || $titleLink.text().trim();
            const title = decodeHTML(rawTitle ?? '');

            // 2. Manga ID từ href
            const href = $titleLink.attr('href') || $item.find('.item-image a').attr('href') || '';
            const mangaId = href ? (href.replace(/^\//, '').split('?')[0] ?? '') : '';

            // 3. Image URL từ thẻ img trong .item-image
            const $img = $item.find('.item-image img').first();
            let image = $img.attr('src') || $img.attr('data-src') || '';

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Subtitle: Bóc tách số lượng ảnh/video từ tiêu đề nếu có
            const subtitleMatch = title.match(/\(([^)]*(?:photos|pictures|videos)[^)]*)\)/i);
            const subtitle = subtitleMatch?.[1] ? decodeHTML(subtitleMatch[1].trim()) : undefined;

            // Ghép ID và URL ảnh bìa lại với nhau
            const compositeId = `${mangaId}|${encodeURIComponent(image)}`;

            if (mangaId && title && !mangaId.includes('javascript')) {
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

        $('.blog .items-row').each((_, element) => {
            const $item = $(element);

            // 1. Title & Link từ thẻ <a> trong .page-header h2
            const $titleLink = $item.find('.page-header h2 a.item-link').first();
            const title = decodeHTML($titleLink.text().trim());

            // 2. Manga ID từ href
            const href = $titleLink.attr('href') || $item.find('.item-thumb a').attr('href') || '';
            const mangaId = href.replace(/^\//, '').split('?')[0];

            // 3. Image URL từ thẻ img trong .item-thumb
            const $img = $item.find('.item-thumb img').first();
            let image = $img.attr('src') || $img.attr('data-src') || '';

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Subtitle: Bóc tách số lượng ảnh từ tiêu đề nếu có
            const subtitleMatch = title.match(/\((\d+\s*photos?)\)/i);
            const subtitle = subtitleMatch ? decodeHTML(subtitleMatch[1]) : undefined;

            // Ghép ID và URL ảnh bìa lại với nhau
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
        // 1. Tiêu đề (Lấy từ .article-header h1)
        const rawTitle = $('.article-header h1').text().trim();
        const title = decodeHTML(rawTitle.replace(/\s*-\s*\(\s*Page\s*\d+\s*\/\s*\d+\s*\)$/i, '').trim());

        // 2. Ảnh bìa (Lấy ảnh đầu tiên trong .article-fulltext)
        let image = $('.article-fulltext img').first().attr('src') || '';
        if (image.startsWith('//')) {
            image = `https:${image}`;
        }

        // 3. Tác giả / Nguồn đăng (Lấy từ .article-info strong)
        const author = decodeHTML($('.article-info strong').text().trim() || 'Buondua');

        // 4. Thể loại / Tags (Lấy từ .article-tags a.tag)
        const arrayTags: Tag[] = [];
        $('.article-tags a.tag').each((_, element) => {
            const $tag = $(element);
            const label = decodeHTML($tag.find('span').text().trim() || $tag.text().trim());
            const href = $tag.attr('href') || '';

            const id = (href.replace(/^\/tag\//, '').split('?')[0] ?? '').trim();

            if (id && label && !arrayTags.some((t) => t.id === id)) {
                arrayTags.push(App.createTag({ id: id, label: label }));
            }
        });

        // 5. Mô tả
        const publishDate = $('.article-info small').last().text().trim();
        const descParts: string[] = [];
        if (publishDate) descParts.push(`📅 Ngày đăng: ${publishDate}`);

        const description = decodeHTML(descParts.join('\n'));

        const [realMangaId, encodedCover] = compositeId.split('|');
        const homeCoverUrl = encodedCover ? decodeURIComponent(encodedCover) : '';

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

    // Helper quy đổi thời gian tương đối
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

    // Parse trực tiếp mảng JSON thành danh sách Chapter
    parseChapterList($: CheerioAPI): Chapter[] {
        const chapters: Chapter[] = [];

        // 1. Lấy href từ nút End
        const endHref =
            $('nav.pagination a.pagination-next')
                .filter((_, el) => $(el).text().trim() === 'End')
                .attr('href') ||
            $('nav.pagination a.pagination-next').last().attr('href') ||
            '';

        let totalPages = 1;
        const match = endHref.match(/[?&]page=(\d+)/);

        // Dùng match?.[1] để tránh lỗi undefined
        if (match?.[1]) {
            totalPages = parseInt(match[1], 10);
        }

        // 2. Lấy một href mẫu từ bất kỳ thẻ phân trang nào
        let sampleHref = '';
        $('.pagination-list li a.pagination-link, nav.pagination a').each((_, el) => {
            const h = $(el).attr('href');
            if (h && h.includes('page=')) {
                sampleHref = h;
                return false;
            }
        });

        // 3. Sinh danh sách chapter
        if (sampleHref && totalPages > 1) {
            for (let i = 1; i <= totalPages; i++) {
                const pageHref = sampleHref.replace(/page=\d+/, `page=${i}`);
                const chapterId = pageHref.replace(/^\//, '').trim();

                chapters.push(
                    App.createChapter({
                        id: chapterId,
                        name: decodeHTML(`Trang ${i}`),
                        chapNum: i,
                        time: new Date(),
                    })
                );
            }
        } else {
            // Fallback: Trường hợp bài chỉ có 1 trang
            const canonicalHref = $('link[rel="canonical"]').attr('href') || '';
            const fallbackId = canonicalHref.replace(/^https?:\/\/[^\/]+\//, '').trim();

            if (fallbackId) {
                chapters.push(
                    App.createChapter({
                        id: fallbackId,
                        name: decodeHTML('Trang 1'),
                        chapNum: 1,
                        langCode: '🇻🇳',
                        time: new Date(),
                    })
                );
            }
        }

        return chapters;
    }

    // Parse danh sách trang ảnh trong chapter
    parseChapterDetails($: CheerioAPI): string[] {
        const pages: string[] = [];

        $('.article-fulltext img').each((_, element) => {
            const $img = $(element);

            let pageUrl = $img.attr('src') || $img.attr('data-src') || $img.attr('data-original') || '';
            pageUrl = pageUrl.trim();

            if (pageUrl.startsWith('//')) {
                pageUrl = `https:${pageUrl}`;
            }

            if (pageUrl && !pageUrl.includes('thumb-default') && !pages.includes(pageUrl)) {
                pages.push(pageUrl);
            }
        });

        return pages;
    }

    // Parse danh sách thể loại (Tags)
    parseTags($: CheerioAPI): TagSection[] {
        const genreTags: Tag[] = [];

        $('.collection-item .item-link').each((_, element) => {
            const $item = $(element);
            const label = decodeHTML($item.find('span').text().trim() || $item.text().trim());
            const href = $item.attr('href') || '';

            const slug = href
                .replace(/^\//, '')
                .replace(/^tag\//, '')
                .split('?')[0];

            if (slug && label) {
                genreTags.push(
                    App.createTag({
                        id: slug,
                        label: label,
                    })
                );
            }
        });

        return [
            App.createTagSection({
                id: 'genres',
                label: 'Thể loại',
                tags: genreTags,
            }),
        ];
    }
}

export const isLastPage = ($: CheerioAPI): boolean => {
    const currentItem = $('ul.pagination-list li:has(.is-current)');

    if (!currentItem.length) return true;

    return currentItem.next('li').length === 0;
};
