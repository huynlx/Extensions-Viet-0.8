"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const TruyenQQ_1 = require("../src/TruyenQQ/TruyenQQ"); // ⚠️ Điều chỉnh lại đường dẫn file TruyenQQ của bạn
describe('TruyenQQ Get Search Tags Tests', () => {
    let source;
    beforeEach(() => {
        const cheerio = require('cheerio');
        source = new TruyenQQ_1.TruyenQQ(cheerio);
    });
    it('should fetch and parse search tags correctly', async () => {
        const tagSections = await source.getSearchTags();
        // 🎯 LOG TOÀN BỘ TAGS LẤY ĐƯỢC RA TERMINAL
        console.log('\n==================================================');
        console.log('🏷️  DANH SÁCH TAGS THU THẬP ĐƯỢC:');
        console.log('==================================================\n');
        tagSections.forEach((section) => {
            console.log(`📂 [${section.label}] (ID: ${section.id}) - Tổng: ${section.tags.length} tags:`);
            console.table(section.tags); // In dạng bảng cực kỳ đẹp và trực quan
            console.log('\n--------------------------------------------------\n');
        });
        // 🎯 KIỂM TRA ASSERTIONS
        expect(tagSections).toBeDefined();
        expect(Array.isArray(tagSections)).toBe(true);
        expect(tagSections.length).toBeGreaterThan(0);
        const genreSection = tagSections.find((s) => s.id === '0');
        expect(genreSection).toBeDefined();
        expect(genreSection?.tags.length).toBeGreaterThan(0);
        const countrySection = tagSections.find((s) => s.id === '1');
        expect(countrySection).toBeDefined();
        expect(countrySection?.tags.length).toBeGreaterThan(0);
        const sampleCountryTag = countrySection?.tags[0];
        expect(sampleCountryTag).toBeDefined();
        expect(sampleCountryTag?.id).toMatch(/^country\./);
    });
});
