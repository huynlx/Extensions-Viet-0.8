/// <reference types="jest" />
import axios from 'axios';
import { TComic } from '../src/TComic/TComic';

describe('TComic Search Tests', () => {
    let source: TComic;

    beforeEach(() => {
        const cheerio = require('cheerio');
        source = new TComic(cheerio);
    });

    it('should search by Tag/Genre', async () => {
        const result = await source.getSearchResults(
            {
                title: '',
                includedTags: [{ id: 'action', label: 'Action' }],
                excludedTags: [],
                parameters: {},
            },
            { page: 1 }
        );

        // 🎯 Kiểm tra chặt chẽ: Kết quả không được rỗng
        expect(result).toBeDefined();
        expect(result.results).not.toBeUndefined();
        expect(result.results.length).toBeGreaterThan(0); // Nếu API trả về 403 -> results = [] -> Test sẽ FAIL ngay!
    });

    it('should search by Title keyword', async () => {
        const searchQuery = {
            title: 'god',
            includedTags: [],
            excludedTags: [],
            parameters: {},
        };

        const result = await source.getSearchResults(searchQuery, { page: 1 });

        expect(result).toBeDefined();
    });
});
