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
            const title = $titleLink.text().trim();

            // 2. Manga ID từ href (Lấy toàn bộ slug đường dẫn, bỏ dấu / ở đầu nếu có)
            // VD: "/ai-enhanced-x-level-yeha..." -> "ai-enhanced-x-level-yeha..."
            const href = $titleLink.attr('href') || $item.find('.item-thumb a').attr('href') || '';
            const mangaId = href.replace(/^\//, '').split('?')[0];

            // 3. Image URL từ thẻ img trong .item-thumb
            const $img = $item.find('.item-thumb img').first();
            let image = $img.attr('src') || $img.attr('data-src') || '';

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Subtitle: Bóc tách số lượng ảnh từ tiêu đề nếu có (VD: "(51 photos)" -> "51 photos")
            const subtitleMatch = title.match(/\((\d+\s*photos?)\)/i);
            const subtitle = subtitleMatch ? subtitleMatch[1] : undefined;

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
            const title = $titleLink.text().trim();

            // 2. Manga ID từ href (Lấy toàn bộ slug đường dẫn, bỏ dấu / ở đầu nếu có)
            // VD: "/ai-enhanced-x-level-yeha..." -> "ai-enhanced-x-level-yeha..."
            const href = $titleLink.attr('href') || $item.find('.item-thumb a').attr('href') || '';
            const mangaId = href.replace(/^\//, '').split('?')[0];

            // 3. Image URL từ thẻ img trong .item-thumb
            const $img = $item.find('.item-thumb img').first();
            let image = $img.attr('src') || $img.attr('data-src') || '';

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Subtitle: Bóc tách số lượng ảnh từ tiêu đề nếu có (VD: "(51 photos)" -> "51 photos")
            const subtitleMatch = title.match(/\((\d+\s*photos?)\)/i);
            const subtitle = subtitleMatch ? subtitleMatch[1] : undefined;

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
            const title = rawTitle ?? '';

            // 2. Manga ID từ href (loại bỏ dấu / ở đầu và query params)
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
            const subtitle = subtitleMatch?.[1] ? subtitleMatch[1].trim() : undefined;

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
            const title = $titleLink.text().trim();

            // 2. Manga ID từ href (Lấy toàn bộ slug đường dẫn, bỏ dấu / ở đầu nếu có)
            // VD: "/ai-enhanced-x-level-yeha..." -> "ai-enhanced-x-level-yeha..."
            const href = $titleLink.attr('href') || $item.find('.item-thumb a').attr('href') || '';
            const mangaId = href.replace(/^\//, '').split('?')[0];

            // 3. Image URL từ thẻ img trong .item-thumb
            const $img = $item.find('.item-thumb img').first();
            let image = $img.attr('src') || $img.attr('data-src') || '';

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Subtitle: Bóc tách số lượng ảnh từ tiêu đề nếu có (VD: "(51 photos)" -> "51 photos")
            const subtitleMatch = title.match(/\((\d+\s*photos?)\)/i);
            const subtitle = subtitleMatch ? subtitleMatch[1] : undefined;

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
        // Xóa bớt suffix "( Page X / Y )" nếu muốn tiêu đề sạch hơn
        const title = rawTitle.replace(/\s*-\s*\(\s*Page\s*\d+\s*\/\s*\d+\s*\)$/i, '').trim();

        // 2. Ảnh bìa (Lấy ảnh đầu tiên trong .article-fulltext)
        let image = $('.article-fulltext img').first().attr('src') || '';
        if (image.startsWith('//')) {
            image = `https:${image}`;
        }

        // 3. Tác giả / Nguồn đăng (Lấy từ .article-info strong)
        const author = $('.article-info strong').text().trim() || 'Buondua';

        // 4. Thể loại / Tags (Lấy từ .article-tags a.tag)
        const arrayTags: Tag[] = [];
        $('.article-tags a.tag').each((_, element) => {
            const $tag = $(element);
            const label = $tag.find('span').text().trim() || $tag.text().trim();
            const href = $tag.attr('href') || '';

            // Trích xuất ID/Slug từ link dạng "/tag/x-level-12051" -> "x-level-12051"
            // Thêm ?? '' để đảm bảo luôn trả về string kể cả khi mảng split rỗng
            const id = (href.replace(/^\/tag\//, '').split('?')[0] ?? '').trim();

            if (id && label && !arrayTags.some((t) => t.id === id)) {
                arrayTags.push(App.createTag({ id: id, label: label }));
            }
        });

        // 5. Mô tả (Trích xuất Ngày đăng, Password giải nén, Link download nếu cần)
        const publishDate = $('.article-info small').last().text().trim();
        const password = $('code').text().trim();

        const descParts: string[] = [];
        if (publishDate) descParts.push(`📅 Ngày đăng: ${publishDate}`);
        // if (password) descParts.push(`🔑 ${password}`);

        const description = descParts.join('\n');

        const [realMangaId, encodedCover] = compositeId.split('|');
        const homeCoverUrl = encodedCover ? decodeURIComponent(encodedCover) : '';

        return App.createSourceManga({
            id: compositeId,
            mangaInfo: App.createMangaInfo({
                titles: [decodeHTML(title)],
                image: homeCoverUrl,
                status: 'Completed', // Photopack bài viết trên Buondua luôn là Completed
                author: author,
                artist: author,
                desc: decodeHTML(description),
                tags: [App.createTagSection({ id: '0', label: 'Thể loại', tags: arrayTags })],
                hentai: true,
            }),
        });
    }

    // Helper quy đổi thời gian tương đối (VD: "58 phút trước", "26 ngày trước") thành Date
    parseDate(dateStr: string): Date {
        if (!dateStr) return new Date();

        // Tách "1/8/2026" -> day = 1, month = 8, year = 2026
        const [dayStr, monthStr, yearStr] = dateStr.split('/');

        if (dayStr && monthStr && yearStr) {
            const day = parseInt(dayStr, 10);
            const month = parseInt(monthStr, 10) - 1; // JS Month chạy từ 0 đến 11 (Tháng 8 = index 7)
            const year = parseInt(yearStr, 10);

            return new Date(year, month, day);
        }

        return new Date();
    }

    // Parse trực tiếp mảng JSON thành danh sách Chapter
    parseChapterList($: CheerioAPI): Chapter[] {
        const chapters: Chapter[] = [];
        const seenChapNums = new Set<number>();

        // Lấy tất cả các thẻ <a> trong danh sách phân trang (.pagination-list)
        $('.pagination-list li a.pagination-link').each((index, element) => {
            const $a = $(element);
            const href = $a.attr('href') || '';
            const pageText = $a.text().trim();

            if (!href) return;

            // Chỉ chấp nhận pageText là CHỮ SỐ (bỏ qua các nút Next, Prev, "...")
            const chapNum = parseInt(pageText, 10);
            if (isNaN(chapNum)) return;

            // Bỏ qua nếu chapNum này đã tồn tại trong danh sách (Chống trùng lặp)
            if (seenChapNums.has(chapNum)) return;
            seenChapNums.add(chapNum);

            // Chuẩn hóa chapterId: "slug-id?page=X"
            const chapterId = href.replace(/^\//, '').trim();

            if (chapterId) {
                chapters.push(
                    App.createChapter({
                        id: chapterId,
                        name: `Trang ${chapNum}`,
                        chapNum: chapNum,
                        // langCode: '🇻🇳',
                        time: new Date(),
                    })
                );
            }
        });

        // Trường hợp bài viết chỉ có 1 trang (không có .pagination-list)
        if (chapters.length === 0) {
            const canonicalHref = $('link[rel="canonical"]').attr('href') || '';
            const fallbackId = canonicalHref.replace(/^https?:\/\/[^\/]+\//, '').trim();

            if (fallbackId) {
                chapters.push(
                    App.createChapter({
                        id: fallbackId,
                        name: 'Trang 1',
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

        // Lấy tất cả ảnh trong wrapper .article-fulltext
        $('.article-fulltext img').each((_, element) => {
            const $img = $(element);

            // Lấy đường dẫn ảnh từ src, data-src hoặc data-original
            let pageUrl = $img.attr('src') || $img.attr('data-src') || $img.attr('data-original') || '';

            pageUrl = pageUrl.trim();

            // Chuẩn hóa link tương đối (bắt đầu bằng //)
            if (pageUrl.startsWith('//')) {
                pageUrl = `https:${pageUrl}`;
            }

            // Lọc bỏ đường dẫn rỗng và các loại ảnh quảng cáo/thumbnail không phù hợp
            if (pageUrl && !pageUrl.includes('thumb-default') && !pages.includes(pageUrl)) {
                pages.push(pageUrl);
            }
        });

        return pages;
    }

    // Parse danh sách thể loại (Tags)
    parseTags($: CheerioAPI): TagSection[] {
        const genreTags: Tag[] = [];

        // 1. Thể loại: Bóc tách từ .collection-item .item-link
        $('.collection-item .item-link').each((_, element) => {
            const $item = $(element);
            const label = $item.find('span').text().trim() || $item.text().trim();
            const href = $item.attr('href') || '';

            // Trích xuất slug từ href (VD: /tag/cosplay-10688 -> cosplay-10688)
            // Loại bỏ dấu / ở đầu và tiền tố "tag/" nếu có
            const slug = href
                .replace(/^\//, '')
                .replace(/^tag\//, '')
                .split('?')[0];

            if (slug && label) {
                genreTags.push(
                    App.createTag({
                        id: slug, // vd: "cosplay-10688" hoặc "wanjututuya-玩偶兔子-15315"
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

    // Nếu không tìm thấy thanh phân trang -> Chỉ có 1 trang (coi như trang cuối)
    if (!currentItem.length) return true;

    // Nếu đằng sau thẻ li chứa 'is-current' không còn thẻ li nào nữa -> Đã ở trang cuối
    return currentItem.next('li').length === 0;
};
