import { Chapter, PartialSourceManga, SourceManga, Tag, TagSection } from '@paperback/types';
import { CheerioAPI } from 'cheerio';
import { decodeHTML } from 'entities';
import genreTagsJson from './includes/genreTags.json';

const BASE_CHARSET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/';
const PACKED_ARGS_REGEX = /\}\("(.+)",\s*(\d+),\s*"([^"]+)",\s*(\d+),\s*(\d+),\s*(\d+)\)/;
const IMAGE_URL_REGEX = /"(https?:\\?\/\\?\/[^"]+\.\w{3,4})"/g;

export class Parser {
    // ============================ JS Unpacker ============================

    /**
     * Replicating ViHentaiPacker.kt logic in Pure TypeScript
     */
    extractImageUrls(scriptData: String): string[] {
        try {
            const decoded = this.unpack(scriptData);
            const urls: string[] = [];
            let match: RegExpExecArray | null;

            while ((match = IMAGE_URL_REGEX.exec(decoded)) !== null) {
                if (match[1]) {
                    urls.push(match[1].replace(/\\\//g, '/'));
                }
            }
            return urls;
        } catch (e) {
            console.error('Failed to unpack ViHentai script:', e);
            return [];
        }
    }

    private unpack(script: String): string {
        const args = script.match(PACKED_ARGS_REGEX);
        if (!args) throw new Error('Could not parse packed script arguments');

        const h = args[1]!;
        const n = args[3]!;
        const t = parseInt(args[4]!, 10);
        const e = parseInt(args[5]!, 10);
        const delimiter = n[e]!;

        let result = '';
        let i = 0;

        while (i < h.length) {
            let s = '';
            while (i < h.length && h[i] !== delimiter) {
                s += h[i];
                i++;
            }
            i++;

            let segment = s;
            for (let j = 0; j < n.length; j++) {
                segment = segment.split(n[j]!).join(j.toString());
            }

            const charCode = this.baseConvert(segment, e) - t;
            result += String.fromCharCode(charCode);
        }

        return result;
    }

    private baseConvert(d: string, fromBase: number): number {
        const chars = BASE_CHARSET.substring(0, fromBase);
        return d
            .split('')
            .reverse()
            .reduce((acc, c, idx) => {
                const pos = chars.indexOf(c);
                return pos !== -1 ? acc + pos * Math.pow(fromBase, idx) : acc;
            }, 0);
    }

    parseFeaturedSection($: CheerioAPI): PartialSourceManga[] {
        const featuredItems: PartialSourceManga[] = [];
        const processedIds = new Set<string>();

        // Lọc loại bỏ thẻ glide__slide--clone để không bị lặp lại dữ liệu truyện
        $('.glide__slides li.glide__slide:not(.glide__slide--clone)').each((_: any, manga: any) => {
            const $manga = $(manga);

            // 1. Tên truyện & Href -> Manga ID
            const $titleEl = $manga.find('div.p-2 a');
            const title = decodeHTML($titleEl.text().trim());
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
            const subtitle = decodeHTML($manga.find('.latest-chapter a').text().trim());

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

    parseTop($: CheerioAPI): PartialSourceManga[] {
        const tiles: PartialSourceManga[] = [];

        // Lặp qua từng item truyện trong tab Rank
        $('div.flex.gap-2.w-full')
            .slice(0, 5)
            .each((_, el) => {
                const link = $(el).find('a[href*="/truyen/"]').first();
                const href = link.attr('href');
                const title = decodeHTML(link.text().trim());

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
                    viewsText = decodeHTML($(el).find('span.text-sm').text().trim());
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
            const title = decodeHTML($titleEl.text().trim());
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
            const subtitle = decodeHTML($manga.find('span.break-all').text().trim());

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
            const title = decodeHTML($titleLink.text().trim());
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
            const subtitle = decodeHTML($manga.find('.latest-chapter a').text().trim());

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
            const label = decodeHTML($(obj).text().trim());
            const id = $(obj).attr('href')?.split('/the-loai/')[1] ?? label;
            if (label) {
                tags.push(App.createTag({ label, id }));
            }
        });

        // 2. Tên truyện chính
        const primaryTitle = decodeHTML($container.find('span.text-lg').text().trim());
        const titles = [primaryTitle].filter(Boolean);

        // 3. Tác giả & Nhóm dịch
        const author =
            $container
                .find('a[href*="/tac-gia/"]')
                .map((_, el) => decodeHTML($(el).text().trim()))
                .get()
                .join(', ') || 'Chưa rõ';

        const artist = $container
            .find('a[href*="/nhom-dich/"]')
            .map((_, el) => decodeHTML($(el).text().trim()))
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
        const desc = decodeHTML(
            $container
                .find('div.mg-plot p')
                .map((_, el) => $(el).text().trim())
                .get()
                .filter((text) => text.length > 0 && text !== 'Tóm tắt')
                .join('\n\n')
        );

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

        // 1. Chỉ chọn div.justify-between thứ 2 trong div.md:col-span-2 (hoặc container chứa danh sách chương)
        const $container = $('div[class*="md:col-span-2"] > div.justify-between').eq(1);

        // Nếu không tìm thấy bằng .eq(1), fallback lấy container div.justify-between trực tiếp
        const $targetContainer = $container.length
            ? $container
            : $('div.justify-between')
                  .filter((_, el) => $(el).find('ul').length > 0)
                  .first();

        const $elements = $targetContainer.find('ul > li');
        const totalChapters = $elements.length;

        $elements.each((idx: number, obj: any) => {
            const $li = $(obj);

            // Lấy thẻ <a> chứa liên kết tới chapter
            const $link = $li.find('a[href*="/truyen/"]').first();
            const href = $link.attr('href') || '';
            const id = href.split('/').filter(Boolean).pop() || '';

            // Lấy tên Chapter từ span.truncate hoặc fallback về text trong thẻ a
            const name = decodeHTML($li.find('div.grow span.truncate').text().trim() || $li.find('a[href*="/truyen/"]').text().trim());

            // Parse chapNum từ tên (vd: "Chap 3" -> 3, "Chap 75.5" -> 75.5)
            let chapNum = totalChapters - idx;
            const chapMatch = name.match(/Chap(?:ter)?\s*([\d.]+)/i);
            if (chapMatch && chapMatch[1]) {
                const parsedNum = parseFloat(chapMatch[1]);
                if (!isNaN(parsedNum)) {
                    chapNum = parsedNum;
                }
            }

            // Thời gian đăng
            const $timeElement = $li.find('span.timeago');
            const rawDate = $timeElement.attr('datetime') || $timeElement.text().trim();
            const time = rawDate ? new Date(rawDate) : undefined;

            // Lượt xem & Uploader/Nhóm dịch
            const views = $li.find('span.abbreviation-number').text().trim();
            const uploader = $li.find('a[href*="/thanh-vien/"]').text().trim();

            // Ghép uploader + lượt xem vào field `group` (ví dụ: "Hoàng Anh • 5.0k lượt xem")
            let group: string | undefined;
            if (uploader && views) {
                group = `${uploader} • ${views} lượt xem`;
            } else if (uploader) {
                group = uploader;
            } else if (views) {
                group = `${views} lượt xem`;
            }

            if (id && name) {
                chapters.push(
                    App.createChapter({
                        id,
                        chapNum,
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
        let packedScript = '';
        $('script').each((_, el) => {
            const scriptText = $(el).html() || '';
            if (scriptText.includes('eval(function(h,u,n,t,e,r)')) {
                packedScript = scriptText;
            }
        });

        if (!packedScript) return [];

        return this.extractImageUrls(packedScript);
    }

    parseTags(): TagSection[] {
        // 1. Thể loại truyện
        const genreTags = genreTagsJson.map(({ label, id }) => App.createTag({ label: decodeHTML(label), id }));

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
