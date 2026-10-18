/**
 * 캐릭터 스프라이트 시트 빌더
 *
 * 원본: Universal LPC Spritesheet Character Generator
 *   https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator
 *   캐시 위치: <SOURCE_ROOT>/lpc  (기본 D:\drive\tools\lpc, 환경변수 ASSET_SOURCE_ROOT 로 변경)
 *
 * 다시 받기 (약 430MB, D: 드라이브에):
 *   git clone --filter=blob:none --sparse --depth 1 \
 *     https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator.git lpc
 *   cd lpc && git sparse-checkout set --no-cone '/*' '!/readme-images/' '!/public/' '!/sources/'
 *   (sheet_definitions/, palette_definitions/, spritesheets/**\/walk* 가 필요하다)
 *
 * 동작:
 *   tools/characters.recipes.json 의 레시피마다 sheet_definitions/*.json 을 읽어
 *   레이어 경로·zPos·팔레트 재색칠 규칙을 해석하고, 각 레이어의 walk 시트(576×256 = 9열×4행,
 *   행 순서 up/left/down/right, 열0 = 정지)를 zPos 순으로 합성해
 *   public/assets/characters/<id>.png 로 저장한다. 미리보기: tools/out/characters_preview.png
 *
 * 재색칠: 제너레이터와 같은 방식(palette_definitions/<material>/<material>_<version>.json,
 *   기준 색 → 목표 색, 채널 ±1 허용)으로 CPU 에서 처리한다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PROJECT_ROOT, SOURCE_ROOT, blank, load, save, over, recolor, crop, scale, fillRect, hex, saveWithSvg, isMain } from './lib/raw.mjs';

export const LPC_DIR = path.join(SOURCE_ROOT, 'lpc');
const RECIPES = path.join(PROJECT_ROOT, 'tools', 'characters.recipes.json');
const OUT_DIR = path.join(PROJECT_ROOT, 'public', 'assets', 'characters');
const PREVIEW = path.join(PROJECT_ROOT, 'tools', 'out', 'characters_preview.png');

const FRAME = 64;
const COLS = 9;
const ROWS = 4;
const ANIM = 'walk';

/** 원본 캐시 확인 */
export function assertLpcSource() {
  const need = ['sheet_definitions', 'palette_definitions', 'spritesheets', 'CREDITS.csv'];
  for (const n of need) {
    if (!fs.existsSync(path.join(LPC_DIR, n))) {
      throw new Error(`LPC 원본이 없습니다: ${path.join(LPC_DIR, n)}\n  build-characters.mjs 상단 주석의 방법으로 다시 받으세요.`);
    }
  }
}

const defCache = new Map();
/** sheet_definitions/<id>.json 읽기 */
export function readDef(id) {
  if (!defCache.has(id)) {
    const file = path.join(LPC_DIR, 'sheet_definitions', `${id}.json`);
    if (!fs.existsSync(file)) throw new Error(`정의 파일 없음: ${id}`);
    defCache.set(id, JSON.parse(fs.readFileSync(file, 'utf8')));
  }
  return defCache.get(id);
}

const paletteCache = new Map();
function readPalette(material, version) {
  const key = `${material}.${version}`;
  if (!paletteCache.has(key)) {
    const dir = material === 'all' ? 'all' : material;
    const file = path.join(LPC_DIR, 'palette_definitions', dir, `${dir}_${version}.json`);
    paletteCache.set(key, JSON.parse(fs.readFileSync(file, 'utf8')));
  }
  return paletteCache.get(key);
}
function materialMeta(material) {
  return JSON.parse(fs.readFileSync(path.join(LPC_DIR, 'palette_definitions', material, `meta_${material}.json`), 'utf8'));
}

/** 'navy' | 'ulpc.navy' | ['#..',...] → 색 배열 */
function resolveColors(material, spec, defaultVersion) {
  if (Array.isArray(spec)) return spec;
  // '@이름' = 레시피 파일 palettes 의 사용자 정의 팔레트
  if (spec.startsWith('@')) {
    const custom = readCustomPalettes()[spec.slice(1)];
    if (!custom) throw new Error(`사용자 팔레트 없음: ${spec}`);
    return custom;
  }
  const parts = spec.split('.');
  // 'cloth.ulpc.black' 처럼 다른 재질의 팔레트를 지정할 수도 있다
  if (parts.length === 3) return resolveColors(parts[0], `${parts[1]}.${parts[2]}`);
  const [version, name] = parts.length === 2 ? parts : [defaultVersion, spec];
  const pal = readPalette(material, version);
  if (!pal[name]) throw new Error(`팔레트 색 없음: ${material}.${version}.${name}`);
  return pal[name];
}

/** 'cloth.ulpc.navy' → 색 배열 */
function paletteRef(ref) {
  const [material, version, name] = ref.split('.');
  return resolveColors(material, `${version}.${name}`);
}

/** 재색칠 슬롯 목록: [{slot, material, base(색 배열), matchBody}] */
function recolorSlots(def) {
  const rc = def.recolors;
  if (!rc) return [];
  const entries = rc.material ? [['color', rc]] : Object.entries(rc);
  return entries.map(([slot, r], i) => {
    const meta = materialMeta(r.material);
    const baseSpec = r.base ?? `${meta.default}.${meta.base}`;
    const base = resolveColors(r.material, baseSpec, meta.default);
    // 첫 슬롯이 body 재질이고 match_body_color 면 피부색을 따른다
    const matchBody = i === 0 && def.match_body_color === true;
    return { slot, material: r.material, base, matchBody, defaultVersion: meta.default, typeName: r.type_name };
  });
}

/**
 * 레시피 레이어 하나를 실제 그릴 파일 목록으로 해석한다.
 * @returns {{file:string, rel:string, zPos:number, recolors:Array<{from:string[],to:string[]}>, defId:string}[]}
 */
export function resolveLayer(layer, ch) {
  const def = readDef(layer.def);
  const bodyType = layer.bodyType ?? ch.body;
  const slots = recolorSlots(def);
  const out = [];
  for (let n = 1; n <= 9; n++) {
    const L = def[`layer_${n}`];
    if (!L) continue;
    if (layer.layers && !layer.layers.includes(n)) continue;
    const base = L[bodyType];
    if (!base) {
      if (n === 1) throw new Error(`${layer.def}: 체형 ${bodyType} 경로 없음`);
      continue;
    }
    if (base.includes('${')) throw new Error(`${layer.def}: 경로 템플릿은 지원하지 않음`);
    let rel;
    if (slots.length) {
      rel = `${base}${ANIM}.png`;
    } else {
      const variant = layer.variant ?? def.variants?.[0];
      if (!variant) throw new Error(`${layer.def}: variant 필요`);
      rel = `${base}${ANIM}/${variant.replaceAll(' ', '_')}.png`;
    }
    const file = path.join(LPC_DIR, 'spritesheets', rel);
    if (!fs.existsSync(file)) throw new Error(`${layer.def}: 파일 없음 ${rel}`);
    const recolors = [];
    slots.forEach((s, i) => {
      let spec;
      if (s.matchBody) spec = ch.skin;
      else if (s.typeName === 'eyes') spec = layer.eyes ?? ch.eyes ?? null;
      else if (Array.isArray(layer.colors)) spec = layer.colors[i];
      else if (layer.colors && typeof layer.colors === 'object') spec = layer.colors[s.slot];
      else if (i === 0) spec = layer.color;
      if (spec == null) return;
      recolors.push({ from: s.base, to: resolveColors(s.material, spec, s.defaultVersion) });
    });
    // 레시피의 수동 재색칠 (팔레트 미지원 변형 파일용): 'cloth.ulpc.white' 또는 ['#hex',...]
    for (const r of layer.recolor ?? []) {
      const fromC = typeof r.from === 'string' ? paletteRef(r.from) : r.from;
      const toC = typeof r.to === 'string' ? paletteRef(r.to) : r.to;
      if (fromC.length !== toC.length) throw new Error(`${layer.def}: recolor 색 개수 불일치`);
      recolors.push({ from: fromC, to: toC });
    }
    out.push({ file, rel, zPos: layer.zPos ?? L.zPos ?? 100, recolors, defId: layer.def });
  }
  return out;
}

/** 레시피 하나 → 576×256 시트 */
export async function buildSheet(ch) {
  const draws = ch.layers.flatMap((l) => resolveLayer(l, ch));
  draws.sort((a, b) => a.zPos - b.zPos);
  const sheet = blank(FRAME * COLS, FRAME * ROWS);
  for (const d of draws) {
    let img = await load(d.file);
    if (img.width !== FRAME * COLS || img.height !== FRAME * ROWS) {
      throw new Error(`${d.rel}: walk 시트 크기 ${img.width}×${img.height} (576×256 기대)`);
    }
    for (const r of d.recolors) img = recolor(img, r.from, r.to);
    over(sheet, img);
  }
  return { sheet, draws };
}

function readCustomPalettes() {
  return JSON.parse(fs.readFileSync(RECIPES, 'utf8')).palettes ?? {};
}

export function readRecipes() {
  return JSON.parse(fs.readFileSync(RECIPES, 'utf8')).characters;
}

/** 사용한 레이어 파일과 정의 id 목록 (크레딧용) */
export function usedLayers() {
  assertLpcSource();
  const recipes = readRecipes();
  const used = new Map();
  for (const [id, ch] of Object.entries(recipes)) {
    for (const l of ch.layers) {
      for (const d of resolveLayer(l, ch)) {
        if (!used.has(d.rel)) used.set(d.rel, { rel: d.rel, defId: d.defId, characters: [] });
        used.get(d.rel).characters.push(id);
      }
    }
  }
  return [...used.values()];
}

/** 정지·아래 프레임 미리보기 (×2, 라벨) */
async function writePreview(results) {
  const cell = FRAME * 2;
  const perRow = 6;
  const labelH = 14;
  const rows = Math.ceil(results.length / perRow);
  const img = blank(perRow * cell, rows * (cell + labelH), [40, 44, 70, 255]);
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${img.width}" height="${img.height}">`;
  results.forEach(({ id, sheet, color }, i) => {
    const x = (i % perRow) * cell;
    const y = Math.floor(i / perRow) * (cell + labelH);
    fillRect(img, x + 2, y + 2, cell - 4, cell - 4, [...hex(color), 255]);
    over(img, scale(crop(sheet, 0, FRAME * 2, FRAME, FRAME), 2), x, y);
    svg += `<text x="${x + cell / 2}" y="${y + cell + 11}" font-size="11" font-family="Arial" fill="#fff" text-anchor="middle">${id}</text>`;
  });
  svg += '</svg>';
  await saveWithSvg(img, svg, PREVIEW);
}

export async function buildCharacters({ only } = {}) {
  assertLpcSource();
  const recipes = readRecipes();
  const results = [];
  for (const [id, ch] of Object.entries(recipes)) {
    if (only && !only.includes(id)) continue;
    const { sheet } = await buildSheet(ch);
    await save(sheet, path.join(OUT_DIR, `${id}.png`));
    results.push({ id, sheet, color: ch.signatureColor ?? '#333333' });
  }
  await writePreview(results);
  console.log(`[characters] ${results.length}개 시트 → ${path.relative(PROJECT_ROOT, OUT_DIR)}, 미리보기 ${path.relative(PROJECT_ROOT, PREVIEW)}`);
  return results;
}

if (isMain(import.meta.url)) {
  const only = process.argv.slice(2);
  await buildCharacters({ only: only.length ? only : undefined });
}
