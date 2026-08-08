import { Chapter, PartialSourceManga, SourceManga, Tag, TagSection } from '@paperback/types';
import { CheerioAPI } from 'cheerio';
import { decodeHTML } from 'entities';

export class Parser {
    parseNewUpdatedSection($: CheerioAPI): PartialSourceManga[] {
        const mangaList: PartialSourceManga[] = [];

        $('.tidymag-cgrid-post').each((_, element) => {
            const $item = $(element);

            // 1. Title & Link
            const $titleLink = $item.find('h3.tidymag-cgrid-post-title a').first();
            const title = $titleLink.text().trim();
            const href = $titleLink.attr('href') || $item.find('.tidymag-cgrid-post-thumbnail a').attr('href') || '';

            // 2. Manga ID
            let mangaId = '';
            try {
                const urlObj = new URL(href);
                mangaId = urlObj.pathname.replace(/^\/|\/$/g, '');
            } catch {
                mangaId = href.replace(/^https?:\/\/[^\/]+/, '').replace(/^\/|\/$/g, '');
            }

            // 3. Image URL
            const $img = $item.find('.tidymag-cgrid-post-thumbnail img').first();
            let image = $img.attr('data-src') || $img.attr('src') || '';

            if (image.startsWith('data:image')) {
                image = $img.attr('data-src') || '';
            }

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Subtitle (Lấy số ảnh từ tag .iconimage nếu có, VD: "27 photos")
            const photoCount = $item.find('.iconimage').text().replace(/\D/g, '').trim();
            const subtitle = photoCount ? `${photoCount} photos` : undefined;

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
            const title = $titleLink.text().trim();
            const href = $titleLink.attr('href') || $item.find('.post-thumbnail a').attr('href') || '';

            // 2. Manga ID từ URL (VD: "https://misskon.com/99983-pure-media-vol300-yeha-165-photos/"
            // -> "99983-pure-media-vol300-yeha-165-photos")
            let mangaId = '';
            try {
                const urlObj = new URL(href);
                mangaId = urlObj.pathname.replace(/^\/|\/$/g, '');
            } catch {
                mangaId = href.replace(/^https?:\/\/[^\/]+/, '').replace(/^\/|\/$/g, '');
            }

            // 3. Image URL: Ưu tiên data-src do site sử dụng Lazy Loading (src mặc định chứa SVG placeholder)
            const $img = $item.find('.post-thumbnail img').first();
            let image = $img.attr('data-src') || $img.attr('src') || '';

            if (image.startsWith('data:image')) {
                image = $img.attr('data-src') || '';
            }

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Subtitle: Bóc tách số lượng photos/videos trong tiêu đề (VD: "(38 photos + 2 videos)")
            const subtitleMatch = title.match(/\(([^)]*(?:photos|pictures|videos)[^)]*)\)/i);
            const subtitle = subtitleMatch?.[1]?.trim();

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

            // 1. Tiêu đề: Lấy từ h3 đứng liền sau .post-thumbnail
            const $h3 = $thumb.next('h3');
            const $titleLink = $h3.find('a').first();
            const title = $titleLink.text().trim() || $thumbLink.attr('title')?.trim() || '';

            // 2. Link & Manga ID
            const href = $titleLink.attr('href') || $thumbLink.attr('href') || '';
            let mangaId = '';
            try {
                const urlObj = new URL(href);
                mangaId = urlObj.pathname.replace(/^\/|\/$/g, '');
            } catch {
                mangaId = href.replace(/^https?:\/\/[^\/]+/, '').replace(/^\/|\/$/g, '');
            }

            // 3. Image URL: Ưu tiên data-src do site dùng Lazy Loading
            const $img = $thumb.find('img').first();
            let image = $img.attr('data-src') || $img.attr('src') || '';

            if (image.startsWith('data:image')) {
                image = $img.attr('data-src') || '';
            }

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Subtitle: Bóc tách thông tin (VD: "129 photos + 3 videos" hoặc "23 photos")
            const subtitleMatch = title.match(/\(([^)]*(?:photos|anh|pictures|videos)[^)]*)\)/i);
            const subtitle = subtitleMatch?.[1]?.trim();

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

        $('.tidymag-cgrid-post').each((_, element) => {
            const $item = $(element);

            // 1. Title & Link
            const $titleLink = $item.find('h3.tidymag-cgrid-post-title a').first();
            const title = $titleLink.text().trim();
            const href = $titleLink.attr('href') || $item.find('.tidymag-cgrid-post-thumbnail a').attr('href') || '';

            // 2. Manga ID từ URL (VD: "https://maulon.vip/girl-xinh-di-bar.html" -> "girl-xinh-di-bar.html")
            let mangaId = '';
            try {
                const urlObj = new URL(href, 'https://maulon.vip');
                mangaId = urlObj.pathname.replace(/^\/|\/$/g, '');
            } catch {
                mangaId = href.replace(/^https?:\/\/[^\/]+\//, '').replace(/\/$/, '');
            }

            // 3. Image URL: Lấy từ img.thumb-anhsex hoặc .tidymag-cgrid-post-thumbnail img
            const $img = $item.find('.tidymag-cgrid-post-thumbnail img').first();
            let image = $img.attr('src') || $img.attr('data-src') || '';

            if (image.startsWith('data:image')) {
                image = $img.attr('data-src') || '';
            }

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Subtitle: Bóc tách số lượng ảnh từ thẻ .iconimage (VD: "27 " -> "27 photos")
            const photoCount = $item.find('.iconimage').text().replace(/\D/g, '').trim();
            const subtitle = photoCount ? `${photoCount} photos` : undefined;

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
    parseMangaDetails($: CheerioAPI, compositeId: string): SourceManga {
        // 1. Tiêu đề
        const title = $('h1.entry-title, h1.post-title').first().text().trim();

        // 2. Tác giả / Nguồn
        const author = 'MauLon';

        // 3. Tags & Categories
        const arrayTags: Tag[] = [];

        // Lấy từ Categories
        $('.entry-footer .tidymag-entry-meta-single-cats a, .rank-math-breadcrumb a').each((_, element) => {
            const $tag = $(element);
            const label = $tag.text().trim();
            const href = $tag.attr('href') || '';
            if (href === 'https://maulon.vip' || href === 'https://maulon.vip/') return;

            const id = href.replace(/\/$/, '').split('/').pop() || href;

            if (id && label && !arrayTags.some((t) => t.id === id)) {
                arrayTags.push(App.createTag({ id: id, label: label }));
            }
        });

        // Lấy từ Tags
        $('.tags-links a').each((_, element) => {
            const $tag = $(element);
            const label = $tag.text().trim();
            const href = $tag.attr('href') || '';

            const id = href.replace(/\/$/, '').split('/tag/')[1]?.trim() || href.replace(/\/$/, '').split('/').pop() || '';

            if (id && label && !arrayTags.some((t) => t.id === id)) {
                arrayTags.push(App.createTag({ id: id, label: label }));
            }
        });

        // 4. Mô tả: Lấy thẻ <p> nằm ngay liền kề phía dưới div.page-links
        let description = $('.entry-content .page-links + p').text().trim();

        // Hoặc nếu có nhiều thẻ <p> liền kề liên tiếp nhau bên dưới .page-links:
        if (!description) {
            const $pNext = $('.entry-content .page-links').next('p');
            description = $pNext.text().trim();
        }

        // Fallback: Nếu không tìm thấy <p> liền kề .page-links, lấy thẻ <p> đầu tiên trong .entry-content
        if (!description) {
            description = $('.entry-content > p').first().text().trim();
        }

        // 5. Ảnh bìa
        const [realMangaId, encodedCover] = compositeId.split('|');
        let homeCoverUrl = encodedCover ? decodeURIComponent(encodedCover) : '';

        if (!homeCoverUrl) {
            const $firstImg = $('.entry-content .ci img, .entry-content img').first();
            homeCoverUrl = $firstImg.attr('src') || $firstImg.attr('data-src') || '';

            if (homeCoverUrl.startsWith('//')) {
                homeCoverUrl = `https:${homeCoverUrl}`;
            }
        }

        return App.createSourceManga({
            id: compositeId,
            mangaInfo: App.createMangaInfo({
                titles: [decodeHTML(title)],
                image: homeCoverUrl,
                status: 'Completed',
                author: author,
                artist: author,
                desc: decodeHTML(description),
                tags: [
                    App.createTagSection({
                        id: '0',
                        label: 'Genres',
                        tags: arrayTags,
                    }),
                ],
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
    parseChapterList($: CheerioAPI, realMangaId?: string): Chapter[] {
        // Nếu realMangaId bị undefined hoặc rỗng thì trả về mảng rỗng ngay
        if (!realMangaId) return [];

        const chapters: Chapter[] = [];
        const seenChapNums = new Set<number>();

        // Chuẩn hóa lấy slug gốc của Manga (loại bỏ domain và composite ID nếu có |)
        const baseSlug = (realMangaId.split('|')[0] ?? '').replace(/^\/|\/$/g, '');

        const $pageLinks = $('.page-links');

        if ($pageLinks.length > 0) {
            // Duyệt qua tất cả các item phân trang (bao gồm cả span.current lẫn a.post-page-numbers)
            $pageLinks.find('span.post-page-numbers, a.post-page-numbers').each((_, element) => {
                const $el = $(element);
                const pageNumText = $el.text().trim();
                const pageNum = parseInt(pageNumText, 10);

                if (isNaN(pageNum) || seenChapNums.has(pageNum)) return;

                seenChapNums.add(pageNum);

                let chapId = '';

                // Nếu là thẻ <a>, bóc tách pathname để chỉ lấy slug tương đối
                if ($el.is('a')) {
                    const href = $el.attr('href') || '';
                    if (href) {
                        try {
                            const urlObj = new URL(href, 'https://maulon.vip');
                            chapId = urlObj.pathname.replace(/^\/|\/$/g, '');
                        } catch {
                            chapId = href.replace(/^https?:\/\/[^\/]+\//, '').replace(/\/$/, '');
                        }
                    }
                }

                // Fallback nếu chapId trống (ví dụ thẻ span trang hiện tại)
                if (!chapId) {
                    chapId = pageNum === 1 ? baseSlug : `${baseSlug}/${pageNum}`;
                }

                chapters.push(
                    App.createChapter({
                        id: chapId,
                        chapNum: pageNum,
                        name: `Phần ${pageNum}`,
                        time: new Date(),
                    })
                );
            });
        }

        // Fallback: Nếu không tìm thấy phân trang, tạo Chapter 1 mặc định
        if (chapters.length === 0) {
            chapters.push(
                App.createChapter({
                    id: baseSlug,
                    chapNum: 1,
                    name: 'Phần 1',
                    time: new Date(),
                })
            );
        }

        // Sắp xếp chapter theo thứ tự tăng dần
        return chapters.sort((a, b) => a.chapNum - b.chapNum);
    }

    // Parse danh sách thể loại (Tags)
    parseTags($: CheerioAPI): TagSection[] {
        const sections: TagSection[] = [];

        $('.rank-math-html-sitemap__section').each((index, sectionEl) => {
            const $section = $(sectionEl);
            const sectionTitle = $section.find('h2.rank-math-html-sitemap__title').text().trim();
            const tags: Tag[] = [];

            $section.find('ul.rank-math-html-sitemap__list li.rank-math-html-sitemap__item').each((_, liEl) => {
                const $a = $(liEl).find('a.rank-math-html-sitemap__link').first();
                const href = $a.attr('href') || '';
                const label = $a.text().trim();

                if (!href || !label) return;

                // Bóc tách giữ nguyên đường dẫn slug phía sau domain
                let id = '';
                try {
                    const urlObj = new URL(href, 'https://maulon.vip');
                    id = urlObj.pathname.replace(/^\/|\/$/g, '');
                } catch {
                    id = href.replace(/^https?:\/\/[^\/]+\//, '').replace(/\/$/, '');
                }

                // Lọc bỏ tag "Album Đã Xóa"
                const isDeletedAlbum = label.toLowerCase() === 'album đã xóa' || id.includes('album-da-xoa');

                if (id && label && !isDeletedAlbum) {
                    tags.push(
                        App.createTag({
                            id: id,
                            label: label,
                        })
                    );
                }
            });

            if (tags.length > 0) {
                sections.push(
                    App.createTagSection({
                        id: `cat_${index + 1}`,
                        label: sectionTitle || `Section ${index + 1}`,
                        tags: tags,
                    })
                );
            }
        });

        return sections;
    }
}
