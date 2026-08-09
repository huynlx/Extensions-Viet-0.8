"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/// <reference types="jest" />
const CuuTruyen_1 = require("../src/CuuTruyen/CuuTruyen");
describe('CuuTruyen Get Search Tags Tests', () => {
    let source;
    beforeEach(() => {
        const cheerio = require('cheerio');
        source = new CuuTruyen_1.CuuTruyen(cheerio);
        // Mock các hàm của stateManager cho Jest
        source.stateManager.retrieve = jest.fn().mockResolvedValue('https://cuutruyen.moe');
        source.stateManager.store = jest.fn().mockResolvedValue(undefined);
    });
    it('should fetch search tags correctly and log them out', async () => {
        const tagSections = await source.getSearchTags();
        // 🎯 Kiểm tra cơ bản
        expect(tagSections).toBeDefined();
        expect(Array.isArray(tagSections)).toBe(true);
        expect(tagSections.length).toBeGreaterThan(0);
        // 📝 Log danh sách tag thu thập được
        console.log(`\n=== TỔNG SỐ TAG SECTIONS: ${tagSections.length} ===`);
        tagSections.forEach((section, index) => {
            console.log(`\n Section ${index + 1}: [ID: ${section.id}] - ${section.label}`);
            console.log(`   Số lượng tag: ${section.tags.length}`);
            // Log chi tiết 10 tag đầu tiên của mỗi section
            const sampleTags = section.tags.slice(0, 10).map((t) => `${t.label} (${t.id})`);
            console.log(`   Sample tags:`, sampleTags.join(', '));
            if (section.tags.length > 10) {
                console.log(`   ... và ${section.tags.length - 10} tag khác`);
            }
        });
        // 🎯 Validate cấu trúc từng TagSection
        const firstSection = tagSections[0]; // Thêm dấu ! ở đây
        expect(firstSection).toHaveProperty('id');
        expect(firstSection).toHaveProperty('label');
        expect(firstSection).toHaveProperty('tags');
        expect(Array.isArray(firstSection.tags)).toBe(true);
    });
});
