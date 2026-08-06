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

        $('#div_suggest .list_grid li').each((_: any, manga: any) => {
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

        $('.list_grid li').each((_: any, manga: any) => {
            const title = $('.book_name > h3 > a', manga).text().trim();
            const id = $('.book_name > h3 > a', manga).attr('href')?.split('/').pop();
            let image = $('.book_avatar > a > img', manga).attr('src') ?? '';
            image = !image ? 'https://i.imgur.com/GYUxEX8.png' : image;
            const subtitle = $('.last_chapter > a', manga).text().trim();

            tiles.push(
                App.createPartialSourceManga({
                    mangaId: String(id),
                    image: String(image),
                    title: title,
                    subtitle: subtitle,
                })
            );
        });

        return tiles;
    }

    parseMangaDetails($: CheerioAPI, mangaId: string): SourceManga {
        const tags: Tag[] = [];

        $('a', '.list01').each((_: any, obj: any) => {
            const label = $(obj).text().trim();
            const id = $(obj).attr('href')?.split('/')[4] ?? label;
            tags.push(App.createTag({ label, id }));
        });

        const titles = [$('.book_other h1').text().trim()];
        const author = $('ul.list-info > li.author > p.col-xs-9').text().trim();
        const artist = $('ul.list-info > li.author > p.col-xs-9').text().trim();
        const image = $('.book_avatar > img').attr('src') ?? '';

        // 🎯 CẢI TIẾN: Lấy từng thẻ <p>, trim khoảng trắng và nối bằng \n\n (hoặc \n)
        const desc = $('div.detail-content > p')
            .map((_, el) => $(el).text().trim())
            .get()
            .filter((text) => text.length > 0)
            .join('\n\n');

        const status = $('ul.list-info > li.status > p.col-xs-9').text().trim();

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

        $('.works-chapter-list > .works-chapter-item').each((_: any, obj: any) => {
            const id = String($('.col-md-10.col-sm-10.col-xs-8 > a', obj).attr('href')?.split('/').pop());
            const time = $('.col-md-2.col-sm-2.col-xs-4', obj).text().trim();
            const name = $('.col-md-10.col-sm-10.col-xs-8 > a', obj).text();
            const chapNum = name.split(' ')[1];
            const timeFinal = this.convertTime(time);

            chapters.push(
                App.createChapter({
                    id,
                    chapNum: parseFloat(String(chapNum)),
                    name,
                    langCode: '🇻🇳',
                    // time: timeFinal,
                    group: time,
                })
            );
        });

        if (chapters.length == 0) {
            throw new Error('No chapters found');
        }

        return chapters;
    }

    parseChapterDetails($: CheerioAPI): string[] {
        const pages: string[] = [];

        $('.chapter_content div .page-chapter img').each((_: any, obj: any) => {
            const src = obj.attribs['src'];
            const dataOriginal = obj.attribs['data-original'];
            const dataCdn = obj.attribs['data-cdn'];

            const urls = [src, dataOriginal, dataCdn];

            // Find the first URL that doesn't include the excluded domain
            const validUrl = urls.find((url) => url);

            if (validUrl) {
                pages.push(validUrl);
            }
        });

        return pages;
    }

    parseTags($: CheerioAPI): TagSection[] {
        // 1. Parse Thể loại truyện
        const arrayTags: Tag[] = [];

        $('.genre-item').each((_, el) => {
            const $el = $(el);

            // Lấy data-id từ thẻ span con
            const id = $el.find('span.icon-checkbox').attr('data-id')?.trim();

            // Clone node và remove span để chỉ lấy text thể loại (Action, Adventure,...)
            const $clone = $el.clone();
            $clone.find('span').remove();
            const label = $clone.text().trim();

            if (id && label) {
                arrayTags.push(App.createTag({ id, label }));
            }
        });

        // 2. Helper parse các select options (Country, Status, MinChapter, Sort)
        const parseSelectOptions = (selector: string, prefix: string): Tag[] => {
            const tags: Tag[] = [];
            $(selector)
                .find('option')
                .each((_, el) => {
                    const label = $(el).text().trim();
                    const value = $(el).attr('value')?.trim();

                    // Loại bỏ các option mặc định "Tất cả" (value = "0" hoặc "-1")
                    if (value === undefined || value === '' || value === '-1' || (prefix === 'country' && value === '0') || !label) {
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
                label: 'Quốc Gia (Chỉ chọn 1)',
                tags: parseSelectOptions('select#country', 'country'),
            }),
            App.createTagSection({
                id: '2',
                label: 'Tình Trạng (Chỉ chọn 1)',
                tags: parseSelectOptions('select#status', 'status'),
            }),
            App.createTagSection({
                id: '3',
                label: 'Số Lượng Chương (Chỉ chọn 1)',
                tags: parseSelectOptions('select#minchapter', 'minchapter'),
            }),
            App.createTagSection({
                id: '4',
                label: 'Sắp Xếp (Chỉ chọn 1)',
                tags: parseSelectOptions('select#sort', 'sort'),
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
