import { Chapter, PartialSourceManga, SourceManga, Tag, TagSection } from '@paperback/types';
import { CheerioAPI } from 'cheerio';
import genreTagsJson from './includes/genreTags.json';

export class Parser {
    parseTop($: CheerioAPI): PartialSourceManga[] {
        const tiles: PartialSourceManga[] = [];

        // Lặp qua từng item truyện trong tab Rank
        $('div.flex.gap-2.w-full')
            .slice(0, 5)
            .each((_, el) => {
                const link = $(el).find('a[href*="/truyen/"]').first();
                const href = link.attr('href');
                const title = link.text().trim();

                // Lấy URL ảnh bìa từ inline style background-image
                const bg = $(el).find('div.cover-xs, div[style*="background-image"]').attr('style');
                const image = bg?.match(/url\(['"]?(.*?)['"]?\)/)?.[1] ?? '';

                // Lấy thứ hạng (#1, #2, #3...)
                const rank = $(el).find('div.font-bold, div.text-xl').first().text().trim();

                // Lấy số lượt xem
                const viewsRaw = $(el).find('.abbreviation-number').attr('abbreviation');
                let viewsText = '';
                if (viewsRaw) {
                    const viewsNum = parseInt(viewsRaw, 10);
                    viewsText = isNaN(viewsNum) ? viewsRaw : `${viewsNum.toLocaleString('vi-VN')} lượt xem`;
                } else {
                    viewsText = $(el).find('span.text-sm').text().trim();
                }

                if (href && title) {
                    const id = href.split('/truyen/')[1]?.replace(/\/$/, '') || href;

                    // Tạo Subtitle hiển thị dạng: "#1 • 154.630 lượt xem"
                    let subTitle = '';
                    if (rank) subTitle += `#${rank}`;
                    if (viewsText) subTitle += subTitle ? ` • ${viewsText}` : viewsText;

                    tiles.push(
                        App.createPartialSourceManga({
                            mangaId: id,
                            title,
                            image,
                            subtitle: subTitle,
                        })
                    );
                }
            });

        return tiles;
    }

    parseFeaturedSection($: CheerioAPI): PartialSourceManga[] {
        const featuredItems: PartialSourceManga[] = [];
        const processedIds = new Set<string>();

        // Lọc loại bỏ thẻ glide__slide--clone để không bị lặp lại dữ liệu truyện
        $('.glide__slides li.glide__slide:not(.glide__slide--clone)').each((_: any, manga: any) => {
            const $manga = $(manga);

            // 1. Tên truyện & Href -> Manga ID
            const $titleEl = $manga.find('div.p-2 a');
            const title = $titleEl.text().trim();
            const href = $titleEl.attr('href') || '';
            const id = href.split('/').filter(Boolean).pop();

            // 2. Lấy Image từ background-image của style attribute
            const style = $manga.find('.cover-frame .cover').attr('style') || '';
            const imageMatch = style.match(/url\(['"]?(.*?)['"]?\)/i);
            let image = imageMatch?.[1] ?? '';

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 3. Subtitle (Chapter mới nhất)
            const subtitle = $manga.find('.latest-chapter a').text().trim();

            if (id && title && !processedIds.has(id)) {
                processedIds.add(id);
                featuredItems.push(
                    App.createPartialSourceManga({
                        mangaId: String(id),
                        image: String(image),
                        title: title,
                        subtitle: subtitle || undefined,
                    })
                );
            }
        });

        return featuredItems;
    }

    parseHotSection($: CheerioAPI): PartialSourceManga[] {
        const recommendItems: PartialSourceManga[] = [];

        // 1. Định vị thẻ h5 chứa chữ "Truyện đề cử" và tìm lên container cha (.flex-col)
        const $section = $('h5')
            .filter((_: any, el: any) => $(el).text().includes('Truyện đề cử'))
            .closest('.flex-col');

        // 2. Chỉ bóc tách các truyện nằm TRONG khối section đó
        $section.find('.grid > .w-full').each((_: any, manga: any) => {
            const $manga = $(manga);

            // Lấy Title & Manga ID
            const $titleEl = $manga.find('a[href*="/truyen/"]');
            const title = $titleEl.text().trim();
            const href = $titleEl.attr('href') ?? '';
            const id = href.split('/').filter(Boolean).pop();

            // Lấy Image từ style background-image
            const style = $manga.find('.cover-sm').attr('style') ?? $manga.find('[style*="background-image"]').attr('style') ?? '';
            const imageMatch = style.match(/url\(['"]?(.*?)['"]?\)/i);
            let image = imageMatch?.[1] ?? '';

            if (!image) {
                const imgEl = $manga.find('img');
                image = imgEl.attr('src') || imgEl.attr('data-src') || 'https://i.imgur.com/GYUxEX8.png';
            }

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // Lấy Subtitle (Mô tả ngắn)
            const subtitle = $manga.find('span.break-all').text().trim();

            if (id && title) {
                recommendItems.push(
                    App.createPartialSourceManga({
                        mangaId: String(id),
                        image: String(image),
                        title: title,
                        subtitle: subtitle || undefined,
                    })
                );
            }
        });

        return recommendItems;
    }

    parseSearchResults($: CheerioAPI): PartialSourceManga[] {
        const tiles: PartialSourceManga[] = [];

        $('.manga-vertical').each((_, manga) => {
            const $manga = $(manga);

            // Lấy title và href từ thẻ a trong .p-2
            const $titleLink = $manga.find('.p-2 a.text-ellipsis');
            const title = $titleLink.text().trim();
            const href = $titleLink.attr('href') || '';

            // Tách mangaId từ slug URL (ví dụ: "/truyen/co-gai-vo-cam-va-ban-trai-da-cam" -> "co-gai-vo-cam-va-ban-trai-da-cam")
            const id = href.split('/truyen/').pop()?.replace(/\/$/, '') || href.split('/').filter(Boolean).pop() || '';

            // Lấy link ảnh từ style background-image
            const style = $manga.find('.cover').attr('style') || '';
            const bgUrlMatch = style.match(/url\(['"]?(.*?)['"]?\)/i);
            let image = bgUrlMatch?.[1] ?? '';

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }
            if (!image) {
                image = 'https://i.imgur.com/GYUxEX8.png';
            }

            // Lấy chương mới nhất làm subtitle
            const subtitle = $manga.find('.latest-chapter a').text().trim();

            if (id && title) {
                tiles.push(
                    App.createPartialSourceManga({
                        mangaId: id,
                        image: image,
                        title: title,
                        subtitle: subtitle,
                    })
                );
            }
        });

        return tiles;
    }

    parseMangaDetails($: CheerioAPI, mangaId: string): SourceManga {
        // Chỉ chọn div đầu tiên trong div.md:col-span-2
        const $container = $('div[class*="md:col-span-2"] > div').first();

        const tags: Tag[] = [];

        // 1. Lấy thể loại (Tags) trong container
        $container.find('a[href*="/the-loai/"]').each((_: any, obj: any) => {
            const label = $(obj).text().trim();
            const id = $(obj).attr('href')?.split('/the-loai/')[1] ?? label;
            if (label) {
                tags.push(App.createTag({ label, id }));
            }
        });

        // 2. Tên truyện chính
        const primaryTitle = $container.find('span.text-lg').text().trim();
        const titles = [primaryTitle].filter(Boolean);

        // 3. Tác giả & Nhóm dịch
        const author =
            $container
                .find('a[href*="/tac-gia/"]')
                .map((_, el) => $(el).text().trim())
                .get()
                .join(', ') || 'Chưa rõ';

        const artist = $container
            .find('a[href*="/nhom-dich/"]')
            .map((_, el) => $(el).text().trim())
            .get()
            .join(', ');

        // 4. Lấy ảnh bìa từ background-image của .cover-frame
        const style = $container.find('.cover-frame').attr('style') || '';
        const imageMatch = style.match(/url\(['"]?(.*?)['"]?\)/i);
        let image = imageMatch?.[1] ?? '';
        if (image.startsWith('//')) {
            image = `https:${image}`;
        }

        // 5. Lấy mô tả (Lọc bỏ thẻ tiêu đề "Tóm tắt" và dòng trống)
        const desc = $container
            .find('div.mg-plot p')
            .map((_, el) => $(el).text().trim())
            .get()
            .filter((text) => text.length > 0 && text !== 'Tóm tắt')
            .join('\n\n');

        // 6. Tình trạng truyện ("Đã hoàn thành" / "Đang tiến hành")
        const status = $container.find('a[href*="filter%5Bstatus%5D"], a[href*="filter[status]"]').text().trim() || 'Đang tiến hành';

        return App.createSourceManga({
            id: mangaId,
            mangaInfo: App.createMangaInfo({
                titles,
                author,
                artist,
                image,
                desc,
                status,
                tags: [App.createTagSection({ id: '0', label: 'genre', tags })],
            }),
        });
    }

    parseChapterList($: CheerioAPI): Chapter[] {
        const chapters: Chapter[] = [];

        // Chỉ chọn div thứ 2 trong div.md:col-span-2 (chứa danh sách chương)
        const $container = $('div[class*="md:col-span-2"] > div').eq(1);
        const $elements = $container.find('ul > a[href*="/truyen/"]');
        const totalChapters = $elements.length;

        $elements.each((idx: number, obj: any) => {
            const $item = $(obj);

            const href = $item.attr('href') || '';
            const id = href.split('/').pop() || '';
            const name = $item.find('div.grow span').text().trim();

            // 1. Thời gian đăng
            const $timeElement = $item.find('span.timeago');
            const rawDate = $timeElement.attr('datetime') || $timeElement.text().trim();
            const time = rawDate ? new Date(rawDate) : undefined;

            // 2. Lấy lượt xem (Ví dụ: "10" lượt xem)
            const views = $item.find('span.abbreviation-number').text().trim();

            // 3. Ghép thông tin lượt xem vào field `group`
            const group = views ? `${views} lượt xem` : undefined;

            if (id && name) {
                chapters.push(
                    App.createChapter({
                        id,
                        chapNum: totalChapters - idx,
                        name,
                        langCode: '🇻🇳',
                        time,
                        group,
                    })
                );
            }
        });

        if (chapters.length === 0) {
            throw new Error('No chapters found');
        }

        return chapters;
    }

    parseChapterDetails($: CheerioAPI): string[] {
        const pages: string[] = [];

        $('div.text-center img').each((_: any, obj: any) => {
            const $img = $(obj);

            // Lấy link ảnh từ src (fallback sang data-original hoặc data-cdn nếu có)
            const src = $img.attr('src') || $img.attr('data-original') || $img.attr('data-cdn') || '';

            if (src) {
                pages.push(src.trim());
            }
        });

        return pages;
    }

    parseTags(): TagSection[] {
        // 1. Thể loại truyện
        const genreTags = genreTagsJson.map(({ label, id }) => App.createTag({ label, id }));

        return [
            App.createTagSection({
                id: 'genres',
                label: 'Thể Loại',
                tags: genreTags,
            }),
        ];
    }
}

export const isLastPage = ($: CheerioAPI): boolean => {
    // 1. Lấy trang hiện tại từ p.active
    const currentText = $('div.page_redirect p.active').text().trim();
    const currentPage = parseInt(currentText, 10);

    // 2. Lấy link của nút trang cuối cùng (thường là nút '»' ở cuối)
    const lastLinkHref = $('div.page_redirect a').last().attr('href');

    if (!isNaN(currentPage) && lastLinkHref) {
        // Regex tìm dạng trang-xxx (có hoặc không có đuôi .html hay query param)
        const match = lastLinkHref.match(/trang-(\d+)/);
        if (match && match[1]) {
            const totalPage = parseInt(match[1], 10);
            return currentPage >= totalPage;
        }
    }

    // Nếu không tìm thấy phân trang (chỉ có 1 trang) hoặc lỗi parse => Coi như là trang cuối
    return true;
};
