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

    parseStaffPickSection(json: any): PartialSourceManga[] {
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

    parseNewReupSection(json: any): PartialSourceManga[] {
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

    parseRandomSection(data: any): PartialSourceManga[] {
        const mangaList: PartialSourceManga[] = [];

        // Hỗ trợ cả trường hợp data là JSON string hoặc Array/Object đã parse
        const items: any[] = typeof data === 'string' ? JSON.parse(data) : data;

        if (!Array.isArray(items)) {
            return mangaList;
        }

        for (const item of items) {
            const mangaId = item.id ? String(item.id) : '';
            const title = item.title || '';
            const image = item.cover_url || '';

            // Ưu tiên hiển thị Tác giả ở subtitle, nếu không có thì hiển thị Số chương
            const author = Array.isArray(item.authors) && item.authors.length > 0 ? item.authors[0].name : undefined;
            const chapterText = item.chapter_count ? `${item.chapter_count} chương` : undefined;
            const subtitle = author || chapterText;

            if (mangaId && title) {
                mangaList.push(
                    App.createPartialSourceManga({
                        mangaId: mangaId,
                        title: decodeHTML(title),
                        image: image,
                        subtitle: subtitle,
                    })
                );
            }
        }

        return mangaList;
    }

    // Parse danh sách truyện (Search, Homepage, ViewMore)
    parseSearchResults(json: any): PartialSourceManga[] {
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

            if (mangaId) {
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

        // a. Thể loại (/genres/) -> Gắn prefix 'genre-'
        const genreTags = extractTagsFromUrl('/genres/', 'genre-');
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

        // Lọc bỏ các nút không thuộc danh sách chương (như nút "Bắt đầu đọc")
        const validElements = chapterElements.filter((el) => {
            const text = $(el).text();
            return !text.includes('Bắt đầu đọc');
        });

        const totalChapters = validElements.length;

        validElements.forEach((element, index) => {
            const $a = $(element);
            const href = $a.attr('href') || '';

            // Extract ID từ href (VD: "/manga/27652/chapter/133079" -> "27652/chapter/133079")
            const rawSlug = href.split('/manga/').pop() ?? '';
            const chapterId = rawSlug.split('?')[0] || href;

            if (!chapterId || seenChapterIds.has(chapterId)) return;
            seenChapterIds.add(chapterId);

            // 2. Lấy tên chương chuẩn từ DOM HTML
            let chapterName = $a.find('div.flex-col > span.font-bold').text().trim();
            if (!chapterName) {
                chapterName = $a.find('span.break-all, span.text-zinc-400').first().text().trim() || $a.text().trim();
            }

            // 3. Gán chapNum theo vị trí xuất hiện (HTML đã sắp xếp từ MỚI nhất -> CŨ nhất)
            const chapNum = totalChapters - index;

            // 4. Lấy thời gian cập nhật & Loại bỏ các chữ rác như "Đã đọc", "đã đọc"
            let timeStr = $a.find('span.text-xs span.flex').clone().children().remove().end().text().trim();

            // Loại bỏ chữ "đã đọc" và chuẩn hóa khoảng trắng
            timeStr = timeStr
                .replace(/đã đọc/gi, '')
                .replace(/\s+/g, ' ')
                .trim();

            const time = parseDate(timeStr);

            chapters.push(
                App.createChapter({
                    id: chapterId,
                    name: chapterName,
                    chapNum: chapNum,
                    langCode: '🇻🇳',
                    time: time,
                    group: timeStr,
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
    parseTags($genres: CheerioAPI, $home?: CheerioAPI): TagSection[] {
        const sortTags: Tag[] = [
            App.createTag({ id: 'sort-updated_at', label: 'Mới' }),
            App.createTag({ id: 'sort-title', label: 'A-Z' }),
            App.createTag({ id: 'sort-views', label: 'Xem nhiều' }),
            App.createTag({ id: 'sort-follows', label: 'Theo dõi' }),
            App.createTag({ id: 'sort-likes', label: 'Thích' }),
        ];

        const genreTags: Tag[] = [];
        const albumTags: Tag[] = [];

        // 1. Parse Album nổi bật từ HTML của https://mimihentai.moe/
        if ($home) {
            $home('a[href*="/albums/"]').each((_, element) => {
                const $item = $home(element);
                const href = $item.attr('href') || '';

                const id = href.split('/albums/').pop()?.split('/')[0]?.split('?')[0];

                // Bỏ qua link cá nhân /albums/me hoặc ID không hợp lệ
                if (!id || isNaN(Number(id))) {
                    return;
                }

                const label = $item.find('h3').first().text().trim();

                if (label) {
                    albumTags.push(
                        App.createTag({
                            id: `album-${id}`, // Gắn prefix 'album-' để getSearchResults phân loại
                            label: decodeHTML(label),
                        })
                    );
                }
            });
        }

        // 2. Parse Thể loại từ HTML của https://mimihentai.moe/genres
        if ($genres) {
            $genres('a[href*="/genres/"]').each((_, element) => {
                const $item = $genres(element);
                const href = $item.attr('href') || '';

                const id = href.split('/genres/').pop()?.split('/')[0]?.split('?')[0];
                const rawLabel = $item.find('.truncate').text().trim() || $item.find('.flex-1 > div').first().text().trim();

                // Tách lấy số lượng truyện từ div chứa thông tin count (Ví dụ: "16 truyện")
                const countText = $item.find('div.text-xs.text-zinc-500').text().trim();

                if (id && rawLabel) {
                    // Ghép label với count: ví dụ "Tên Thể Loại (16 truyện)"
                    const fullLabel = countText ? `${rawLabel} (${countText})` : rawLabel;

                    genreTags.push(
                        App.createTag({
                            id: `genre-${id}`, // Gắn prefix 'genre-' để getSearchResults phân loại
                            label: decodeHTML(fullLabel),
                        })
                    );
                }
            });
        }

        const sections: TagSection[] = [];

        if (albumTags.length > 0) {
            sections.push(App.createTagSection({ id: 'albums', label: 'Album nổi bật', tags: albumTags }));
        }

        sections.push(App.createTagSection({ id: 'sorts', label: 'Sắp xếp', tags: sortTags }));

        if (genreTags.length > 0) {
            sections.push(App.createTagSection({ id: 'genres', label: 'Thể loại', tags: genreTags }));
        }

        return sections;
    }
}
