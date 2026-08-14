import { Chapter, PartialSourceManga, SourceManga, Tag, TagSection } from '@paperback/types';
import { CheerioAPI } from 'cheerio';
import { decodeHTML } from 'entities';
import { parseDate } from '../../common';

export class Parser {
    parseFeaturedSection($: CheerioAPI): PartialSourceManga[] {
        const mangaList: PartialSourceManga[] = [];

        // Lấy đúng div .slide-home.ahihi ĐẦU TIÊN
        const $firstSlide = $('.slide-home.ahihi').first();

        $firstSlide.find('.item').each((_, element) => {
            const $item = $(element);

            // 1. Title & Link
            const $titleLink = $item.find('.info-item .line-2 a').first();
            const title = $titleLink.text().trim();
            const href = $titleLink.attr('href') || '';

            // 2. Manga ID
            const mangaId = href.split('/').pop()?.split('?')[0] ?? '';

            // 3. Image URL
            let image = $item.find('.img-item img').attr('src') || '';
            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Subtitle (Chapter mới nhất)
            const lastChapter = $item.find('.img-item .btn-link').text().trim();

            if (mangaId && title && !mangaId.includes('javascript')) {
                mangaList.push(
                    App.createPartialSourceManga({
                        mangaId: mangaId,
                        title: decodeHTML(title),
                        image: image,
                        subtitle: lastChapter ? decodeHTML(lastChapter) : undefined,
                    })
                );
            }
        });

        return mangaList;
    }

    parseNewUpdatedSection($: CheerioAPI): PartialSourceManga[] {
        const mangaList: PartialSourceManga[] = [];
        const addedMangaIds = new Set<string>();

        $('.page-item-detail').each((_, element) => {
            const item = $(element);

            // 1. Link & Manga ID
            const mangaLink = item.find('.post-title a, .item-thumb a').first();
            const href = mangaLink.attr('href') ?? '';
            const mangaId = href.split('/').pop()?.split('?')[0] ?? '';

            // Bỏ qua nếu không parse được ID hoặc trùng lặp
            if (!mangaId || addedMangaIds.has(mangaId)) return;

            // 2. Title
            const title = item.find('.post-title a').text().trim() || mangaLink.attr('title')?.trim() || '';

            // 3. Cover Image (Lấy từ thẻ img)
            const $img = item.find('.item-thumb img').first();
            let cover = $img.attr('src') || $img.attr('data-src') || '';

            // Chuẩn hóa protocol nếu thiếu
            if (cover.startsWith('//')) {
                cover = `https:${cover}`;
            }

            // 4. Subtitle (Tên chapter mới nhất)
            const subtitle = item.find('.list-chapter .chapter-item .chapter a').first().text().trim() || undefined;

            if (title) {
                mangaList.push(
                    App.createPartialSourceManga({
                        mangaId: mangaId,
                        title: decodeHTML(title),
                        image: cover,
                        subtitle: subtitle ? decodeHTML(subtitle) : undefined,
                    })
                );
                addedMangaIds.add(mangaId);
            }
        });

        return mangaList;
    }

    parseHotSection($: CheerioAPI): PartialSourceManga[] {
        const mangaList: PartialSourceManga[] = [];

        // Lấy div .slide-home.ahihi THỨ HAI (index = 1)
        const $secondSlide = $('.slide-home.ahihi').eq(1);

        $secondSlide.find('.item').each((_, element) => {
            const $item = $(element);

            // 1. Title & Link
            const $titleLink = $item.find('.info-item .line-2 a').first();
            const title = $titleLink.text().trim();
            const href = $titleLink.attr('href') || '';

            // 2. Manga ID
            const mangaId = href.split('/').pop()?.split('?')[0] ?? '';

            // 3. Image URL
            let image = $item.find('.img-item img').attr('src') || '';
            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Subtitle (Chapter mới nhất)
            const lastChapter = $item.find('.img-item .btn-link').text().trim();

            if (mangaId && title && !mangaId.includes('javascript')) {
                mangaList.push(
                    App.createPartialSourceManga({
                        mangaId: mangaId,
                        title: decodeHTML(title),
                        image: image,
                        subtitle: lastChapter ? decodeHTML(lastChapter) : undefined,
                    })
                );
            }
        });

        return mangaList;
    }

    parsePopularSection($: CheerioAPI): PartialSourceManga[] {
        const mangaList: PartialSourceManga[] = [];

        $('li.popular-item-wrap').each((_, element) => {
            const $item = $(element);

            // 1. Link & Manga ID
            const href = $item.find('h3.widget-title a').attr('href') || $item.find('.popular-img a').attr('href') || '';
            const mangaId = href.split('/').pop()?.split('?')[0] ?? '';

            // 2. Title
            const title =
                $item.find('h3.widget-title a').text().trim() ||
                $item
                    .find('img')
                    .attr('alt')
                    ?.replace(/^Ảnh bìa truyện\s*/i, '')
                    .trim() ||
                '';

            // 3. Image URL
            const $img = $item.find('img').first();
            let image = $img.attr('data-src') || $img.attr('src') || '';

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Subtitle
            const views = $item.find('.chapter-item .chapter').text().trim();
            const postOn = $item.find('.chapter-item .post-on').text().trim();
            const subtitle = views || postOn || undefined;

            if (mangaId && title && !mangaId.includes('javascript')) {
                mangaList.push(
                    App.createPartialSourceManga({
                        mangaId: mangaId,
                        title: decodeHTML(title),
                        image: image,
                        subtitle: subtitle ? decodeHTML(subtitle) : undefined,
                    })
                );
            }
        });

        return mangaList;
    }

    // Parse danh sách truyện (Search, Homepage, ViewMore)
    parseSearchResults($: CheerioAPI): PartialSourceManga[] {
        const mangaList: PartialSourceManga[] = [];
        const addedMangaIds = new Set<string>();

        $('.page-item-detail').each((_, element) => {
            const $item = $(element);

            // 1. Link & Title
            const $titleLink = $item.find('.post-title h3 a').first();
            const title = $titleLink.text().trim() || $item.find('.item-thumb a').attr('title')?.trim() || '';

            // 2. Manga ID
            const href = $titleLink.attr('href') || $item.find('.item-thumb a').attr('href') || '';
            const mangaId = href.split('/').pop()?.split('?')[0] ?? '';

            if (!mangaId || addedMangaIds.has(mangaId)) return;

            // 3. Image URL
            const $img = $item.find('.item-thumb img').first();
            let image = $img.attr('src') || $img.attr('data-src') || '';

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Subtitle
            const subtitle = $item.find('.list-chapter .chapter-item .chapter a').first().text().trim() || undefined;

            if (title) {
                mangaList.push(
                    App.createPartialSourceManga({
                        mangaId: mangaId,
                        title: decodeHTML(title),
                        image: image,
                        subtitle: subtitle ? decodeHTML(subtitle) : undefined,
                    })
                );
                addedMangaIds.add(mangaId);
            }
        });

        return mangaList;
    }

    // Parse thông tin chi tiết truyện
    parseMangaDetails($: CheerioAPI, mangaId: string): SourceManga {
        // 1. Tiêu đề
        const title = $('.post-title h1').text().trim();

        // 2. Ảnh bìa
        let image = $('.summary_image img').attr('src') || '';
        if (image.startsWith('//')) {
            image = `https:${image}`;
        }

        // Helper trích xuất văn bản
        const getInfoTextByHeading = (headingText: string): string => {
            let result = '';
            $('.post-content_item').each((_, el) => {
                const h5Text = $(el).find('.summary-heading h5').text().trim();
                if (h5Text.toLowerCase().includes(headingText.toLowerCase())) {
                    result = $(el).find('.summary-content').text().trim();
                    return false; // Break loop
                }
            });
            return result;
        };

        // 3. Tác giả & Nhóm dịch
        const authorVal = getInfoTextByHeading('Tác giả');
        const author = authorVal && authorVal !== '' ? authorVal : 'Đang cập nhật';
        const nhomDich = getInfoTextByHeading('Nhóm dịch');

        // 4. Lượt xem (View)
        const views = getInfoTextByHeading('View');

        // 5. Rating (Đánh giá)
        const ratingScore = $('.avg-rate').text().trim() || $('[property="ratingValue"]').text().trim();
        const ratingCount = $('.count-rate').text().trim() || $('[property="ratingCount"]').text().trim();

        let ratingStr = '';
        if (ratingScore) {
            ratingStr = ratingCount ? `${ratingScore}/5 (${ratingCount} bình chọn)` : `${ratingScore}/5`;
        }

        // 6. Cập nhật
        const $timeEl = $('.post-content_item time').first();
        const lastUpdateStr = $timeEl.text().trim() || $timeEl.attr('datetime') || '';

        // 7. Thể loại (Tags)
        const arrayTags: Tag[] = [];
        $('.genres-content a[href*="/genre/"]').each((_, element) => {
            const label = $(element).text().trim();
            const href = $(element).attr('href') || '';
            const id = href.split('/genre/').pop()?.split('?')[0] ?? '';

            if (id && label) {
                arrayTags.push(App.createTag({ id: id, label: decodeHTML(label) }));
            }
        });

        // 8. Mô tả
        const rawDescription = $('.description-summary .original-content').text().trim();

        const descParts: string[] = [];
        if (rawDescription) descParts.push(rawDescription);
        if (ratingStr) descParts.push(`\n⭐ Rating: ${ratingStr}`);
        if (nhomDich) descParts.push(`🚩 Nhóm dịch: ${nhomDich}`);
        if (views) descParts.push(`👁 View: ${views}`);
        if (lastUpdateStr) descParts.push(`🕒 Cập nhật: ${lastUpdateStr}`);

        const description = descParts.join('\n');

        return App.createSourceManga({
            id: mangaId,
            mangaInfo: App.createMangaInfo({
                titles: [decodeHTML(title)],
                image: image,
                status: 'Ongoing',
                author: decodeHTML(author),
                artist: decodeHTML(author),
                desc: decodeHTML(description),
                tags: [App.createTagSection({ id: '0', label: 'Thể loại', tags: arrayTags })],
                hentai: true,
                rating: ratingScore ? parseFloat(ratingScore) : undefined,
            }),
        });
    }

    // Parse danh sách Chapter
    parseChapterList($: CheerioAPI): Chapter[] {
        const chapters: Chapter[] = [];

        $('.list-chapter.phihi ul.box-list-chapter li.wp-manga-chapter').each((index, element) => {
            const $li = $(element);
            const $a = $li.find('a').first();

            // 1. Lấy Href & Chapter ID
            const href = $a.attr('href') || '';
            const chapterId = href.replace(/^https?:\/\/[^\/]+\//, '').split('?')[0];

            // 2. Tên chương
            const chapterName = $a.text().trim();

            // 3. Trích xuất số chương
            const chapNumMatch = chapterName.match(/(\d+(?:\.\d+)?)/);
            const chapNum = chapNumMatch?.[1] ? parseFloat(chapNumMatch[1]) : index + 1;

            // 4. Lượt xem
            const viewsStr = $li.find('.number-view').text().trim();

            // 5. Thời gian cập nhật
            const relativeTimeStr = $li.find('.chapter-release-date i').text().trim();
            const time = parseDate(relativeTimeStr);

            const groupInfo = [relativeTimeStr, viewsStr].filter(Boolean).join(' • ');

            if (chapterId && chapterName) {
                chapters.push(
                    App.createChapter({
                        id: chapterId,
                        name: decodeHTML(chapterName),
                        chapNum: chapNum,
                        langCode: '🇻🇳',
                        group: groupInfo ? decodeHTML(groupInfo) : undefined,
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

        $('#chapter_content .page-break img, .reading-content img.chapter-img').each((_, element) => {
            const $img = $(element);

            let pageUrl = $img.attr('src') || $img.attr('data-src') || $img.attr('data-original') || '';

            if (pageUrl.startsWith('//')) {
                pageUrl = `https:${pageUrl}`;
            }

            pageUrl = pageUrl.trim();

            if (pageUrl && !pages.includes(pageUrl)) {
                pages.push(pageUrl);
            }
        });

        return pages;
    }

    // Parse danh sách thể loại (Tags)
    parseTags($: CheerioAPI): TagSection[] {
        const genreTags: Tag[] = [];

        $('ul.genres-grid a.genre-card').each((_, element) => {
            const $item = $(element);
            const name = $item.find('.name').text().trim();
            const href = $item.attr('href') || '';

            const countRaw = $item.find('.count, .quantity, .total, span:not(.name)').text().trim();
            const count = countRaw.replace(/\D/g, '');

            const label = count ? `${name} (${countRaw})` : name;
            const slug = href.split('/genre/').pop()?.split('/')[0]?.split('?')[0];

            if (slug && name) {
                genreTags.push(
                    App.createTag({
                        id: slug,
                        label: decodeHTML(label),
                    })
                );
            }
        });

        return [App.createTagSection({ id: 'genres', label: 'Thể loại', tags: genreTags })];
    }
}
