import { Chapter, SourceManga, Tag, TagSection, PartialSourceManga } from '@paperback/types';
import { CheerioAPI } from 'cheerio';
import { decodeHTML } from 'entities';
import { parseDate } from '../../common';

export class Parser {
    parseFeaturedSection($: CheerioAPI): PartialSourceManga[] {
        const featuredItems: PartialSourceManga[] = [];

        $('.list_item_home.trending-scroll .item_home').each((_, element) => {
            const $item = $(element);

            // 1. Title & Link
            const $titleLink = $item.find('a.book_name').first();
            const title = decodeHTML($titleLink.text().trim());

            // 2. Extract Manga ID từ href
            const href = $titleLink.attr('href') || $item.find('.image-cover a').attr('href') || '';
            const id = href.split('/').pop() || '';

            // 3. Image URL với fallback
            const $img = $item.find('.image-cover img').first();
            let image = $img.attr('src') || $img.attr('data-src') || $img.attr('data-original') || 'https://i.imgur.com/GYUxEX8.png';

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Subtitle (Tên chương mới nhất)
            const subtitle = decodeHTML($item.find('a.fs14').first().text().trim());

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
            const title = decodeHTML($('.book_name > h3 > a', manga).text().trim());

            // 1. Lấy Href & Extract Manga ID
            const id = $('.book_name > h3 > a', manga).attr('href')?.split('/').pop();

            // 2. Lấy Image với Fallback linh hoạt
            const imgEl = $('.book_avatar > a > img', manga);
            let image = imgEl.attr('src') || imgEl.attr('data-fb') || imgEl.attr('data-ni') || 'https://i.imgur.com/GYUxEX8.png';

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            const subtitle = decodeHTML($('.last_chapter > a', manga).text().trim());

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

        const $targetList = $(`a.title_cate:contains("${label}")`).closest('.col-md-6').find('.list_item_home');

        $targetList.find('.item_home').each((_, element) => {
            const $item = $(element);

            // 1. Tiêu đề & Link truyện
            const $titleLink = $item.find('a.fs14').first();
            const title = decodeHTML($titleLink.attr('title')?.trim() || $titleLink.text().trim());

            // 2. Extract Manga ID từ href
            const href = $titleLink.attr('href') || $item.find('a.thumbblock').attr('href') || '';
            const id = href.split('/').pop() || '';

            // 3. Image URL
            const $img = $item.find('.thumbblock img').first();
            let image = $img.attr('data-src') || $img.attr('src') || 'https://i.imgur.com/GYUxEX8.png';

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            image = image.replace('/70x85/', '/230x300/');

            // 4. Subtitle
            const subtitle = decodeHTML($item.find('div > a.fs13').first().text().trim());

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
            const title = decodeHTML($titleLink.text().trim());

            // 2. Extract Manga ID từ href
            const href = $titleLink.attr('href') || $item.find('.image-cover a').attr('href') || '';
            const id = href.split('/').pop() || '';

            // 3. Image URL
            const $img = $item.find('.image-cover img').first();
            let image = $img.attr('data-src') || $img.attr('data-original') || $img.attr('src') || 'https://i.imgur.com/GYUxEX8.png';

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Subtitle
            const subtitle = decodeHTML($item.find('a.fs14').first().text().trim());

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
            const label = decodeHTML($(obj).text().trim());
            const href = $(obj).attr('href') || '';
            const id = href.match(/-(\d+)\.html$/)?.[1] || label;
            tags.push(App.createTag({ label, id }));
        });

        // 2. Tiêu đề, Tác giả, Ảnh bìa, Trạng thái
        const titles = [decodeHTML($('h1.fx-info__title').text().trim())];
        const author = decodeHTML($('.fx-meta__row:contains("Tác giả") .fx-meta__val').text().trim() || 'Đang Cập Nhật');
        const artist = author;
        const image = $('.fx-cover__img').attr('src') || $('.fx-cover__img').attr('data-src') || '';
        const statusText = decodeHTML($('.fx-status').text().trim());

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

        // 4. Lấy nội dung mô tả truyện
        const $synopsis = $('#fx-syn-text, .fx-synopsis__text').clone();
        $synopsis.find('a').remove();
        $synopsis.find('br').replaceWith('\n');

        let rawDesc = $synopsis.find('p').text().trim();
        if (!rawDesc) {
            rawDesc = $synopsis
                .text()
                .replace(/^[\s:]+/, '')
                .trim();
        }

        const fullDesc = decodeHTML(statsLines ? `${rawDesc}\n\n${statsLines}`.trim() : rawDesc);

        return App.createSourceManga({
            id: mangaId,
            mangaInfo: App.createMangaInfo({
                titles,
                author,
                artist,
                image,
                desc: fullDesc,
                status: statusText,
                tags: [App.createTagSection({ id: '0', label: decodeHTML('genre'), tags })],
            }),
        });
    }

    parseChapterList($: CheerioAPI): Chapter[] {
        const chapters: Chapter[] = [];

        $('#fx-chap-list li.fx-chap-item').each((_, obj) => {
            const $item = $(obj);
            const $link = $item.find('a.fx-chap-item__name');
            const href = $link.attr('href') || '';

            // 1. Bóc tách Chapter ID từ href
            const id = href.split('/').pop() || '';

            // 2. Tên chương
            const name = decodeHTML($link.text().trim());

            // 3. Bóc tách số chương từ tên
            const chapNumMatch = name.match(/[\d.]+/);
            const chapNum = chapNumMatch ? parseFloat(chapNumMatch[0]) : 0;

            // 4. Ngày đăng
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
            const label = decodeHTML($el.find('.adv-genre-name').text().trim());

            if (id && label) {
                arrayTags.push(App.createTag({ id, label }));
            }
        });

        // 2. Thêm danh mục Bảng Xếp Hạng
        const arrayRankings: Tag[] = [
            App.createTag({ id: 'ranking.top-ngay', label: decodeHTML('Top Ngày') }),
            App.createTag({ id: 'ranking.top-tuan', label: decodeHTML('Top Tuần') }),
            App.createTag({ id: 'ranking.top-thang', label: decodeHTML('Top Tháng') }),
            App.createTag({ id: 'ranking.top-binh-chon', label: decodeHTML('Top Bình Chọn') }),
        ];

        // 3. Helper parse các thẻ select
        const parseSelectOptions = (selector: string, prefix: string): Tag[] => {
            const tags: Tag[] = [];
            $(selector)
                .find('option')
                .each((_, el) => {
                    const label = decodeHTML($(el).text().trim());
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
                label: decodeHTML('Thể Loại Truyện'),
                tags: arrayTags,
            }),
            App.createTagSection({
                id: '1',
                label: decodeHTML('Bảng Xếp Hạng (Chỉ chọn 1)'),
                tags: arrayRankings,
            }),
            App.createTagSection({
                id: '2',
                label: decodeHTML('Quốc Gia (Chỉ chọn 1)'),
                tags: parseSelectOptions('select#country', 'country'),
            }),
            App.createTagSection({
                id: '3',
                label: decodeHTML('Trạng Thái (Chỉ chọn 1)'),
                tags: parseSelectOptions('select#status', 'status'),
            }),
            App.createTagSection({
                id: '4',
                label: decodeHTML('Số Lượng Chương (Chỉ chọn 1)'),
                tags: parseSelectOptions('select#minchapter', 'minchapter'),
            }),
            App.createTagSection({
                id: '5',
                label: decodeHTML('Sắp Xếp (Chỉ chọn 1)'),
                tags: parseSelectOptions('select#sort', 'sort'),
            }),
        ];
    }
}

export const isLastPage = ($: CheerioAPI): boolean => {
    const currentText = $('.pagination a.page-item.active').text().trim();
    const currentPage = parseInt(currentText, 10);

    const lastLinkHref = $('.pagination a.page-item').last().attr('href');

    if (!isNaN(currentPage) && lastLinkHref) {
        const match = lastLinkHref.match(/trang-(\d+)/);
        if (match && match[1]) {
            const totalPage = parseInt(match[1], 10);
            return currentPage >= totalPage;
        }
    }

    return true;
};
