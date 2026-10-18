// 에셋 빌드 공용 도우미 — RGBA 버퍼 단위로 이미지를 다룬다 (sharp 사용)
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

/** 프로젝트 루트 (tools/ 의 상위) */
export const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** 외부 원본 캐시 루트. 기본값은 프로젝트 기준 ../../tools (= D:\drive\tools), 환경변수로 바꿀 수 있다. */
export const SOURCE_ROOT = process.env.ASSET_SOURCE_ROOT
  ? path.resolve(process.env.ASSET_SOURCE_ROOT)
  : path.resolve(PROJECT_ROOT, '..', '..', 'tools');

/** 빈 RGBA 이미지 */
export function blank(width, height, rgba = [0, 0, 0, 0]) {
  const data = Buffer.alloc(width * height * 4);
  if (rgba.some((v) => v !== 0)) {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = rgba[0];
      data[i + 1] = rgba[1];
      data[i + 2] = rgba[2];
      data[i + 3] = rgba[3];
    }
  }
  return { data, width, height };
}

/** PNG → RGBA */
export async function load(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** RGBA → PNG 파일 */
export async function save(img, file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await sharp(img.data, { raw: { width: img.width, height: img.height, channels: 4 } })
    .png({ compressionLevel: 9, palette: false })
    .toFile(file);
}

/** RGBA → PNG 버퍼 */
export function toPng(img) {
  return sharp(img.data, { raw: { width: img.width, height: img.height, channels: 4 } }).png().toBuffer();
}

/** 사각 영역 잘라내기 (범위 밖은 투명) */
export function crop(img, x, y, w, h) {
  const out = blank(w, h);
  for (let j = 0; j < h; j++) {
    const sy = y + j;
    if (sy < 0 || sy >= img.height) continue;
    for (let i = 0; i < w; i++) {
      const sx = x + i;
      if (sx < 0 || sx >= img.width) continue;
      img.data.copy(out.data, (j * w + i) * 4, (sy * img.width + sx) * 4, (sy * img.width + sx) * 4 + 4);
    }
  }
  return out;
}

/** src 를 dst 의 (dx,dy) 에 알파 합성 (source-over) */
export function over(dst, src, dx = 0, dy = 0) {
  for (let j = 0; j < src.height; j++) {
    const ty = dy + j;
    if (ty < 0 || ty >= dst.height) continue;
    for (let i = 0; i < src.width; i++) {
      const tx = dx + i;
      if (tx < 0 || tx >= dst.width) continue;
      const s = (j * src.width + i) * 4;
      const sa = src.data[s + 3] / 255;
      if (sa === 0) continue;
      const d = (ty * dst.width + tx) * 4;
      const da = dst.data[d + 3] / 255;
      const oa = sa + da * (1 - sa);
      for (let c = 0; c < 3; c++) {
        dst.data[d + c] = Math.round((src.data[s + c] * sa + dst.data[d + c] * da * (1 - sa)) / oa);
      }
      dst.data[d + 3] = Math.round(oa * 255);
    }
  }
  return dst;
}

/** 정수배 최근접 확대 */
export function scale(img, k) {
  const out = blank(img.width * k, img.height * k);
  for (let y = 0; y < out.height; y++) {
    for (let x = 0; x < out.width; x++) {
      const s = (Math.floor(y / k) * img.width + Math.floor(x / k)) * 4;
      img.data.copy(out.data, (y * out.width + x) * 4, s, s + 4);
    }
  }
  return out;
}

/** 좌우 반전 */
export function flipX(img) {
  const out = blank(img.width, img.height);
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const s = (y * img.width + x) * 4;
      img.data.copy(out.data, (y * img.width + (img.width - 1 - x)) * 4, s, s + 4);
    }
  }
  return out;
}

/** '#RRGGBB' → [r,g,b] */
export function hex(h) {
  const v = h.replace('#', '');
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

/**
 * 팔레트 치환: from[i] 색(±tol)을 to[i] 색으로 바꾼다. 알파는 유지.
 * LPC 제너레이터의 CPU 재색칠(palette-recolor.ts)과 같은 방식.
 */
export function recolor(img, from, to, tol = 1) {
  if (from.length !== to.length) throw new Error(`recolor: 색 개수 불일치 (${from.length} → ${to.length})`);
  const src = from.map(hex);
  const dst = to.map(hex);
  const out = { data: Buffer.from(img.data), width: img.width, height: img.height };
  const d = out.data;
  for (let p = 0; p < d.length; p += 4) {
    if (d[p + 3] === 0) continue;
    for (let k = 0; k < src.length; k++) {
      const c = src[k];
      if (Math.abs(d[p] - c[0]) <= tol && Math.abs(d[p + 1] - c[1]) <= tol && Math.abs(d[p + 2] - c[2]) <= tol) {
        const t = dst[k];
        d[p] = t[0];
        d[p + 1] = t[1];
        d[p + 2] = t[2];
        break;
      }
    }
  }
  return out;
}

/** 모든 불투명 픽셀에 곱셈 색조 (보조용) */
export function multiply(img, rgb) {
  const out = { data: Buffer.from(img.data), width: img.width, height: img.height };
  for (let p = 0; p < out.data.length; p += 4) {
    out.data[p] = Math.round((out.data[p] * rgb[0]) / 255);
    out.data[p + 1] = Math.round((out.data[p + 1] * rgb[1]) / 255);
    out.data[p + 2] = Math.round((out.data[p + 2] * rgb[2]) / 255);
  }
  return out;
}

/** 단색 사각형 채우기 */
export function fillRect(img, x, y, w, h, rgba) {
  for (let j = y; j < y + h; j++) {
    for (let i = x; i < x + w; i++) {
      if (i < 0 || j < 0 || i >= img.width || j >= img.height) continue;
      const d = (j * img.width + i) * 4;
      img.data[d] = rgba[0];
      img.data[d + 1] = rgba[1];
      img.data[d + 2] = rgba[2];
      img.data[d + 3] = rgba[3] ?? 255;
    }
  }
  return img;
}

/** SVG 텍스트 라벨을 PNG 위에 얹어 저장 (미리보기용) */
export async function saveWithSvg(img, svg, file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await sharp(await toPng(img))
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toFile(file);
}

/** 스크립트가 직접 실행됐는지 (import 와 구분) */
export function isMain(metaUrl) {
  return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(metaUrl);
}
