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
            const title = decodeHTML($titleLink.text().trim());
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

            // 4. Subtitle
            const photoCount = $item.find('.iconimage').text().replace(/\D/g, '').trim();
            const subtitle = photoCount ? decodeHTML(`${photoCount} photos`) : undefined;

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

            // 1. Title & Link
            const $titleLink = $item.find('.post-box-title a').first();
            const title = decodeHTML($titleLink.text().trim());
            const href = $titleLink.attr('href') || $item.find('.post-thumbnail a').attr('href') || '';

            // 2. Manga ID
            let mangaId = '';
            try {
                const urlObj = new URL(href);
                mangaId = urlObj.pathname.replace(/^\/|\/$/g, '');
            } catch {
                mangaId = href.replace(/^https?:\/\/[^\/]+/, '').replace(/^\/|\/$/g, '');
            }

            // 3. Image URL
            const $img = $item.find('.post-thumbnail img').first();
            let image = $img.attr('data-src') || $img.attr('src') || '';

            if (image.startsWith('data:image')) {
                image = $img.attr('data-src') || '';
            }

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Subtitle
            const subtitleMatch = title.match(/\(([^)]*(?:photos|pictures|videos)[^)]*)\)/i);
            const subtitle = subtitleMatch?.[1] ? decodeHTML(subtitleMatch[1].trim()) : undefined;

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

            // 1. Tiêu đề
            const $h3 = $thumb.next('h3');
            const $titleLink = $h3.find('a').first();
            const rawTitle = $titleLink.text().trim() || $thumbLink.attr('title')?.trim() || '';
            const title = decodeHTML(rawTitle);

            // 2. Link & Manga ID
            const href = $titleLink.attr('href') || $thumbLink.attr('href') || '';
            let mangaId = '';
            try {
                const urlObj = new URL(href);
                mangaId = urlObj.pathname.replace(/^\/|\/$/g, '');
            } catch {
                mangaId = href.replace(/^https?:\/\/[^\/]+/, '').replace(/^\/|\/$/g, '');
            }

            // 3. Image URL
            const $img = $thumb.find('img').first();
            let image = $img.attr('data-src') || $img.attr('src') || '';

            if (image.startsWith('data:image')) {
                image = $img.attr('data-src') || '';
            }

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Subtitle
            const subtitleMatch = title.match(/\(([^)]*(?:photos|anh|pictures|videos)[^)]*)\)/i);
            const subtitle = subtitleMatch?.[1] ? decodeHTML(subtitleMatch[1].trim()) : undefined;

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

    parseSearchResults($: CheerioAPI): PartialSourceManga[] {
        const mangaList: PartialSourceManga[] = [];

        $('.tidymag-cgrid-post').each((_, element) => {
            const $item = $(element);

            // 1. Title & Link
            const $titleLink = $item.find('h3.tidymag-cgrid-post-title a').first();
            const title = decodeHTML($titleLink.text().trim());
            const href = $titleLink.attr('href') || $item.find('.tidymag-cgrid-post-thumbnail a').attr('href') || '';

            // 2. Manga ID
            let mangaId = '';
            try {
                const urlObj = new URL(href, 'https://maulon.vip');
                mangaId = urlObj.pathname.replace(/^\/|\/$/g, '');
            } catch {
                mangaId = href.replace(/^https?:\/\/[^\/]+\//, '').replace(/\/$/, '');
            }

            // 3. Image URL
            const $img = $item.find('.tidymag-cgrid-post-thumbnail img').first();
            let image = $img.attr('src') || $img.attr('data-src') || '';

            if (image.startsWith('data:image')) {
                image = $img.attr('data-src') || '';
            }

            if (image.startsWith('//')) {
                image = `https:${image}`;
            }

            // 4. Subtitle
            const photoCount = $item.find('.iconimage').text().replace(/\D/g, '').trim();
            const subtitle = photoCount ? decodeHTML(`${photoCount} photos`) : undefined;

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

    parseMangaDetails($: CheerioAPI, compositeId: string): SourceManga {
        // 1. Tiêu đề
        const title = decodeHTML($('h1.entry-title, h1.post-title').first().text().trim());

        // 2. Tác giả / Nguồn
        const author = decodeHTML('MauLon');

        // 3. Tags & Categories
        const arrayTags: Tag[] = [];

        $('.entry-footer .tidymag-entry-meta-single-cats a, .rank-math-breadcrumb a').each((_, element) => {
            const $tag = $(element);
            const label = decodeHTML($tag.text().trim());
            const href = $tag.attr('href') || '';
            if (href === 'https://maulon.vip' || href === 'https://maulon.vip/') return;

            let id = '';
            try {
                const urlObj = new URL(href, 'https://maulon.vip');
                id = urlObj.pathname.replace(/^\/|\/$/g, '');
            } catch {
                id = href.replace(/^https?:\/\/[^\/]+\//, '').replace(/\/$/, '');
            }

            if (id && label && !arrayTags.some((t) => t.id === id)) {
                arrayTags.push(App.createTag({ id: id, label: label }));
            }
        });

        $('.tags-links a').each((_, element) => {
            const $tag = $(element);
            const label = decodeHTML($tag.text().trim());
            const href = $tag.attr('href') || '';

            let id = '';
            try {
                const urlObj = new URL(href, 'https://maulon.vip');
                id = urlObj.pathname.replace(/^\/|\/$/g, '');
            } catch {
                id = href.replace(/^https?:\/\/[^\/]+\//, '').replace(/\/$/, '');
            }

            if (id && label && !arrayTags.some((t) => t.id === id)) {
                arrayTags.push(App.createTag({ id: id, label: label }));
            }
        });

        // 4. Mô tả
        let description = $('.entry-content .page-links + p').text().trim();

        if (!description) {
            const $pNext = $('.entry-content .page-links').next('p');
            description = $pNext.text().trim();
        }

        if (!description) {
            description = $('.entry-content > p').first().text().trim();
        }

        description = decodeHTML(description);

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
                titles: [title],
                image: homeCoverUrl,
                status: 'Completed',
                author: author,
                artist: author,
                desc: description,
                tags: [
                    App.createTagSection({
                        id: '0',
                        label: decodeHTML('Genres'),
                        tags: arrayTags,
                    }),
                ],
            }),
        });
    }

    parseDate(dateStr: string): Date {
        if (!dateStr) return new Date();

        const [dayStr, monthStr, yearStr] = dateStr.split('/');

        if (dayStr && monthStr && yearStr) {
            const day = parseInt(dayStr, 10);
            const month = parseInt(monthStr, 10) - 1;
            const year = parseInt(yearStr, 10);

            return new Date(year, month, day);
        }

        return new Date();
    }

    parseChapterList($: CheerioAPI, realMangaId?: string): Chapter[] {
        if (!realMangaId) return [];

        const chapters: Chapter[] = [];
        const seenChapNums = new Set<number>();
        const baseSlug = (realMangaId.split('|')[0] ?? '').replace(/^\/|\/$/g, '');

        const $pageLinks = $('.page-links');

        if ($pageLinks.length > 0) {
            $pageLinks.find('span.post-page-numbers, a.post-page-numbers').each((_, element) => {
                const $el = $(element);
                const pageNumText = $el.text().trim();
                const pageNum = parseInt(pageNumText, 10);

                if (isNaN(pageNum) || seenChapNums.has(pageNum)) return;

                seenChapNums.add(pageNum);

                let chapId = '';

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

                if (!chapId) {
                    chapId = pageNum === 1 ? baseSlug : `${baseSlug}/${pageNum}`;
                }

                chapters.push(
                    App.createChapter({
                        id: chapId,
                        chapNum: pageNum,
                        name: decodeHTML(`Phần ${pageNum}`),
                        time: new Date(),
                    })
                );
            });
        }

        if (chapters.length === 0) {
            chapters.push(
                App.createChapter({
                    id: baseSlug,
                    chapNum: 1,
                    name: decodeHTML('Phần 1'),
                    time: new Date(),
                })
            );
        }

        return chapters.sort((a, b) => a.chapNum - b.chapNum);
    }

    parseTags($: CheerioAPI): TagSection[] {
        const sections: TagSection[] = [];

        $('.rank-math-html-sitemap__section').each((index, sectionEl) => {
            const $section = $(sectionEl);
            const sectionTitle = decodeHTML($section.find('h2.rank-math-html-sitemap__title').text().trim());
            const tags: Tag[] = [];

            $section.find('ul.rank-math-html-sitemap__list li.rank-math-html-sitemap__item').each((_, liEl) => {
                const $a = $(liEl).find('a.rank-math-html-sitemap__link').first();
                const href = $a.attr('href') || '';
                const label = decodeHTML($a.text().trim());

                if (!href || !label) return;

                let id = '';
                try {
                    const urlObj = new URL(href, 'https://maulon.vip');
                    id = urlObj.pathname.replace(/^\/|\/$/g, '');
                } catch {
                    id = href.replace(/^https?:\/\/[^\/]+\//, '').replace(/\/$/, '');
                }

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
                        label: sectionTitle || decodeHTML(`Section ${index + 1}`),
                        tags: tags,
                    })
                );
            }
        });

        return sections;
    }
}
