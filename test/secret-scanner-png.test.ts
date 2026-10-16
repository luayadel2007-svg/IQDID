/**
 * TASK-12 §3.5: PNG support in the secret scanner must not weaken detection. Secrets in any PNG text
 * chunk are found; malformed or unknown structures still BLOCK; real repository screenshots pass.
 */
import { describe, expect, it } from 'vitest';
import { deflateSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { inspectPng, isPng } from '../tools/lib/secret-scanner-engine.mjs';

const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const table = Array.from({ length: 256 }, (_, n) => { for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1; return n >>> 0; });
const crc = (b: Buffer): number => { let c = 0xffffffff; for (const x of b) c = (table[(c ^ x) & 255] ?? 0) ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type: string, data: Buffer, badCrc = false): Buffer => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const c = Buffer.alloc(4); c.writeUInt32BE(badCrc ? (crc(body) ^ 1) >>> 0 : crc(body));
  return Buffer.concat([len, body, c]);
};
const IHDR = (() => { const d = Buffer.alloc(13); d.writeUInt32BE(1, 0); d.writeUInt32BE(1, 4); d[8] = 8; d[9] = 2; return chunk('IHDR', d); })();
const IDAT = chunk('IDAT', deflateSync(Buffer.from([0, 255, 255, 255])));
const IEND = chunk('IEND', Buffer.alloc(0));
const png = (...middle: Buffer[]): Buffer => Buffer.concat([SIG, IHDR, ...middle, IDAT, IEND]);
// Built at runtime so this test file itself contains no literal secret patterns.
const TOKEN = ['ghp', '_', 'A'.repeat(36)].join('');
const KEY = ['-----BEGIN ', 'PRIVATE KEY-----'].join('');
const ASSIGN = ['api', '_key = "', 'abcdefgh12345678', '"'].join('');

const scan = (b: Buffer): { rules: string[]; blocked: string | null } => {
  const rules: string[] = [];
  try { inspectPng('x.png', b, 2_097_152, (rule: string) => rules.push(rule)); return { rules, blocked: null }; }
  catch (e) { return { rules, blocked: (e as { code?: string }).code ?? 'ERROR' }; }
};

describe('secret scanner — PNG text chunks are scanned, not skipped', () => {
  it('a clean, well-formed PNG passes with no findings', () => {
    expect(isPng(png())).toBe(true);
    expect(scan(png())).toEqual({ rules: [], blocked: null });
  });
  it('finds a token in tEXt', () => {
    expect(scan(png(chunk('tEXt', Buffer.from(`Comment\0${TOKEN}`, 'latin1')))).rules).toContain('KNOWN_TOKEN');
  });
  it('finds a private key in compressed zTXt', () => {
    expect(scan(png(chunk('zTXt', Buffer.concat([Buffer.from('Comment\0\0', 'latin1'), deflateSync(Buffer.from(KEY))])))).rules).toContain('PRIVATE_KEY');
  });
  it('finds a secret assignment in compressed and uncompressed iTXt (UTF-8)', () => {
    const itxt = (compressed: boolean) => chunk('iTXt', Buffer.concat([Buffer.from(`Description\0${compressed ? '\x01' : '\x00'}\0ar\0وصف\0`, 'utf8'), compressed ? deflateSync(Buffer.from(ASSIGN)) : Buffer.from(ASSIGN)]));
    expect(scan(png(itxt(true))).rules).toContain('SECRET_ASSIGNMENT');
    expect(scan(png(itxt(false))).rules).toContain('SECRET_ASSIGNMENT');
  });
  it.each([
    ['CRC mismatch', () => png(chunk('tEXt', Buffer.from('a\0b'), true))],
    ['unknown chunk type', () => png(chunk('ruSt', Buffer.from('x')))],
    ['data after IEND', () => Buffer.concat([png(), Buffer.from('trailing')])],
    ['missing IEND', () => Buffer.concat([SIG, IHDR, IDAT])],
    ['IHDR not first', () => Buffer.concat([SIG, IDAT, IHDR, IEND])],
    ['truncated chunk', () => png().subarray(0, 40)],
    ['corrupt zTXt stream', () => png(chunk('zTXt', Buffer.from('k\0\0not-deflate', 'latin1')))],
  ])('still BLOCKS on %s', (_name, make) => {
    expect(scan(make()).blocked).toBe('UNSUPPORTED_BINARY');
  });
  it('every PNG tracked in the repository parses and is clean', () => {
    const files = spawnSync('git', ['ls-files', '*.png'], { encoding: 'utf8' }).stdout.split('\n').filter(Boolean);
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) expect([f, scan(readFileSync(f))]).toEqual([f, { rules: [], blocked: null }]);
  });
});
