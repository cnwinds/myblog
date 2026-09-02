import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import sharp from 'sharp';
import { rehostArticleImages, isPrivateIpAddress } from '../services/imageRehost';

describe('isPrivateIpAddress', () => {
  it('blocks loopback, RFC1918 and link-local', () => {
    assert.equal(isPrivateIpAddress('127.0.0.1'), true);
    assert.equal(isPrivateIpAddress('10.0.0.1'), true);
    assert.equal(isPrivateIpAddress('192.168.1.1'), true);
    assert.equal(isPrivateIpAddress('172.16.0.1'), true);
    assert.equal(isPrivateIpAddress('169.254.169.254'), true);
    assert.equal(isPrivateIpAddress('::1'), true);
    assert.equal(isPrivateIpAddress('8.8.8.8'), false);
    assert.equal(isPrivateIpAddress('1.1.1.1'), false);
  });
});

describe('rehostArticleImages', () => {
  let tmpDir: string;
  let previousUploadDir: string | undefined;

  before(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'myblog-rehost-'));
    previousUploadDir = process.env.UPLOAD_DIR;
    process.env.UPLOAD_DIR = tmpDir;
  });

  after(() => {
    if (previousUploadDir === undefined) {
      delete process.env.UPLOAD_DIR;
    } else {
      process.env.UPLOAD_DIR = previousUploadDir;
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('rewrites remote images to /uploads and records failures without throwing', async () => {
    const jpeg = await sharp({
      create: { width: 8, height: 8, channels: 3, background: { r: 20, g: 40, b: 80 } },
    })
      .jpeg()
      .toBuffer();

    const okUrl = 'https://cdn.example.com/ok.jpg?Expires=1&Signature=abc';
    const failUrl = 'https://cdn.example.com/missing.jpg';
    const localUrl = '/uploads/202601/already.jpg';

    const content = [
      `![ok](${okUrl})`,
      `![fail](${failUrl})`,
      `![local](${localUrl})`,
    ].join('\n');

    const result = await rehostArticleImages(
      content,
      { imageUrl: okUrl, imageUrls: [{ url: failUrl }] },
      async (url) => {
        if (url === okUrl) {
          return jpeg;
        }
        throw new Error('Download timed out');
      }
    );

    assert.match(result.content, /!\[ok\]\(\/uploads\/\d{6}\/image-\d+-\d+\.jpg\)/);
    assert.ok(result.content.includes(`![fail](${failUrl})`));
    assert.ok(result.content.includes(`![local](${localUrl})`));

    assert.equal(result.imageRewrites.succeeded.length, 1);
    assert.equal(result.imageRewrites.succeeded[0].from, okUrl);
    assert.match(result.imageRewrites.succeeded[0].to, /^\/uploads\/\d{6}\/image-/);
    assert.deepEqual(result.imageRewrites.failed, [
      { url: failUrl, reason: 'Download timed out' },
    ]);

    const plans = result.imagePlans as { imageUrl: string; imageUrls: { url: string }[] };
    assert.equal(plans.imageUrl, result.imageRewrites.succeeded[0].to);
    assert.equal(plans.imageUrls[0].url, failUrl);

    const saved = result.imageRewrites.succeeded[0].to.replace('/uploads/', '');
    assert.equal(fs.existsSync(path.join(tmpDir, saved)), true);
  });
});
