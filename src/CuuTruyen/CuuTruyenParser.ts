import { Chapter, SourceManga, Tag, TagSection, PartialSourceManga } from '@paperback/types';
import { CheerioAPI } from 'cheerio';

export class Parser {
    protected convertTime(timeAgo: string): Date {
        let trimmed = Number((/\d*/.exec(timeAgo) ?? [])[0]);
        trimmed = trimmed === 0 && timeAgo.includes('a') ? 1 : trimmed;

        if (timeAgo.includes('giây') || timeAgo.includes('secs')) {
            return new Date(Date.now() - trimmed * 1000);
        } else if (timeAgo.includes('phút')) {
            return new Date(Date.now() - trimmed * 60000);
        } else if (timeAgo.includes('giờ')) {
            return new Date(Date.now() - trimmed * 3600000);
        } else if (timeAgo.includes('ngày')) {
            return new Date(Date.now() - trimmed * 86400000);
        } else if (timeAgo.includes('năm')) {
            return new Date(Date.now() - trimmed * 31556952000);
        } else if (timeAgo.includes(':')) {
            const [H, D] = timeAgo.split(' ');
            const fixD = String(D).split('/');
            const finalD = `${fixD[1]}/${fixD[0]}/${new Date().getFullYear()}`;
            return new Date(`${finalD} ${H}`);
        } else {
            const split = timeAgo.split('/');
            return new Date(`${split[1]}/${split[0]}/${split[2]}`);
        }
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
        const featuredItems: PartialSourceManga[] = [];

        $('#div_qq .list_grid li').each((_: any, manga: any) => {
            const title = $('.book_name > h3 > a', manga).text().trim();

            // 1. Lấy Href & Extract Manga ID
            const id = $('.book_name > h3 > a', manga).attr('href')?.split('/').pop();

            // 2. Lấy Image với Fallback linh hoạt (src -> data-fb -> data-ni -> Placeholder)
            const imgEl = $('.book_avatar > a > img', manga);
            let image = imgEl.attr('src') || imgEl.attr('data-fb') || imgEl.attr('data-ni') || 'https://i.imgur.com/GYUxEX8.png';

            // Đảm bảo URL ảnh hợp lệ (thêm protocol nếu thiếu)
            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            const subtitle = $('.last_chapter > a', manga).text().trim();

            if (id && title) {
                featuredItems.push(
                    App.createPartialSourceManga({
                        mangaId: String(id),
                        image: String(image),
                        title: title,
                        subtitle: subtitle,
                    })
                );
            }
        });

        return featuredItems;
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

    parseTags($: CheerioAPI): TagSection[] {
        // 1. Thể loại truyện
        const genreTags: Tag[] = [];
        $('a[href*="/the-loai/"]').each((_: any, obj: any) => {
            const label = $(obj).text().trim();

            const id = $(obj).attr('href')?.split('/the-loai/')[1] ?? label;

            if (label) {
                genreTags.push(App.createTag({ label, id }));
            }
        });

        // 2. Sắp xếp (Sort)
        const sortTags: Tag[] = [
            App.createTag({ id: '-updated_at', label: 'Mới cập nhật' }),
            App.createTag({ id: '-created_at', label: 'Mới nhất' }),
            App.createTag({ id: 'created_at', label: 'Cũ nhất' }),
            App.createTag({ id: '-views', label: 'Xem nhiều' }),
            App.createTag({ id: 'name', label: 'A-Z' }),
            App.createTag({ id: '-name', label: 'Z-A' }),
        ];

        // 3. Trạng thái (Status)
        const statusTags: Tag[] = [
            App.createTag({ id: '2,1', label: 'Tất cả' }),
            App.createTag({ id: '2', label: 'Đang tiến hành' }),
            App.createTag({ id: '1', label: 'Đã hoàn thành' }),
        ];

        return [
            App.createTagSection({
                id: 'genres',
                label: 'Thể Loại',
                tags: genreTags,
            }),
            App.createTagSection({
                id: 'sort',
                label: 'Sắp xếp',
                tags: sortTags,
            }),
            App.createTagSection({
                id: 'status',
                label: 'Trạng thái',
                tags: statusTags,
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
