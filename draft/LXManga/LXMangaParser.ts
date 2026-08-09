import { Chapter, PartialSourceManga, SourceManga, Tag, TagSection } from '@paperback/types';
import { CheerioAPI } from 'cheerio';
import { decodeHTML } from 'entities';
import { parseDate } from '../../common';

// 2. Trích xuất ID và Nonce từ HTML để phục vụ lệnh gọi AJAX
export function extractChapterParams($: CheerioAPI): { postId: string; nonce: string } {
    const postId = $('#post_manga_id').val()?.toString() || $('input[name="post_manga_id"]').val()?.toString() || '';
    const nonce = $('#error_report_nonce').val()?.toString() || $('input[name="error_report_nonce"]').val()?.toString() || '';

    return { postId, nonce };
}

export interface LXChapterItem {
    id: number;
    title: string;
    link: string;
    is_current: string;
    is_new: string;
}

export interface LXChapterResponse {
    success: boolean;
    data?: {
        status: number;
        message: string;
        chapters: LXChapterItem[];
    };
}

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
            let image = match?.[1] || ''; // Dùng optional chaining & fallback ''

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
                        subtitle: lastChapter || undefined,
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

            // 4. Chapter/Subtitle (Lấy chuỗi thông tin chap trong thẻ <p> chứa tên truyện, ví dụ: "2 chap")
            const fullTitleText = $item.find('.box-description p').first().text().trim();
            const chapterMatch = fullTitleText.match(/-\s*(\d+\s*chap)/i);
            const lastChapter = chapterMatch ? chapterMatch[1] : undefined;

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

    parseHotSection($: CheerioAPI): PartialSourceManga[] {
        const mangaList: PartialSourceManga[] = [];

        // Quét từng card truyện trong danh sách (.row > .col)
        $('.row .col').each((_, element) => {
            const $item = $(element);

            // 1. Lấy thẻ <a> tiêu đề chính từ .card-body
            const $titleLink = $item.find('a.comic-link').first();
            const title = $titleLink.attr('title')?.trim() || $titleLink.text().trim();

            // 2. Lấy href và bóc tách mangaId (ví dụ: "https://lxmanga.org/vong-xoay-chi-em.html" -> "vong-xoay-chi-em.html")
            const href = $titleLink.attr('href') || $item.find('a.comic-tmb').attr('href') || '';
            const mangaId = href.split('/').pop()?.split('?')[0] ?? '';

            // 3. Lấy ảnh bìa
            const $img = $item.find('.image-container img.card-img-top').first();
            let image = $img.attr('data-src') || $img.attr('src') || '';

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Lấy thông tin chapter mới nhất (ví dụ: "Chap 8: Mamimi Tanaka", "Chap 213", "Chương 8")
            const lastChapter = $item.find('.overlay-label .label-code').text().trim();

            // 5. Lấy số lượt xem (ví dụ: "119.5M", "104.9M")
            const viewsText = $item
                .find('.comic-more-details .comic-views')
                .clone()
                .children()
                .remove() // Xóa icon SVG lượt xem
                .end()
                .text()
                .trim();

            // Ghép subtitle hiển thị (Ví dụ: "Chap 213 • 👁 104.9M")
            const subtitleParts: string[] = [];
            if (lastChapter) subtitleParts.push(lastChapter);
            if (viewsText) subtitleParts.push(`👁 ${viewsText}`);

            const subtitle = subtitleParts.length > 0 ? subtitleParts.join(' • ') : undefined;

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

    // 1. Parse thông tin chi tiết truyện từ HTML
    parseMangaDetails($: CheerioAPI, mangaId: string): SourceManga {
        const $section = $('#comic-section');

        // Tiêu đề
        const title = $section.find('h1.comic-title').text().trim();

        // Ảnh bìa
        let image = $section.find('.card img.img-fluid').first().attr('src') || '';
        if (image.startsWith('//')) {
            image = `https:${image}`;
        }

        // Trạng thái
        const statusText = $section.find('h5[class*="baka-status-"]').text().trim().toLowerCase();
        const status = statusText.includes('hoàn thành') ? 'Completed' : 'Ongoing';

        // Thể loại (Tags)
        const arrayTags: Tag[] = [];
        $section.find('a[href*="/the-loai/"]').each((_, element) => {
            const label = $(element).text().trim();
            const href = $(element).attr('href') || '';
            const id = href.split('/the-loai/').pop()?.split('/')[0]?.split('?')[0] ?? '';

            if (id && label) {
                arrayTags.push(App.createTag({ id: id, label: label }));
            }
        });

        // Lượt xem & Lượt thích
        const views = $section.find('.fw-semibold:has(svg.bi-eye)').clone().children().remove().end().text().trim();

        const likes = $section.find('#counter-like').text().trim();
        const rawDesc = $section.find('.comic-description, .summary-content').text().trim();

        const descParts: string[] = [];
        if (views) descParts.push(`👁 Lượt xem: ${views}`);
        if (likes) descParts.push(`👍 Lượt thích: ${likes}`);
        if (rawDesc) descParts.push(`\n${rawDesc}`);

        return App.createSourceManga({
            id: mangaId,
            mangaInfo: App.createMangaInfo({
                titles: [decodeHTML(title)],
                image: image,
                status: status,
                author: 'Đang cập nhật',
                artist: 'Đang cập nhật',
                desc: decodeHTML(descParts.join('\n')),
                tags: [App.createTagSection({ id: '0', label: 'Thể loại', tags: arrayTags })],
                hentai: true,
            }),
        });
    }

    // 3. Parse dữ liệu JSON trả về từ AJAX API thành mảng Chapter
    parseChapterListFromJSON(jsonResponse: LXChapterResponse): Chapter[] {
        const chapters: Chapter[] = [];
        const rawChapters = (jsonResponse?.data?.chapters ?? []).slice().reverse();

        rawChapters.forEach((item, index) => {
            const link = item.link || '';
            const rawSlug = link.split('lxmanga.org/').pop() ?? link;
            const chapterId = rawSlug.split('?')[0] || link;

            if (chapterId && item.title) {
                chapters.push(
                    App.createChapter({
                        id: chapterId,
                        name: decodeHTML(item.title.trim()),
                        chapNum: index + 1,
                        langCode: '🇻🇳',
                    })
                );
            }
        });

        return chapters;
    }

    // Parse danh sách trang ảnh trong chapter
    parseChapterDetails($: CheerioAPI): string[] {
        const pages: string[] = [];

        // Chọn tất cả thẻ img nằm trong #viewer
        $('#viewer img').each((_, element) => {
            const $img = $(element);

            // Lấy link ảnh từ src, data-src hoặc data-original
            let pageUrl = $img.attr('src') || $img.attr('data-src') || $img.attr('data-original') || '';

            // Xử lý link bắt đầu bằng //
            if (pageUrl.startsWith('//')) {
                pageUrl = `https:${pageUrl}`;
            }

            // Lọc bỏ đường dẫn rỗng hoặc ảnh thumbnail mặc định
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

        // 1. Thể loại: ID CHỈ NÊN LÀ SLUG (Ví dụ: "3d-hentai", không chứa "=")
        $('ul.genre-cloud li a').each((_, element) => {
            const $item = $(element);
            const label = $item.text().trim();
            const href = $item.attr('href') || '';

            // Trích xuất slug từ href (VD: /the-loai/3d-hentai -> 3d-hentai)
            const slug = href.split('/the-loai/').pop()?.split('/')[0]?.split('?')[0];

            if (slug && label) {
                genreTags.push(
                    App.createTag({
                        id: slug, // Chỉ lưu slug thuần túy
                        label: label,
                    })
                );
            }
        });

        // 2. Sắp xếp: ID giữ dạng "key=value" (chứa "=")
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

    isLastPage($: CheerioAPI): boolean {
        const $pagination = $('ul.pagination');

        // Nếu không có phân trang -> Chỉ có 1 trang -> Hết trang
        if (!$pagination.length) {
            return true;
        }

        const $lastLi = $pagination.find('li').last();
        return $lastLi.hasClass('active');
    }
}
