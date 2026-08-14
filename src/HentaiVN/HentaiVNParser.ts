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
            let image = match?.[1] || '';

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Subtitle
            const lastChapter = $item.find('.info-detail').text().trim();

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

            // 4. Chapter/Subtitle
            const fullTitleText = $item.find('.box-description p').first().text().trim();
            const chapterMatch = fullTitleText.match(/-\s*(\d+\s*chap)/i);
            const lastChapter = chapterMatch ? chapterMatch[1] : undefined;

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

            // 4. Chapter/Subtitle
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

            const subtitle = viewsText ? `👁 ${viewsText}` : lastChapter;

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

            // 4. Chapter từ .meta
            const lastChapter = $item.find('.meta').text().trim() || undefined;

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

            // 4. Chapter/Subtitle
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

            const subtitle = lastChapter;

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
            const id = href.split('/the-loai/').pop()?.split('/')[0]?.split('?')[0] ?? '';

            if (id && label) {
                arrayTags.push(App.createTag({ id: id, label: decodeHTML(label) }));
            }
        });

        // 6. Mô tả (Lấy Tên khác + Lượt xem + Nội dung truyện)
        const altName = getInfoText('Tên Khác');

        const views = $pageInfo
            .find('span.info')
            .filter((_, el) => $(el).text().includes('Lượt xem'))
            .next('span')
            .text()
            .trim();

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
                author: decodeHTML(author),
                artist: decodeHTML(author),
                desc: decodeHTML(description),
                tags: [App.createTagSection({ id: '0', label: 'Thể loại', tags: arrayTags })],
                hentai: true,
            }),
        });
    }

    // Helper quy đổi thời gian tương đối thành Date
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

        $('table.listing tbody tr').each((index, element) => {
            const $row = $(element);
            const $a = $row.find('td a').first();

            // 1. Tên chương
            const chapterName = $row.find('h2.chuong_t').text().trim() || $a.text().trim();

            // 2. Lấy href
            const href = $a.attr('href') || '';
            const rawSlug = href.split('/truyen/').pop() ?? '';
            const chapterId = rawSlug.split('?')[0] || href;

            // 3. Trích xuất số chương (chapNum)
            const chapNumMatch = chapterName.match(/(\d+(?:\.\d+)?)/);
            const chapNum = chapNumMatch?.[1] ? parseFloat(chapNumMatch[1]) : index + 1;

            // 4. Thời gian cập nhật
            const timeStr = $row.find('td').last().text().trim();
            const time = this.parseDate(timeStr);

            if (chapterId && chapterName) {
                chapters.push(
                    App.createChapter({
                        id: chapterId,
                        name: decodeHTML(chapterName),
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

        $('#image img').each((_, element) => {
            const $img = $(element);

            let pageUrl = $img.attr('src') || $img.attr('data-src') || $img.attr('data-original') || '';

            if (pageUrl.startsWith('//')) {
                pageUrl = `https:${pageUrl}`;
            }

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

        $('ul.genre-cloud li a').each((_, element) => {
            const $item = $(element);
            const label = $item.text().trim();
            const href = $item.attr('href') || '';
            const slug = href.split('/the-loai/').pop()?.split('/')[0]?.split('?')[0];

            if (slug && label) {
                genreTags.push(
                    App.createTag({
                        id: slug,
                        label: decodeHTML(label),
                    })
                );
            }
        });

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
