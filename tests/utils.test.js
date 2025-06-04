import { detectPlatformFromPackageCode } from '../js/utils.js';

test('detects Shopee from TH code', () => {
  expect(detectPlatformFromPackageCode('TH12345678901')).toBe('Shopee');
});

test('detects Lazada from LEX code', () => {
  expect(detectPlatformFromPackageCode('LEX4567890')).toBe('Lazada');
});

test('detects Tiktok from JT code', () => {
  expect(detectPlatformFromPackageCode('JT123456789')).toBe('Tiktok');
});

test('detects Tiktok from digits-only code', () => {
  expect(detectPlatformFromPackageCode('123456789012')).toBe('Tiktok');
});
