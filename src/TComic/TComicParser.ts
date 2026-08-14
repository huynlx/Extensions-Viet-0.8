import { Chapter, PartialSourceManga, Tag, TagSection } from '@paperback/types';
import { CheerioAPI } from 'cheerio';
import { decodeHTML } from 'entities';

export class Parser {
    parseFeaturedSection(jsonString: string): PartialSourceManga[] {
        const mangaList: PartialSourceManga[] = [];

        try {
            const data = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;

            // Cắt từ 35 items xuống 12 items
            if (Array.isArray(data?.comics)) {
                for (const comic of data.comics.slice(0, 12)) {
                    const mangaId = comic.id || comic.slug || '';
                    const title = decodeHTML(comic.title?.trim() || '');
                    const image = comic.thumbnail || '';
                    const lastChapter = comic.last_chapter?.name ? decodeHTML(comic.last_chapter.name) : undefined;

                    if (mangaId && title) {
                        mangaList.push(
                            App.createPartialSourceManga({
                                mangaId: mangaId,
                                title: title,
                                image: image,
                                subtitle: lastChapter,
                            })
                        );
                    }
                }
            }
        } catch (error) {
            console.error('Lỗi parse JSON featured section:', error);
        }

        return mangaList;
    }

    parseComicSection(jsonString: any): PartialSourceManga[] {
        const mangaList: PartialSourceManga[] = [];

        try {
            const data = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;

            if (Array.isArray(data?.comics)) {
                for (const comic of data.comics) {
                    const mangaId = comic.id || comic.slug || '';
                    const title = decodeHTML(comic.title?.trim() || '');
                    const image = comic.thumbnail || '';
                    const lastChapter = comic.last_chapter?.name ? decodeHTML(comic.last_chapter.name) : undefined;

                    if (mangaId && title) {
                        mangaList.push(
                            App.createPartialSourceManga({
                                mangaId: mangaId,
                                title: title,
                                image: image,
                                subtitle: lastChapter,
                            })
                        );
                    }
                }
            }
        } catch (error) {
            console.error('Lỗi parse JSON comic section:', error);
        }

        return mangaList;
    }

    // Alias tham chiếu trực tiếp
    parseNewUpdatedSection = this.parseComicSection;
    parseHotSection = this.parseComicSection;
    parseCompletedSection = this.parseComicSection;
    parseBoySection = this.parseComicSection;
    parseGirlSection = this.parseComicSection;
    parseNewSection = this.parseComicSection;

    // Parse danh sách truyện (Search, Homepage, ViewMore)
    parseSearchResults($: CheerioAPI): PartialSourceManga[] {
        const mangaList: PartialSourceManga[] = [];

        $('#ctl00_divCenter .items .row .item').each((_, element) => {
            const $item = $(element);

            // 1. Title & Link từ figcaption h3 a
            const $titleLink = $item.find('figcaption h3 a').first();
            const rawTitle = $titleLink.attr('title')?.trim() || $titleLink.text().trim();
            const title = decodeHTML(rawTitle);

            // 2. Manga ID từ Href
            const href = $titleLink.attr('href') || $item.find('a').first().attr('href') || '';
            const mangaId = href.split('/truyen-tranh/').pop()?.split('/')[0]?.split('?')[0] ?? '';

            // 3. Image (ưu tiên data-original -> data-retries -> src)
            const $img = $item.find('.image img').first();
            let image = $img.attr('data-original') || $img.attr('data-retries') || $img.attr('src') || '';

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Chapter mới nhất
            const rawLastChapter = $item.find('.comic-item .chapter').first().find('a').text().trim();
            const lastChapter = rawLastChapter ? decodeHTML(rawLastChapter) : undefined;

            if (mangaId && title && !mangaId.includes('javascript')) {
                mangaList.push(
                    App.createPartialSourceManga({
                        mangaId: mangaId,
                        title: title,
                        image: image,
                        subtitle: lastChapter,
                    })
                );
            }
        });

        return mangaList;
    }

    // Parse thông tin chi tiết truyện
    parseMangaDetails(jsonInput: any, mangaId: string): any {
        const data = typeof jsonInput === 'string' ? JSON.parse(jsonInput) : jsonInput;
        const item = data?.data || {};

        const title = decodeHTML(item.title?.trim() || '');
        const image = item.thumbnail || '';
        const author = decodeHTML(item.authors?.trim() || 'Đang cập nhật');

        // 1. Chuẩn hóa trạng thái: ONGOING -> Ongoing, các trường hợp khác -> Completed
        const status = item.status === 'ONGOING' ? 'Ongoing' : 'Completed';

        // 2. Làm sạch description (Lọc bỏ thẻ HTML như <p>, <em>, <strong>, <div>) và decode HTML entities
        let rawDesc = item.description || '';
        let description = decodeHTML(rawDesc.replace(/<[^>]*>/g, '').trim());

        // 3. Parse danh mục thể loại (genres)
        const arrayTags: Tag[] = [];
        if (Array.isArray(item.genres)) {
            for (const genre of item.genres) {
                const tagId = genre.id || genre.slug || '';
                const tagLabel = decodeHTML(genre.name || genre.title || '');
                if (tagId && tagLabel) {
                    arrayTags.push(App.createTag({ id: String(tagId), label: tagLabel }));
                }
            }
        }

        // 4. Lấy thêm tên gọi khác (nếu có)
        const titles: string[] = [title];
        if (Array.isArray(item.other_names)) {
            for (const otherName of item.other_names) {
                const trimmed = decodeHTML(otherName?.trim() || '');
                if (trimmed && trimmed !== title) {
                    titles.push(trimmed);
                }
            }
        }

        return App.createSourceManga({
            id: mangaId,
            mangaInfo: App.createMangaInfo({
                titles: titles,
                image: image,
                status: status,
                author: author,
                artist: author,
                desc: description,
                tags: [App.createTagSection({ id: '0', label: 'Thể loại', tags: arrayTags })],
                hentai: false,
            }),
        });
    }

    // Parse trực tiếp mảng JSON thành danh sách Chapter
    parseChapterList(data: any[]): Chapter[] {
        const chapters: Chapter[] = [];

        if (!Array.isArray(data)) return chapters;

        for (let i = 0; i < data.length; i++) {
            const item = data[i];

            // 1. Lấy ID chapter (Ưu tiên item.id, fallback slug_chapter)
            const chapterId = item.id?.toString() || item.slug_chapter || '';
            if (!chapterId) continue;

            // 2. Lấy tên Chapter (VD: "Chapter 3") và decode HTML entities
            const chapterName = decodeHTML(item.name?.trim() || `Chapter ${data.length - i}`);

            // 3. Tách số Chapter từ tên (VD: "Chapter 3.5" -> 3.5)
            const chapNumMatch = chapterName.match(/chapter\s*([\d.]+)/i) || chapterName.match(/(\d+(\.\d+)?)/);
            const chapNum = chapNumMatch ? parseFloat(chapNumMatch[1]) : data.length - i;

            // 4. Lượt xem (view_count)
            const viewCount = item.view_count ?? item.view ?? 0;
            const formattedView = new Intl.NumberFormat('vi-VN').format(viewCount);

            // 5. Thời gian tạo (created_at trong JSON là Epoch timestamp tính bằng ms)
            const createdTimestamp = Number(item.created_at) || 0;
            const dateObj = createdTimestamp > 0 ? new Date(createdTimestamp) : new Date();

            // Định dạng ngày hiển thị (VD: 25/05/2026)
            const formattedDate =
                createdTimestamp > 0 ? `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}` : '';

            // 6. Ghép thông tin hiển thị phụ
            const groupInfo = formattedDate ? `${formattedDate} • ${formattedView} lượt xem` : `${formattedView} lượt xem`;

            chapters.push(
                App.createChapter({
                    id: chapterId,
                    name: chapterName,
                    chapNum: chapNum,
                    time: dateObj,
                    group: groupInfo,
                    langCode: '🇻🇳',
                })
            );
        }

        return chapters;
    }

    // Parse danh sách trang ảnh trong chapter
    parseChapterDetails(jsonInput: any): string[] {
        const pages: string[] = [];

        try {
            const data = typeof jsonInput === 'string' ? JSON.parse(jsonInput) : jsonInput;
            const images = data?.data?.images;

            if (Array.isArray(images)) {
                for (const img of images) {
                    let pageUrl = img.src?.trim() || '';

                    if (pageUrl.startsWith('//')) {
                        pageUrl = `https:${pageUrl}`;
                    }

                    // Chuyển https://s3.ap-southeast-1.wasabisys.com/imgcdn.tcomic.top/...
                    // Thành https://imgcdn.tcomic.top/...
                    if (pageUrl.includes('wasabisys.com/imgcdn.tcomic.top')) {
                        pageUrl = pageUrl.replace(/^https?:\/\/s3\.ap-southeast-1\.wasabisys\.com\/imgcdn\.tcomic\.top/, 'https://imgcdn.tcomic.top');
                    }

                    if (pageUrl) {
                        pages.push(pageUrl);
                    }
                }
            }
        } catch (error) {
            console.error('Lỗi parse JSON chapter details:', error);
        }

        return pages;
    }

    // Parse danh sách thể loại (Tags)
    parseTags(jsonInput: any): TagSection[] {
        const genreTags: Tag[] = [];

        try {
            const categories = typeof jsonInput === 'string' ? JSON.parse(jsonInput) : jsonInput;

            if (Array.isArray(categories)) {
                for (const item of categories) {
                    const id = item.id?.toString() || '';
                    const label = decodeHTML(item.name?.trim() || '');

                    if (id && label && id !== 'all') {
                        genreTags.push(App.createTag({ id, label }));
                    }
                }
            }
        } catch (error) {
            console.error('Lỗi parse JSON categories:', error);
        }

        return [App.createTagSection({ id: 'genres', label: 'Thể loại', tags: genreTags })];
    }
}
