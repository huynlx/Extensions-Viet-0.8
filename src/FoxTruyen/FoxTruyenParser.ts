import { Chapter, SourceManga, Tag, TagSection, PartialSourceManga } from '@paperback/types';
import { CheerioAPI } from 'cheerio';
import { parseDate } from '../../common';

export class Parser {
    parseFeaturedSection($: CheerioAPI): PartialSourceManga[] {
        const featuredItems: PartialSourceManga[] = [];

        $('.list_item_home.trending-scroll .item_home').each((_, element) => {
            const $item = $(element);

            // 1. Title & Link
            const $titleLink = $item.find('a.book_name').first();
            const title = $titleLink.text().trim();

            // 2. Extract Manga ID từ href (VD: ".../dai-quan-gia-la-ma-hoang-37369.html" -> "dai-quan-gia-la-ma-hoang-37369.html")
            const href = $titleLink.attr('href') || $item.find('.image-cover a').attr('href') || '';
            const id = href.split('/').pop() || '';

            // 3. Image URL với fallback
            const $img = $item.find('.image-cover img').first();
            let image = $img.attr('src') || $img.attr('data-src') || $img.attr('data-original') || 'https://i.imgur.com/GYUxEX8.png';

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Subtitle (Tên chương mới nhất, VD: "Chương 891")
            const subtitle = $item.find('a.fs14').first().text().trim();

            if (id && title) {
                featuredItems.push(
                    App.createPartialSourceManga({
                        mangaId: id,
                        image: image,
                        title: title,
                        subtitle: subtitle,
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

    parseExtraSection($: CheerioAPI, label: string): PartialSourceManga[] {
        const featuredItems: PartialSourceManga[] = [];

        // Lấy thẻ a chứa label truyền vào, sau đó tìm .list_item_home ở cùng khối cha .col-md-6
        const $targetList = $(`a.title_cate:contains("${label}")`).closest('.col-md-6').find('.list_item_home');

        $targetList.find('.item_home').each((_, element) => {
            const $item = $(element);

            // 1. Tiêu đề & Link truyện
            const $titleLink = $item.find('a.fs14').first();
            const title = $titleLink.attr('title')?.trim() || $titleLink.text().trim();

            // 2. Extract Manga ID từ href (VD: ".../watashi-no-kokoro-wa-oji-san-de-aru-59243.html" -> "watashi-no-kokoro-wa-oji-san-de-aru-59243.html")
            const href = $titleLink.attr('href') || $item.find('a.thumbblock').attr('href') || '';
            const id = href.split('/').pop() || '';

            // 3. Image URL (Ưu tiên data-src để hỗ trợ lazy loading nếu có)
            const $img = $item.find('.thumbblock img').first();
            let image = $img.attr('data-src') || $img.attr('src') || 'https://i.imgur.com/GYUxEX8.png';

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // Convert thumbnail từ 70x85 sang 230x300 chất lượng cao hơn
            image = image.replace('/70x85/', '/230x300/');

            // 4. Subtitle (Chương mới nhất, VD: "Chapter 18")
            const subtitle = $item.find('div > a.fs13').first().text().trim();

            if (id && title) {
                featuredItems.push(
                    App.createPartialSourceManga({
                        mangaId: id,
                        image: image,
                        title: title,
                        subtitle: subtitle,
                    })
                );
            }
        });

        return featuredItems;
    }

    parseSearchResults($: CheerioAPI): PartialSourceManga[] {
        const results: PartialSourceManga[] = [];

        $('.list_item_home .item_home').each((_, element) => {
            const $item = $(element);

            // 1. Tiêu đề & Link
            const $titleLink = $item.find('a.book_name').first();
            const title = $titleLink.text().trim();

            // 2. Extract Manga ID từ href (VD: ".../phuc-tung-60180.html" -> "phuc-tung-60180.html")
            const href = $titleLink.attr('href') || $item.find('.image-cover a').attr('href') || '';
            const id = href.split('/').pop() || '';

            // 3. Image URL (Ưu tiên data-src để tránh lấy nhầm loading.jpg)
            const $img = $item.find('.image-cover img').first();
            let image = $img.attr('data-src') || $img.attr('data-original') || $img.attr('src') || 'https://i.imgur.com/GYUxEX8.png';

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Subtitle (Chương mới nhất, VD: "Chương 14")
            const subtitle = $item.find('a.fs14').first().text().trim();

            if (id && title) {
                results.push(
                    App.createPartialSourceManga({
                        mangaId: id,
                        image: image,
                        title: title,
                        subtitle: subtitle,
                    })
                );
            }
        });

        return results;
    }

    parseMangaDetails($: CheerioAPI, mangaId: string): SourceManga {
        const tags: Tag[] = [];

        // 1. Thể loại
        $('.fx-genres a.fx-genre').each((_, obj) => {
            const label = $(obj).text().trim();
            const href = $(obj).attr('href') || '';
            const id = href.split('/').pop() || label;
            tags.push(App.createTag({ label, id }));
        });

        // 2. Tiêu đề, Tác giả, Ảnh bìa, Trạng thái
        const titles = [$('h1.fx-info__title').text().trim()];
        const author = $('.fx-meta__row:contains("Tác giả") .fx-meta__val').text().trim() || 'Đang Cập Nhật';
        const artist = author;
        const image = $('.fx-cover__img').attr('src') || $('.fx-cover__img').attr('data-src') || '';
        const statusText = $('.fx-status').text().trim();

        // 3. Bóc tách thông tin thống kê từ .fx-stats
        const views = $('.fx-stat:has(.bi-eye-fill)').text().trim();
        const follows = $('.fx-stat:has(.bi-bookmark-fill)').text().trim();
        const comments = $('.fx-stat:has(.bi-chat-dots-fill)').text().trim();
        const lastUpdate = $('.fx-stat:has(.bi-clock)').text().trim();

        const statsLines = [
            views ? `👁️ Lượt xem: ${views}` : '',
            follows ? `🔖 Theo dõi: ${follows}` : '',
            comments ? `💬 Bình luận: ${comments}` : '',
            lastUpdate ? `🕒 Cập nhật: ${lastUpdate}` : '',
        ]
            .filter(Boolean)
            .join('\n');

        // 4. Lấy nội dung mô tả truyện từ #fx-syn-text / .fx-synopsis__text
        const $synopsis = $('#fx-syn-text, .fx-synopsis__text').clone();
        // Xóa thẻ <a> chứa tên truyện lặp lại ở đầu khối
        $synopsis.find('a').remove();

        // Thay thế thẻ <br> bằng ký tự xuống dòng
        $synopsis.find('br').replaceWith('\n');

        let rawDesc = $synopsis.find('p').text().trim();
        if (!rawDesc) {
            rawDesc = $synopsis
                .text()
                .replace(/^[\s:]+/, '')
                .trim();
        }

        // Ghép khối thông tin thống kê vào trước nội dung mô tả
        const fullDesc = statsLines ? `${rawDesc}\n\n${statsLines}`.trim() : rawDesc;

        return App.createSourceManga({
            id: mangaId,
            mangaInfo: App.createMangaInfo({
                titles,
                author,
                artist,
                image,
                desc: fullDesc,
                status: statusText,
                tags: [App.createTagSection({ id: '0', label: 'genre', tags })],
            }),
        });
    }

    parseChapterList($: CheerioAPI): Chapter[] {
        const chapters: Chapter[] = [];

        $('#fx-chap-list li.fx-chap-item').each((_, obj) => {
            const $item = $(obj);
            const $link = $item.find('a.fx-chap-item__name');
            const href = $link.attr('href') || '';

            // 1. Bóc tách Chapter ID từ href (VD: "dai-quan-gia-la-ma-hoang-37369-chap-891.html")
            const id = href.split('/').pop() || '';

            // 2. Tên chương (VD: "Chương 892")
            const name = $link.text().trim();

            // 3. Bóc tách số chương từ tên (VD: "Chương 892" -> 892)
            const chapNumMatch = name.match(/[\d.]+/);
            const chapNum = chapNumMatch ? parseFloat(chapNumMatch[0]) : 0;

            // 4. Ngày đăng (VD: "08/08/2026")
            const dateStr = $item.find('.fx-chap-item__date').text().trim();

            if (id && name) {
                chapters.push(
                    App.createChapter({
                        id,
                        chapNum,
                        name,
                        langCode: '🇻🇳',
                        group: dateStr,
                        time: parseDate(dateStr),
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

        $('.content_detail.content_detail_manga img').each((_, obj) => {
            const $img = $(obj);
            const src = $img.attr('src') || $img.attr('data-src') || $img.attr('data-original') || $img.attr('data-cdn') || '';

            if (src) {
                let cleanUrl = src.trim();
                if (cleanUrl.startsWith('//')) {
                    cleanUrl = `https:${cleanUrl}`;
                }
                pages.push(cleanUrl);
            }
        });

        return pages;
    }

    parseTags($: CheerioAPI): TagSection[] {
        // 1. Parse Thể loại truyện từ .adv-genre-item
        const arrayTags: Tag[] = [];

        $('.adv-genre-item').each((_, el) => {
            const $el = $(el);
            const id = $el.attr('data-id')?.trim();
            const label = $el.find('.adv-genre-name').text().trim();

            if (id && label) {
                arrayTags.push(App.createTag({ id, label }));
            }
        });

        // 2. Thêm danh mục Bảng Xếp Hạng
        const arrayRankings: Tag[] = [
            App.createTag({ id: 'ranking.top-ngay', label: 'Top Ngày' }),
            App.createTag({ id: 'ranking.top-tuan', label: 'Top Tuần' }),
            App.createTag({ id: 'ranking.top-thang', label: 'Top Tháng' }),
            App.createTag({ id: 'ranking.top-binh-chon', label: 'Top Bình Chọn' }),
        ];

        // 3. Helper parse các thẻ select
        const parseSelectOptions = (selector: string, prefix: string): Tag[] => {
            const tags: Tag[] = [];
            $(selector)
                .find('option')
                .each((_, el) => {
                    const label = $(el).text().trim();
                    const value = $(el).attr('value')?.trim();

                    if (value === undefined || value === '' || !label) {
                        return;
                    }

                    tags.push(
                        App.createTag({
                            id: `${prefix}.${value}`,
                            label: label,
                        })
                    );
                });
            return tags;
        };

        return [
            App.createTagSection({
                id: '0',
                label: 'Thể Loại Truyện',
                tags: arrayTags,
            }),
            App.createTagSection({
                id: '1',
                label: 'Bảng Xếp Hạng (Chỉ chọn 1)',
                tags: arrayRankings,
            }),
            App.createTagSection({
                id: '2',
                label: 'Quốc Gia (Chỉ chọn 1)',
                tags: parseSelectOptions('select#country', 'country'),
            }),
            App.createTagSection({
                id: '3',
                label: 'Trạng Thái (Chỉ chọn 1)',
                tags: parseSelectOptions('select#status', 'status'),
            }),
            App.createTagSection({
                id: '4',
                label: 'Số Lượng Chương (Chỉ chọn 1)',
                tags: parseSelectOptions('select#minchapter', 'minchapter'),
            }),
            App.createTagSection({
                id: '5',
                label: 'Sắp Xếp (Chỉ chọn 1)',
                tags: parseSelectOptions('select#sort', 'sort'),
            }),
        ];
    }
}

export const isLastPage = ($: CheerioAPI): boolean => {
    // 1. Lấy số trang hiện tại từ thẻ a.page-item.active
    const currentText = $('.pagination a.page-item.active').text().trim();
    const currentPage = parseInt(currentText, 10);

    // 2. Lấy href của nút trang cuối cùng (thường là nút '»' ở thẻ a cuối cùng)
    const lastLinkHref = $('.pagination a.page-item').last().attr('href');

    if (!isNaN(currentPage) && lastLinkHref) {
        // Regex bóc tách số trang từ dạng "trang-323.html"
        const match = lastLinkHref.match(/trang-(\d+)/);
        if (match && match[1]) {
            const totalPage = parseInt(match[1], 10);
            return currentPage >= totalPage;
        }
    }

    // Nếu không có phân trang hoặc lỗi parse => Coi như là trang cuối
    return true;
};
