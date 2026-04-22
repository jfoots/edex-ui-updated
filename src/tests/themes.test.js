'use strict';

/**
 * Validates every theme file in assets/themes/ against the structure
 * required by the renderer and terminal class at runtime.
 */

const fs = require('fs');
const path = require('path');

const themesDir = path.join(__dirname, '../assets/themes');
const themeFiles = fs.readdirSync(themesDir).filter(f => f.endsWith('.json'));

describe('Theme files', () => {
    test('at least one theme file exists', () => {
        expect(themeFiles.length).toBeGreaterThan(0);
    });

    themeFiles.forEach(file => {
        describe(file, () => {
            let theme;

            beforeAll(() => {
                theme = JSON.parse(fs.readFileSync(path.join(themesDir, file), 'utf8'));
            });

            test('is valid JSON', () => {
                expect(theme).toBeDefined();
                expect(typeof theme).toBe('object');
            });

            // --- colors block (used by _renderer.js for CSS vars) ---
            test('has colors.r/g/b as numbers (used for CSS rgb() values)', () => {
                expect(typeof theme.colors.r).toBe('number');
                expect(typeof theme.colors.g).toBe('number');
                expect(typeof theme.colors.b).toBe('number');
                expect(theme.colors.r).toBeGreaterThanOrEqual(0);
                expect(theme.colors.r).toBeLessThanOrEqual(255);
                expect(theme.colors.g).toBeGreaterThanOrEqual(0);
                expect(theme.colors.g).toBeLessThanOrEqual(255);
                expect(theme.colors.b).toBeGreaterThanOrEqual(0);
                expect(theme.colors.b).toBeLessThanOrEqual(255);
            });

            test('has colors.black, light_black, grey (used for CSS vars)', () => {
                expect(typeof theme.colors.black).toBe('string');
                expect(typeof theme.colors.light_black).toBe('string');
                expect(typeof theme.colors.grey).toBe('string');
            });

            // --- cssvars block (used by _renderer.js font loading) ---
            test('has cssvars.font_main and font_main_light strings', () => {
                expect(typeof theme.cssvars.font_main).toBe('string');
                expect(theme.cssvars.font_main.length).toBeGreaterThan(0);
                expect(typeof theme.cssvars.font_main_light).toBe('string');
                expect(theme.cssvars.font_main_light.length).toBeGreaterThan(0);
            });

            // --- terminal block (passed directly to xterm Terminal constructor) ---
            test('has terminal.fontFamily string', () => {
                expect(typeof theme.terminal.fontFamily).toBe('string');
                expect(theme.terminal.fontFamily.length).toBeGreaterThan(0);
            });

            test('has terminal foreground and background colors', () => {
                expect(typeof theme.terminal.foreground).toBe('string');
                expect(typeof theme.terminal.background).toBe('string');
            });

            test('has terminal cursor color', () => {
                expect(typeof theme.terminal.cursor).toBe('string');
            });

            // --- globe block (used by locationGlobe.class.js) ---
            test('has globe color properties', () => {
                expect(typeof theme.globe.base).toBe('string');
                expect(typeof theme.globe.marker).toBe('string');
                expect(typeof theme.globe.pin).toBe('string');
                expect(typeof theme.globe.satellite).toBe('string');
            });
        });
    });
});
