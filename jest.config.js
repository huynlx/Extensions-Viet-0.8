const { createDefaultPreset } = require('ts-jest');

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    // 👈 Tự động chạy file mock này TRƯỚC KHI bất kỳ file test nào chạy
    setupFiles: ['./tests/paperbackMock.ts'],
    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            {
                tsconfig: {
                    rootDir: './',
                    noUnusedParameters: false,
                    noUnusedLocals: false,
                },
            },
        ],
    },
};
