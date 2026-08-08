import { Chapter, PartialSourceManga, SourceManga, Tag, TagSection } from '@paperback/types';
import { CheerioAPI } from 'cheerio';
import { decodeHTML } from 'entities';
import { parseDate } from '../../common';

export class Parser {
    parseFeaturedSection(json: any): PartialSourceManga[] {
        const mangaList: PartialSourceManga[] = [];

        if (!json || !Array.isArray(json.items)) {
            return mangaList;
        }

        for (const item of json.items) {
            const mangaId = item.id ? String(item.id) : '';
            const title = item.title?.trim() || '';
            const image = item.cover_url || '';

            // Đọc số lượng chapter (VD: "52 chap" hoặc "52 Chaptes")
            const subtitle = item.chapter_count !== undefined ? `${item.chapter_count} chap` : undefined;

            if (mangaId && title) {
                mangaList.push(
                    App.createPartialSourceManga({
                        mangaId: mangaId,
                        title: title,
                        image: image,
                        subtitle: subtitle,
                    })
                );
            }
        }

        return mangaList;
    }

    parseNewUpdatedSection(json: any): PartialSourceManga[] {
        const mangaList: PartialSourceManga[] = [];

        if (!json || !Array.isArray(json.items)) {
            return mangaList;
        }

        for (const item of json.items) {
            const mangaId = item.id ? String(item.id) : '';
            const title = item.title?.trim() || '';
            const image = item.cover_url || '';

            // Đọc số lượng chapter (VD: "52 chap" hoặc "52 Chaptes")
            const subtitle = item.chapter_count !== undefined ? `${item.chapter_count} chap` : undefined;

            if (mangaId && title) {
                mangaList.push(
                    App.createPartialSourceManga({
                        mangaId: mangaId,
                        title: title,
                        image: image,
                        subtitle: subtitle,
                    })
                );
            }
        }

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
                        title: decodeHTML(title),
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
                        title: decodeHTML(title),
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
                        title: decodeHTML(title),
                        image: image,
                        subtitle: lastChapter,
                    })
                );
            }
        });

        return mangaList;
    }

    // Parse thông tin chi tiết truyện
    parseMangaDetails($: CheerioAPI, mangaId: string): SourceManga {
        // 1. Tiêu đề
        const title = $('h1').first().text().trim();

        // 2. Ảnh bìa
        let image = $('img[src*="cover-images"]').first().attr('src') || $('img[src*="moe-cdn.net"]').first().attr('src') || '';
        if (image.startsWith('//')) {
            image = `https:${image}`;
        }

        // 3. Tác giả
        let author = 'Đang cập nhật';
        $('div')
            .filter((_, el) => $(el).prev('h3').text().includes('Tác giả') || $(el).find('a[href*="/authors/"]').length > 0)
            .find('a[href*="/authors/"]')
            .first()
            .each((_, el) => {
                const name = $(el).find('.text-white').text().trim() || $(el).text().trim();
                if (name) author = name;
            });

        if (author === 'Đang cập nhật') {
            const headerAuthor = $('a[href*="/authors/"]').first().text().trim();
            if (headerAuthor) author = headerAuthor;
        }

        // 4. Trích xuất Tags (Thể loại, Parody, Nhân vật)
        const tagSections: TagSection[] = [];

        // Helper trích xuất danh sách Tag và gắn Prefix để đồng bộ với getSearchResults
        const extractTagsFromUrl = (urlPattern: string, prefix: string = ''): Tag[] => {
            const tags: Tag[] = [];
            $(`a[href*="${urlPattern}"]`).each((_, element) => {
                const $tag = $(element);
                const href = $tag.attr('href') || '';
                const rawId = href.split(urlPattern).pop()?.split('/')[0]?.split('?')[0] ?? '';

                const label = $tag.find('div').first().text().trim() || $tag.text().trim();

                if (rawId && label) {
                    // Thêm prefix (parody-, character-) vào ID tag
                    tags.push(App.createTag({ id: `${prefix}${rawId}`, label: label }));
                }
            });
            return tags;
        };

        // a. Thể loại (/genres/) -> Giữ ID số nguyên bản
        const genreTags = extractTagsFromUrl('/genres/');
        if (genreTags.length > 0) {
            tagSections.push(App.createTagSection({ id: 'genres', label: 'Thể loại', tags: genreTags }));
        }

        // b. Parody (/parodies/) -> Gắn prefix 'parody-'
        const parodyTags = extractTagsFromUrl('/parodies/', 'parody-');
        if (parodyTags.length > 0) {
            tagSections.push(App.createTagSection({ id: 'parodies', label: 'Parody', tags: parodyTags }));
        }

        // c. Nhân vật (/characters/) -> Gắn prefix 'character-'
        const characterTags = extractTagsFromUrl('/characters/', 'character-');
        if (characterTags.length > 0) {
            tagSections.push(App.createTagSection({ id: 'characters', label: 'Nhân vật', tags: characterTags }));
        }

        // 5. Mô tả & Thống kê
        const rawDesc = $('h3:contains("Mô tả")').next('div').find('p').text().trim();

        const views = $('span:contains("Lượt xem")').prev('span').text().trim();
        const likes = $('span:contains("Lượt thích")').prev('span').text().trim();
        const follows = $('span:contains("Theo dõi")').prev('span').text().trim();

        const descParts: string[] = [];
        if (rawDesc) descParts.push(`${rawDesc}`);
        if (views) descParts.push(`\n👁 Lượt xem: ${views}`);
        if (likes) descParts.push(`❤️ Lượt thích: ${likes}`);
        if (follows) descParts.push(`📌 Theo dõi: ${follows}`);

        const description = descParts.join('\n');

        return App.createSourceManga({
            id: mangaId,
            mangaInfo: App.createMangaInfo({
                titles: [decodeHTML(title)],
                image: image,
                status: 'Ongoing',
                author: author,
                artist: author,
                desc: decodeHTML(description),
                tags: tagSections,
                hentai: true,
            }),
        });
    }

    parseChapterList($: CheerioAPI): Chapter[] {
        const chapters: Chapter[] = [];
        const seenChapterIds = new Set<string>();

        // 1. Quét tất cả thẻ <a> dẫn tới chapter
        const chapterElements = $('a[href*="/chapter/"]').toArray();

        // Lọc bỏ các nút không phải trong danh sách (VD: nút "Bắt đầu đọc" ở header)
        const validElements = chapterElements.filter((el) => {
            const text = $(el).text();
            return !text.includes('Bắt đầu đọc');
        });

        const totalChapters = validElements.length;

        validElements.forEach((element, index) => {
            const $a = $(element);
            const href = $a.attr('href') || '';

            // Extract ID từ href (Ví dụ: "/manga/69415/chapter/133091" -> "69415/chapter/133091")
            const rawSlug = href.split('/manga/').pop() ?? '';
            const chapterId = rawSlug.split('?')[0] || href;

            if (!chapterId || seenChapterIds.has(chapterId)) return;
            seenChapterIds.add(chapterId);

            // 2. Lấy tên chương (Lấy span chứa text tên chương)
            const chapterName = $a.find('span.break-all, span.text-zinc-400, span.font-medium, span.font-bold').first().text().trim() || $a.text().trim();

            // 3. Tính chapNum chuẩn (kể cả với Oneshot hoặc tên không có số)
            const chapNumMatch = chapterName.match(/#?(\d+(?:\.\d+)?)/);
            let chapNum = totalChapters - index; // Mặc định tính giảm dần theo thứ tự danh sách

            if (chapNumMatch?.[1]) {
                chapNum = parseFloat(chapNumMatch[1]);
            } else if (chapterName.toLowerCase().includes('oneshot')) {
                chapNum = 1;
            }

            // 4. Lấy thời gian cập nhật ("Hôm nay", "2 ngày trước", "5/3/2026"...)
            // Tìm span chứa icon clock hoặc chứa text thời gian
            const timeStr =
                $a.find('span:contains("Hôm nay"), span:contains("trước"), span:contains("ngày"), span:contains("giờ")').last().text().trim() ||
                $a.find('span.text-xs span.flex').text().trim();

            const time = parseDate(timeStr);

            chapters.push(
                App.createChapter({
                    id: chapterId,
                    name: chapterName,
                    chapNum: chapNum,
                    langCode: '🇻🇳',
                    time: time,
                })
            );
        });

        return chapters;
    }

    // Parse danh sách trang ảnh trong chapter
    parseChapterDetails($: CheerioAPI): string[] {
        const pages: string[] = [];

        // Quét tất cả các thẻ img nằm trong div container có id bắt đầu bằng reader-page-
        $('div[id^="reader-page-"] img').each((_, element) => {
            const $img = $(element);

            // Lấy link ảnh từ src hoặc data-src
            let pageUrl = $img.attr('src') || $img.attr('data-src') || '';

            // Xử lý link bắt đầu bằng //
            if (pageUrl.startsWith('//')) {
                pageUrl = `https:${pageUrl}`;
            }

            if (pageUrl) {
                pages.push(pageUrl.trim());
            }
        });

        return pages;
    }

    // Parse danh sách thể loại (Tags)
    parseTags($: CheerioAPI): TagSection[] {
        const genreTags: Tag[] = [];
        const sortTags: Tag[] = [];

        // 1. Thể loại: Trích xuất ID từ URL /genres/{id}
        $('a[href*="/genres/"]').each((_, element) => {
            const $item = $(element);
            const href = $item.attr('href') || '';

            // Tách lấy ID số từ href (Ví dụ: /genres/416 -> "416")
            const id = href.split('/genres/').pop()?.split('/')[0]?.split('?')[0];

            // Lấy tên thể loại từ div chứa class truncate hoặc div con đầu tiên
            const label = $item.find('.truncate').text().trim() || $item.find('.flex-1 > div').first().text().trim();

            if (id && label) {
                genreTags.push(
                    App.createTag({
                        id: id,
                        label: label,
                    })
                );
            }
        });

        return [App.createTagSection({ id: 'genres', label: 'Thể loại', tags: genreTags })];
    }
}
