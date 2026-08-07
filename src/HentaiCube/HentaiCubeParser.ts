import { Chapter, PartialSourceManga, Tag, TagSection } from '@paperback/types';
import { CheerioAPI } from 'cheerio';
import { decodeHTML } from 'entities';

export class Parser {
    parseFeaturedSection($: CheerioAPI): PartialSourceManga[] {
        const mangaList: PartialSourceManga[] = [];
        const addedMangaIds = new Set<string>(); // Chống trùng lặp do slick-slider tạo clone

        // Chỉ định quét chính xác bên trong phần tử có id="c-post-slider-104"
        $('#c-post-slider-136 .slick-slide:not(.slick-cloned) .related__item, #c-post-slider-136 .related__item').each((_, element) => {
            const $item = $(element);

            // 1. Title & Link
            const $titleLink = $item.find('.post-title h5 a').first();
            const title = $titleLink.text().trim();

            // 2. Manga ID (Tách từ href dạng: https://hentaicube.xyz/read/manga-slug/)
            const href = $titleLink.attr('href') || $item.find('.related__thumb_item a').first().attr('href') || '';
            const mangaId = href.split('/read/').pop()?.replace(/\/$/, '')?.split('?')[0] ?? '';

            // Bỏ qua nếu không có ID hoặc đã bị trùng
            if (!mangaId || addedMangaIds.has(mangaId)) return;

            // 3. Image URL (Lấy từ src / data-src / srcset của thẻ img)
            const $img = $item.find('.related__thumb_item img').first();
            let image = $img.attr('src') || $img.attr('data-src') || $img.attr('srcset')?.split(' ')[0] || '';

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Subtitle
            const subtitle = undefined;

            if (title && !mangaId.includes('javascript')) {
                mangaList.push(
                    App.createPartialSourceManga({
                        mangaId: mangaId,
                        title: decodeHTML(title),
                        image: image,
                        subtitle: subtitle,
                    })
                );
                addedMangaIds.add(mangaId);
            }
        });

        return mangaList;
    }

    parseNewUpdatedSection($: CheerioAPI): PartialSourceManga[] {
        const mangaList: PartialSourceManga[] = [];

        $('.page-listing-item .page-item-detail').each((_, element) => {
            const $item = $(element);

            // 1. Title & Link chính từ thẻ <a> trong .post-title
            const $titleLink = $item.find('.post-title a').first();
            const title = $titleLink.text().replace(/\s+/g, ' ').trim();

            // 2. Manga ID từ href (Lấy slug sau /read/ hoặc fallback theo URL path)
            const href = $titleLink.attr('href') || $item.find('.item-thumb a').attr('href') || '';
            let mangaId = '';

            if (href.includes('/read/')) {
                mangaId = href.split('/read/').pop()?.split('/')[0] ?? '';
            } else {
                // Fallback nếu link cấu trúc khác: lấy segment cuối cùng trước slash kết thúc
                const segments = href.replace(/\/$/, '').split('/');
                mangaId = segments.pop() ?? '';
            }

            // 3. Image URL từ thẻ img trong .item-thumb
            const $img = $item.find('.item-thumb img').first();
            let image = $img.attr('src') || $img.attr('data-src') || $img.attr('srcset')?.split(' ')[0] || '';

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Chapter/Subtitle (Lấy tên chapter mới nhất từ .list-chapter .chapter-item)
            const lastChapter = $item.find('.list-chapter .chapter-item .chapter a').first().text().replace(/\s+/g, ' ').trim() || undefined;

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

    parseHotSection($: CheerioAPI): PartialSourceManga[] {
        const mangaList: PartialSourceManga[] = [];
        const addedMangaIds = new Set<string>(); // Chống trùng lặp do slick-slider tạo clone

        // Chỉ định quét chính xác bên trong phần tử có id="c-post-slider-104"
        $('#c-post-slider-104 .slick-slide:not(.slick-cloned) .related__item, #c-post-slider-104 .related__item').each((_, element) => {
            const $item = $(element);

            // 1. Title & Link
            const $titleLink = $item.find('.post-title h5 a').first();
            const title = $titleLink.text().trim();

            // 2. Manga ID (Tách từ href dạng: https://hentaicube.xyz/read/manga-slug/)
            const href = $titleLink.attr('href') || $item.find('.related__thumb_item a').first().attr('href') || '';
            const mangaId = href.split('/read/').pop()?.replace(/\/$/, '')?.split('?')[0] ?? '';

            // Bỏ qua nếu không có ID hoặc đã bị trùng
            if (!mangaId || addedMangaIds.has(mangaId)) return;

            // 3. Image URL (Lấy từ src / data-src / srcset của thẻ img)
            const $img = $item.find('.related__thumb_item img').first();
            let image = $img.attr('src') || $img.attr('data-src') || $img.attr('srcset')?.split(' ')[0] || '';

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Subtitle
            const subtitle = undefined;

            if (title && !mangaId.includes('javascript')) {
                mangaList.push(
                    App.createPartialSourceManga({
                        mangaId: mangaId,
                        title: decodeHTML(title),
                        image: image,
                        subtitle: subtitle,
                    })
                );
                addedMangaIds.add(mangaId);
            }
        });

        return mangaList;
    }

    parseRandomSection($: CheerioAPI): PartialSourceManga[] {
        const mangaList: PartialSourceManga[] = [];
        const addedMangaIds = new Set<string>(); // Chống trùng lặp do slick-slider tạo clone

        // Chỉ định quét chính xác bên trong phần tử có id="c-post-slider-104"
        $('#c-post-slider-113 .slick-slide:not(.slick-cloned) .related__item, #c-post-slider-113 .related__item').each((_, element) => {
            const $item = $(element);

            // 1. Title & Link
            const $titleLink = $item.find('.post-title h5 a').first();
            const title = $titleLink.text().trim();

            // 2. Manga ID (Tách từ href dạng: https://hentaicube.xyz/read/manga-slug/)
            const href = $titleLink.attr('href') || $item.find('.related__thumb_item a').first().attr('href') || '';
            const mangaId = href.split('/read/').pop()?.replace(/\/$/, '')?.split('?')[0] ?? '';

            // Bỏ qua nếu không có ID hoặc đã bị trùng
            if (!mangaId || addedMangaIds.has(mangaId)) return;

            // 3. Image URL (Lấy từ src / data-src / srcset của thẻ img)
            const $img = $item.find('.related__thumb_item img').first();
            let image = $img.attr('src') || $img.attr('data-src') || $img.attr('srcset')?.split(' ')[0] || '';

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Subtitle
            const subtitle = undefined;

            if (title && !mangaId.includes('javascript')) {
                mangaList.push(
                    App.createPartialSourceManga({
                        mangaId: mangaId,
                        title: decodeHTML(title),
                        image: image,
                        subtitle: subtitle,
                    })
                );
                addedMangaIds.add(mangaId);
            }
        });

        return mangaList;
    }

    // Parse danh sách truyện (Search, Homepage, ViewMore)
    parseSearchResults($: CheerioAPI): PartialSourceManga[] {
        const mangaList: PartialSourceManga[] = [];

        $('.page-listing-item .page-item-detail').each((_, element) => {
            const $item = $(element);

            // 1. Title & Link chính từ thẻ <a> trong .post-title
            const $titleLink = $item.find('.post-title a').first();
            const title = $titleLink.text().replace(/\s+/g, ' ').trim();

            // 2. Manga ID từ href (Lấy slug sau /read/ hoặc fallback theo URL path)
            const href = $titleLink.attr('href') || $item.find('.item-thumb a').attr('href') || '';
            let mangaId = '';

            if (href.includes('/read/')) {
                mangaId = href.split('/read/').pop()?.split('/')[0] ?? '';
            } else {
                // Fallback nếu link cấu trúc khác: lấy segment cuối cùng trước slash kết thúc
                const segments = href.replace(/\/$/, '').split('/');
                mangaId = segments.pop() ?? '';
            }

            // 3. Image URL từ thẻ img trong .item-thumb
            const $img = $item.find('.item-thumb img').first();
            let image = $img.attr('src') || $img.attr('data-src') || $img.attr('srcset')?.split(' ')[0] || '';

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Chapter/Subtitle (Lấy tên chapter mới nhất từ .list-chapter .chapter-item)
            const lastChapter = $item.find('.list-chapter .chapter-item .chapter a').first().text().replace(/\s+/g, ' ').trim() || undefined;

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

    parseLoopResults($: CheerioAPI): PartialSourceManga[] {
        const mangaList: PartialSourceManga[] = [];

        // Cập nhật selector khớp với cấu trúc HTML hiện tại (.row.c-tabs-item__content)
        $('.row.c-tabs-item__content').each((_, element) => {
            const $item = $(element);

            // 1. Title & Link chính từ thẻ <a> trong .post-title
            const $titleLink = $item.find('.post-title a').first();
            const title = $titleLink.text().replace(/\s+/g, ' ').trim();

            // 2. Manga ID từ href (Lấy slug sau /read/)
            const href = $titleLink.attr('href') || $item.find('.tab-thumb a').attr('href') || '';
            let mangaId = '';

            if (href.includes('/read/')) {
                mangaId = href.split('/read/').pop()?.replace(/\/$/, '')?.split('?')[0] ?? '';
            } else {
                const segments = href.replace(/\/$/, '').split('/');
                mangaId = segments.pop() ?? '';
            }

            // 3. Image URL từ thẻ img trong .tab-thumb
            const $img = $item.find('.tab-thumb img').first();
            let image = $img.attr('src') || $img.attr('data-src') || $img.attr('srcset')?.split(' ')[0] || '';

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Chapter/Subtitle (Lấy tên chapter mới nhất từ .tab-meta .chapter a)
            const lastChapter = $item.find('.tab-meta .chapter a').first().text().replace(/\s+/g, ' ').trim() || undefined;

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
    parseMangaDetails($: CheerioAPI, mangaId: string) {
        // 1. Tiêu đề (Nằm trong .post-title h1)
        const title = $('.post-title h1').text().replace(/\s+/g, ' ').trim();

        // 2. Ảnh bìa (Nằm trong .summary_image img)
        const $img = $('.summary_image img').first();
        let image = $img.attr('src') || $img.attr('data-src') || $img.attr('srcset')?.split(' ')[0] || '';
        if (image.startsWith('//')) {
            image = `https:${image}`;
        }

        // Helper hàm lấy nội dung theo nhãn (dựa vào cấu trúc .post-content_item)
        const getSummaryContent = (label: string): string => {
            let result = '';
            $('.post-content_item').each((_, el) => {
                const heading = $(el).find('.summary-heading h5').text().replace(/\s+/g, ' ').trim();
                if (heading.toLowerCase().includes(label.toLowerCase())) {
                    result = $(el).find('.summary-content').text().replace(/\s+/g, ' ').trim();
                    return false; // break loop
                }
            });
            return result;
        };

        // 3. Tác giả
        const authorVal = getSummaryContent('Tác giả');
        const author = authorVal && authorVal !== 'Đang cập nhật' ? authorVal : 'Đang cập nhật';

        // 4. Trạng thái (Nằm trong .post-status .summary-content)
        const statusVal = getSummaryContent('Tình trạng');
        const status = statusVal.toLowerCase().includes('hoàn thành') ? 'Completed' : 'Ongoing';

        // 5. Thể loại (Tags - Nằm trong .genres-content a)
        const arrayTags: Tag[] = [];
        $('.genres-content a').each((_, element) => {
            const label = $(element).text().replace(/\s+/g, ' ').trim();
            const href = $(element).attr('href') || '';

            // Lấy slug từ URL thể loại
            const segments = href.replace(/\/$/, '').split('/');
            const id = segments.pop() ?? '';

            if (id && label) {
                arrayTags.push(App.createTag({ id: id, label: label }));
            }
        });

        // 6. Mô tả & Metadata mở rộng
        const altName = getSummaryContent('Tên khác');
        const postTime = $('.thoigian p').text().replace(/\s+/g, ' ').trim();
        const views = $('.manga-rate-view-comment .ion-ios-eye').parent().text().replace(/\s+/g, ' ').trim();

        // Lấy HTML bên trong .summary__content và chuyển đổi các thẻ HTML sang dạng text/markdown
        const $summary = $('.summary__content').first();

        // Thay thế các thẻ li bằng dấu gạch ngang đầu dòng và thêm xuống dòng
        $summary.find('li').each((_, el) => {
            $(el).prepend('• ');
            $(el).append('\n');
        });

        // Thay thế các thẻ kết thúc block như </p>, </ul>, <br> bằng ký tự xuống dòng
        $summary.find('p, ul, br').after('\n');

        // Lấy text đã được định dạng lại
        const rawDesc = $summary
            .text()
            .replace(/[ \t]+/g, ' ')
            .replace(/\n\s*\n/g, '\n\n')
            .trim();

        const descParts: string[] = [];

        // 1. Tên khác
        if (altName) descParts.push(`Tên khác: ${decodeHTML(altName)}`);

        // 2. Gộp Thời gian và Lượt xem bằng \n đơn để chúng sát nhau
        let timeAndView = '';
        if (postTime) timeAndView += `⏰ ${decodeHTML(postTime)}`;
        if (views) {
            // Nếu đã có postTime thì thêm \n, nếu chưa thì bắt đầu luôn
            timeAndView += (timeAndView ? '\n' : '') + `👁 Lượt xem: ${decodeHTML(views)}`;
        }
        if (timeAndView) descParts.push(timeAndView);

        // 3. Nội dung mô tả
        if (rawDesc) descParts.push(decodeHTML(rawDesc));

        // join('\n\n') sẽ tạo khoảng cách lớn giữa các khối (Tên khác / Meta / Mô tả)
        // nhưng bên trong biến 'timeAndView' chỉ là \n đơn nên chúng sẽ sát nhau
        const description = descParts.join('\n\n');

        return App.createSourceManga({
            id: mangaId,
            mangaInfo: App.createMangaInfo({
                titles: [decodeHTML(title)],
                image: image,
                status: status,
                author: author,
                artist: author,
                desc: description,
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
    parseChapterListFromArray(chapterElements: any[], cheerioInstance: any): Chapter[] {
        const chapters: Chapter[] = [];

        // Đảo ngược toàn bộ danh sách gộp từ các trang (để từ CŨ NHẤT -> MỚI NHẤT cho đúng chuẩn đọc truyện)
        const reversedElements = chapterElements.reverse();

        reversedElements.forEach((element, index) => {
            const $li = cheerioInstance(element);
            const $a = $li.find('a').first();

            // 1. Tên chương
            const chapterName = $a.text().replace(/\s+/g, ' ').trim();

            // 2. Lấy href và bóc tách chapterId
            const href = $a.attr('href') || '';
            const rawSlug = href.replace(/\/$/, '').split('/read/').pop() ?? '';
            const chapterId = rawSlug.split('?')[0] || href;

            // 3. Thời gian đăng
            const $dateContainer = $li.find('.chapter-release-date');
            const timeStr = ($dateContainer.find('a.c-new-tag').attr('title') || $dateContainer.find('i').text() || $dateContainer.text()).replace(/\s+/g, ' ').trim();

            const time = this.parseDate(timeStr);

            if (chapterId && chapterName) {
                chapters.push(
                    App.createChapter({
                        id: chapterId,
                        name: chapterName,
                        chapNum: index + 1, // Đảm bảo số thứ tự tăng dần chuẩn xác từ 1 đến hết
                        langCode: '🇻🇳',
                        group: timeStr,
                        time: time,
                    })
                );
            }
        });

        return chapters;
    }

    // Parse danh sách thể loại (Tags)
    parseTags($: CheerioAPI): TagSection[] {
        const genreTags: Tag[] = [];

        $('.shortcode-alltags .item .inner a').each((_, element) => {
            const $item = $(element);
            if (!$item || $item.length === 0) return;

            // Lấy trực tiếp text của h3 để giữ nguyên số lượng ở cuối (VD: "3d (22)")
            const h3Text = $item.find('h3').text();
            const label = h3Text ? h3Text.trim() : ($item.attr('title')?.trim() ?? '');

            const href = $item.attr('href') || '';
            const slug = href.split('/theloai/').pop()?.replace(/\/$/, '') ?? '';

            if (slug && label) {
                genreTags.push(
                    App.createTag({
                        id: slug,
                        label: label,
                    })
                );
            }
        });

        return [App.createTagSection({ id: 'genres', label: 'Thể loại', tags: genreTags })];
    }
}
