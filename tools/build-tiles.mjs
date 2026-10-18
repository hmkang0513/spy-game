/**
 * 레벨 타일셋 빌더 — public/assets/tiles/tiles_l{1,2,3}.png (32×32 프레임 격자, 8열)
 *
 * 원본 (OpenGameArt, 모두 상업 이용·재배포 가능 라이선스) — 캐시 위치 <SOURCE_ROOT>/lpc-tiles (기본 D:\drive\tools\lpc-tiles)
 *   다시 받기: curl -L -O https://opengameart.org/sites/default/files/<파일> 후 zip 은 x_<이름>/ 에 압축 해제
 *   - lpc_base_assets.zip  → x_lpc_base_assets/  (LPC Base Assets, https://opengameart.org/content/liberated-pixel-cup-lpc-base-assets-sprites-map-tiles)
 *   - castle_2.png                              (LPC Interior Castle Tiles, https://opengameart.org/content/lpc-interior-castle-tiles)
 *   - lpc_-_the_office.zip → x_lpc_-_the_office/ ([LPC Revised] The Office, https://opengameart.org/content/lpc-revised-the-office)
 *   - inside.zip           → x_inside/          (Futuristic Doctor's Office, https://opengameart.org/content/futuristic-doctors-office)
 *
 * 각 TileName 프레임 = 바닥(base) 위에 원본 조각(ops)을 겹친 32×32. 여러 칸짜리 가구는 대표 32×32 조각만 쓴다.
 * 프레임 번호는 TILE_ORDER 순서 그대로이며 src/data/tiles.ts 의 TILE_FRAMES 와 일치해야 한다.
 * 미리보기: tools/out/tiles_preview.png (프레임 목록 + 레벨별 샘플 방)
 */
import fs from 'node:fs';
import path from 'node:path';
import { PROJECT_ROOT, SOURCE_ROOT, blank, load, save, over, crop, scale, fillRect, hex, saveWithSvg, isMain } from './lib/raw.mjs';

export const TILE_SRC_DIR = path.join(SOURCE_ROOT, 'lpc-tiles');
const OUT_DIR = path.join(PROJECT_ROOT, 'public', 'assets', 'tiles');
const PREVIEW = path.join(PROJECT_ROOT, 'tools', 'out', 'tiles_preview.png');
const T = 32;
const COLS = 8;

/** src/data/tiles.ts 와 같은 순서 (프레임 번호 = 인덱스) */
export const TILE_ORDER = [
  'void', 'wall', 'wallWindow', 'floorWood', 'floorTile', 'floorConcrete', 'carpet', 'grass', 'dock', 'water',
  'door', 'counter', 'table', 'chair', 'shelf', 'plant', 'hedge', 'crate', 'machine', 'locker', 'desk', 'safe', 'elevator',
];

/** 원본 파일 별칭 → 상대 경로 + 크레딧 키 */
export const SOURCES = {
  inside: { file: 'x_lpc_base_assets/LPC Base Assets/tiles/inside.png', credit: 'lpc_base' },
  house: { file: 'x_lpc_base_assets/LPC Base Assets/tiles/house.png', credit: 'lpc_base' },
  cabinets: { file: 'x_lpc_base_assets/LPC Base Assets/tiles/cabinets.png', credit: 'lpc_base' },
  country: { file: 'x_lpc_base_assets/LPC Base Assets/tiles/country.png', credit: 'lpc_base' },
  chests: { file: 'x_lpc_base_assets/LPC Base Assets/tiles/chests.png', credit: 'lpc_base' },
  grass: { file: 'x_lpc_base_assets/LPC Base Assets/tiles/grass.png', credit: 'lpc_base' },
  treetop: { file: 'x_lpc_base_assets/LPC Base Assets/tiles/treetop.png', credit: 'lpc_base' },
  cement: { file: 'x_lpc_base_assets/LPC Base Assets/tiles/cement.png', credit: 'lpc_base' },
  water: { file: 'x_lpc_base_assets/LPC Base Assets/tiles/water.png', credit: 'lpc_base' },
  bridges: { file: 'x_lpc_base_assets/LPC Base Assets/tiles/bridges.png', credit: 'lpc_base' },
  dungeon: { file: 'x_lpc_base_assets/LPC Base Assets/tiles/dungeon.png', credit: 'lpc_base' },
  castle: { file: 'castle_2.png', credit: 'lpc_castle' },
  desk: { file: 'x_lpc_-_the_office/Desk, Ornate.png', credit: 'lpc_office' },
  card: { file: 'x_lpc_-_the_office/Card Table.png', credit: 'lpc_office' },
  copy: { file: 'x_lpc_-_the_office/Copy Machine.png', credit: 'lpc_office' },
  lab: { file: 'x_inside/inside/inside.png', credit: 'futuristic_office' },
};

/** 크레딧 정보 (OpenGameArt 페이지의 저자·라이선스·표기 지시) */
export const TILE_CREDITS = {
  lpc_base: {
    title: 'Liberated Pixel Cup (LPC) Base Assets (sprites & map tiles)',
    authors: ['Lanea Zimmerman (Sharm)'],
    licenses: ['CC-BY-SA 3.0', 'GPL 3.0', 'OGA-BY 3.0 (Sharm·Redshrike 작품)'],
    url: 'https://opengameart.org/content/liberated-pixel-cup-lpc-base-assets-sprites-map-tiles',
    note: '사용한 타일(inside, house, cabinets, country, chests, grass, treetop, cement, water, bridges, dungeon)은 CREDITS.TXT 기준 Lanea Zimmerman (Sharm) 작품.',
  },
  lpc_castle: {
    title: 'LPC Interior Castle Tiles',
    authors: ['Lanea Zimmerman (Sharm)'],
    licenses: ['CC-BY 3.0/4.0', 'CC-BY-SA 3.0/4.0', 'GPL 3.0', 'OGA-BY 3.0'],
    url: 'https://opengameart.org/content/lpc-interior-castle-tiles',
    note: 'Attribution Instructions: "Please credit Lanea Zimmerman"',
  },
  lpc_office: {
    title: '[LPC Revised] The Office',
    authors: ["Eliza Wyatt (ElizaWy / Death's Darling)", 'Lanea Zimmerman (Sharm)'],
    licenses: ['OGA-BY 3.0', 'CC-BY-SA 3.0'],
    url: 'https://opengameart.org/content/lpc-revised-the-office',
    note: 'Credits.txt: "Credit: Eliza Wyatt and Lanea Zimmerman (Sharm)", https://github.com/ElizaWy/LPC (Desk Ornate, Card Table, Copy Machine 사용)',
  },
  futuristic_office: {
    title: "Futuristic Doctor's Office",
    authors: ['spiral atlas', 'Lanea Zimmerman (Sharm) 외 LPC 원작자 (zip 내 attribution 파일)'],
    licenses: ['CC-BY-SA 4.0', 'CC-BY-SA 3.0 / GPL 3.0 (원작 LPC 에셋)'],
    url: 'https://opengameart.org/content/futuristic-doctors-office',
    note: 'Based on existing LPC assets (Lanea Zimmerman 외)',
  },
};

const VOID = '#0E1024';

// --- 프레임 레시피 -------------------------------------------------------
// op: { s: 원본 별칭, x, y, w=32, h=32, dx=0, dy=0, gray?: 0..1 회색화, tint?: '#hex' 곱셈 }
const o = (s, x, y, extra = {}) => ({ s, x, y, ...extra });

const COMMON = {
  void: { fill: VOID },
  grass: { ops: [o('grass', 32, 160)] },
  water: { ops: [o('water', 32, 160)] },
  dock: { ops: [o('bridges', 128, 128)] },
  floorConcrete: { ops: [o('cement', 32, 96)] },
  hedge: { base: 'grass', ops: [o('treetop', 32, 32)] },
  crate: { base: 'floorConcrete', ops: [o('chests', 0, 16)] },
};

const L1 = {
  ...COMMON,
  wall: { ops: [o('inside', 32, 16)] },
  wallWindow: { base: 'wall', ops: [o('house', 224, 0)] },
  floorWood: { ops: [o('inside', 0, 128)] },
  floorTile: { ops: [o('castle', 160, 0)] },
  carpet: { ops: [o('castle', 32, 160)] },
  door: { base: 'floorWood', ops: [o('castle', 112, 440)] },
  counter: { base: 'floorWood', ops: [o('desk', 32, 16)] },
  table: { base: 'floorWood', ops: [o('card', 0, 136)] },
  chair: { base: 'floorWood', ops: [o('country', 64, 0)] },
  shelf: { base: 'floorWood', ops: [o('cabinets', 96, 8)] },
  plant: { base: 'floorWood', ops: [o('lab', 0, 208)] },
  machine: { base: 'floorWood', ops: [o('copy', 16, 16)] },
  locker: { base: 'floorWood', ops: [o('cabinets', 128, 112)] },
  desk: { base: 'floorWood', ops: [o('desk', 0, 80)] },
  safe: { base: 'floorWood', ops: [o('chests', 0, 16, { gray: 1, tint: '#9aa0b0' })] },
  elevator: { ops: [o('lab', 320, 256)], hazard: true },
};

const L2 = {
  ...COMMON,
  wall: { ops: [o('castle', 0, 80)] },
  wallWindow: { base: 'wall', ops: [o('castle', 128, 488)] },
  floorWood: { ops: [o('castle', 96, 0)] },
  floorTile: { ops: [o('castle', 160, 0)] },
  carpet: { ops: [o('castle', 32, 160)] },
  door: { base: 'floorTile', ops: [o('castle', 112, 440)] },
  counter: { base: 'floorTile', ops: [o('desk', 32, 16)] },
  table: { base: 'floorTile', ops: [o('castle', 0, 552)] },
  chair: { base: 'floorTile', ops: [o('castle', 32, 552)] },
  shelf: { base: 'floorWood', ops: [o('cabinets', 32, 8)] },
  plant: { base: 'floorTile', ops: [o('castle', 224, 568)] },
  machine: { base: 'floorTile', ops: [o('copy', 16, 16)] },
  locker: { base: 'floorTile', ops: [o('cabinets', 128, 112)] },
  desk: { base: 'floorWood', ops: [o('desk', 0, 80)] },
  safe: { base: 'floorWood', ops: [o('chests', 0, 16, { gray: 1, tint: '#9aa0b0' })] },
  elevator: { ops: [o('lab', 320, 256)], hazard: true },
};

const L3 = {
  ...COMMON,
  wall: { ops: [o('house', 128, 128)] },
  wallWindow: { base: 'wall', ops: [o('lab', 100, 128)] },
  floorWood: { ops: [o('inside', 0, 128)] },
  floorTile: { ops: [o('lab', 288, 288)] },
  carpet: { ops: [o('castle', 32, 160, { gray: 0.7 })] },
  door: { base: 'floorConcrete', ops: [o('dungeon', 0, 168)] },
  counter: { base: 'floorTile', ops: [o('lab', 64, 96)] },
  table: { base: 'floorConcrete', ops: [o('card', 0, 72)] },
  chair: { base: 'floorTile', ops: [o('lab', 160, 128)] },
  shelf: { base: 'floorConcrete', ops: [o('lab', 128, 32)] },
  plant: { base: 'floorTile', ops: [o('lab', 0, 208)] },
  machine: { base: 'floorTile', ops: [o('copy', 16, 16)] },
  locker: { base: 'floorConcrete', ops: [o('lab', 96, 32, { gray: 1, tint: '#a8b4c0' })] },
  desk: { base: 'floorTile', ops: [o('desk', 0, 80)] },
  safe: { base: 'floorConcrete', ops: [o('chests', 0, 16, { gray: 1, tint: '#9aa0b0' })] },
  elevator: { ops: [o('lab', 320, 256)], hazard: true },
};

export const TILESET_RECIPES = { tiles_l1: L1, tiles_l2: L2, tiles_l3: L3 };

/** 미리보기용 샘플 방 (공통 ASCII 문자표) */
const CHARS = {
  ' ': 'void', '#': 'wall', W: 'wallWindow', '.': 'floorWood', ',': 'floorTile', ';': 'floorConcrete', _: 'carpet', '"': 'grass',
  '-': 'dock', '~': 'water', D: 'door', '=': 'counter', T: 'table', h: 'chair', B: 'shelf', P: 'plant', H: 'hedge', C: 'crate',
  M: 'machine', K: 'locker', d: 'desk', S: 'safe', E: 'elevator',
};
const SAMPLES = {
  tiles_l1: [
    '##W###W###W###',
    '#P....hTh..BB#',
    '#.hTh.....,,,#',
    '#.....__..,=,#',
    '#.hTh.__..,=,#',
    '######D#######',
    '"HHH"---------',
    '~~~~~~~~~~~~~~',
  ],
  tiles_l2: [
    '##W####W####W##',
    '#BB,,,,,,,,,,P#',
    '#,,,______,,,,#',
    '#d.,_hTh__,,K,#',
    '#.h,______,=,,#',
    '#P,,,,,,,,,=,S#',
    '#######D#######',
    '"""HHH"""""HHH"',
  ],
  tiles_l3: [
    '###############',
    '#CC;;;;#,,,,MM#',
    '#C;;;;;D,,d,,M#',
    '#;;;;;;#,h,,==#',
    '#;;K;;;#,,,,,P#',
    '#;;K;;;###D####',
    '#;;;;;;;;;;;;S#',
    '#BB;;hT;;;;EEE#',
    '###############',
  ],
};

function tintImg(img, g = 0, tintHex) {
  const out = { data: Buffer.from(img.data), width: img.width, height: img.height };
  const t = tintHex ? hex(tintHex) : null;
  for (let p = 0; p < out.data.length; p += 4) {
    let [r, gg, b] = [out.data[p], out.data[p + 1], out.data[p + 2]];
    if (g) {
      const l = 0.3 * r + 0.59 * gg + 0.11 * b;
      r = r + (l - r) * g;
      gg = gg + (l - gg) * g;
      b = b + (l - b) * g;
    }
    if (t) {
      r = (r * t[0]) / 255;
      gg = (gg * t[1]) / 255;
      b = (b * t[2]) / 255;
    }
    out.data[p] = Math.round(r);
    out.data[p + 1] = Math.round(gg);
    out.data[p + 2] = Math.round(b);
  }
  return out;
}

export function assertTileSource() {
  for (const [k, v] of Object.entries(SOURCES)) {
    const f = path.join(TILE_SRC_DIR, v.file);
    if (!fs.existsSync(f)) throw new Error(`타일 원본 없음 (${k}): ${f}\n  build-tiles.mjs 상단 주석의 방법으로 다시 받으세요.`);
  }
}

async function renderFrame(name, recipe, srcImgs, cache) {
  if (cache.has(name)) return cache.get(name);
  const r = recipe[name];
  if (!r) throw new Error(`타일 레시피 없음: ${name}`);
  let img = blank(T, T);
  if (r.fill) fillRect(img, 0, 0, T, T, [...hex(r.fill), 255]);
  if (r.base) img = over(blank(T, T), await renderFrame(r.base, recipe, srcImgs, cache));
  for (const op of r.ops ?? []) {
    let piece = crop(srcImgs[op.s], op.x, op.y, op.w ?? T, op.h ?? T);
    if (op.gray || op.tint) piece = tintImg(piece, op.gray ?? 0, op.tint);
    over(img, piece, op.dx ?? 0, op.dy ?? 0);
  }
  // 화물 엘리베이터 표시: 테두리에 노랑·검정 경고 줄무늬 (직접 그림)
  if (r.hazard) {
    for (let i = 0; i < T; i++) {
      for (const [x, y] of [[i, 0], [i, 1], [i, T - 2], [i, T - 1], [0, i], [1, i], [T - 2, i], [T - 1, i]]) {
        const c = Math.floor((x + y) / 3) % 2 ? [227, 179, 65, 255] : [26, 26, 30, 255];
        fillRect(img, x, y, 1, 1, c);
      }
    }
  }
  cache.set(name, img);
  return img;
}

/** 어떤 원본(크레딧 키)을 썼는지 */
export function usedTileCredits() {
  const keys = new Set();
  for (const recipe of Object.values(TILESET_RECIPES)) {
    for (const r of Object.values(recipe)) for (const op of r.ops ?? []) keys.add(SOURCES[op.s].credit);
  }
  return [...keys].map((k) => ({ key: k, ...TILE_CREDITS[k] }));
}

export async function buildTiles() {
  assertTileSource();
  const srcImgs = {};
  for (const [k, v] of Object.entries(SOURCES)) srcImgs[k] = await load(path.join(TILE_SRC_DIR, v.file));
  const rows = Math.ceil(TILE_ORDER.length / COLS);
  const sheets = {};
  for (const [key, recipe] of Object.entries(TILESET_RECIPES)) {
    const cache = new Map();
    const sheet = blank(COLS * T, rows * T);
    for (const [i, name] of TILE_ORDER.entries()) {
      over(sheet, await renderFrame(name, recipe, srcImgs, cache), (i % COLS) * T, Math.floor(i / COLS) * T);
    }
    await save(sheet, path.join(OUT_DIR, `${key}.png`));
    sheets[key] = sheet;
  }
  await writePreview(sheets);
  console.log(`[tiles] ${Object.keys(sheets).length}개 타일셋 → ${path.relative(PROJECT_ROOT, OUT_DIR)}, 미리보기 ${path.relative(PROJECT_ROOT, PREVIEW)}`);
  return sheets;
}

function frameOf(sheet, idx) {
  return crop(sheet, (idx % COLS) * T, Math.floor(idx / COLS) * T, T, T);
}

async function writePreview(sheets) {
  const K = 2;
  const keys = Object.keys(sheets);
  const listH = (Math.ceil(TILE_ORDER.length / 12) * (T + 12)) * K;
  const roomW = Math.max(...Object.values(SAMPLES).map((s) => s[0].length)) * T;
  const roomH = Math.max(...Object.values(SAMPLES).map((s) => s.length)) * T;
  const blockH = listH + roomH * K + 30;
  const W = Math.max(12 * T * K, roomW * K) + 20;
  const img = blank(W, keys.length * blockH, [30, 32, 48, 255]);
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${img.height}">`;
  keys.forEach((key, b) => {
    const y0 = b * blockH;
    svg += `<text x="10" y="${y0 + 16}" font-size="14" font-family="Arial" fill="#ffd166">${key}</text>`;
    TILE_ORDER.forEach((name, i) => {
      const x = 10 + (i % 12) * T * K;
      const y = y0 + 22 + Math.floor(i / 12) * (T + 12) * K;
      over(img, scale(frameOf(sheets[key], i), K), x, y);
      svg += `<text x="${x + 2}" y="${y + T * K + 12}" font-size="10" font-family="Arial" fill="#ccc">${i}:${name}</text>`;
    });
    const room = SAMPLES[key];
    const ry = y0 + 22 + listH;
    room.forEach((row, ty) => {
      [...row].forEach((ch, tx) => {
        over(img, scale(frameOf(sheets[key], TILE_ORDER.indexOf(CHARS[ch])), K), 10 + tx * T * K, ry + ty * T * K);
      });
    });
  });
  svg += '</svg>';
  await saveWithSvg(img, svg, PREVIEW);
}

if (isMain(import.meta.url)) await buildTiles();
