/**
 * public/assets/CREDITS.md 생성기
 *
 * 원본:
 *   - 캐릭터: LPC 제너레이터 sheet_definitions/*.json 의 credits 항목 (build-characters.mjs 가 실제로 쓴 레이어만)
 *   - 타일: build-tiles.mjs 의 TILE_CREDITS (OpenGameArt 각 페이지의 저자·라이선스·Attribution Instructions)
 *   - 폰트: Galmuri (OFL-1.1)
 * 원본 캐시가 필요하다 (build-characters.mjs, build-tiles.mjs 상단 주석 참고).
 */
import fs from 'node:fs';
import path from 'node:path';
import { PROJECT_ROOT, isMain } from './lib/raw.mjs';
import { usedLayers, readDef } from './build-characters.mjs';
import { usedTileCredits } from './build-tiles.mjs';

const OUT = path.join(PROJECT_ROOT, 'public', 'assets', 'CREDITS.md');

/** 레이어 파일 경로에 맞는 credits 항목 (가장 긴 접두어) */
function creditFor(def, rel) {
  let best = null;
  for (const c of def.credits ?? []) {
    const f = c.file.replace(/\/$/, '');
    if ((rel === f || rel.startsWith(`${f}/`) || rel.startsWith(`${f}.`)) && (!best || f.length > best.file.length)) best = c;
  }
  return best;
}

export function characterCredits() {
  const groups = new Map();
  for (const u of usedLayers()) {
    const def = readDef(u.defId);
    const c = creditFor(def, u.rel);
    if (!c) throw new Error(`크레딧 항목을 찾지 못함: ${u.defId} (${u.rel})`);
    // 상업 이용·재배포 불가 라이선스는 거부
    const bad = c.licenses.filter((l) => /\bNC\b|\bND\b|non-?commercial/i.test(l));
    if (bad.length) throw new Error(`허용되지 않는 라이선스: ${u.defId} ${bad.join(', ')}`);
    // 저자 미상 항목도 거부 (출처 불명확)
    if (c.authors.some((a) => /^\?+$/.test(a.trim()))) throw new Error(`저자 미상 레이어: ${u.defId}`);
    const key = c.file;
    if (!groups.has(key)) groups.set(key, { name: def.name, credit: c, characters: new Set() });
    u.characters.forEach((ch) => groups.get(key).characters.add(ch));
  }
  return [...groups.values()].sort((a, b) => a.credit.file.localeCompare(b.credit.file));
}

export function buildCredits() {
  const chars = characterCredits();
  const tiles = usedTileCredits();
  const allAuthors = new Set();
  chars.forEach((g) => g.credit.authors.forEach((a) => allAuthors.add(a)));
  const L = [];
  L.push('# CREDITS — 코드네임 모스', '');
  L.push('이 게임의 그래픽은 아래 작가들의 자유 라이선스 작품을 사용(일부 재색칠·잘라내기·합성)했다.');
  L.push('수정한 그림 파일(public/assets/characters, public/assets/tiles)은 원본 라이선스를 따라 CC-BY-SA 3.0 / GPL 3.0 (원본이 허용하는 범위)으로 배포한다.');
  L.push('게임 코드에는 이 라이선스가 적용되지 않는다.', '');
  L.push('라이선스 원문:');
  L.push('- CC-BY-SA 3.0: https://creativecommons.org/licenses/by-sa/3.0/');
  L.push('- CC-BY-SA 4.0: https://creativecommons.org/licenses/by-sa/4.0/');
  L.push('- CC-BY 3.0: https://creativecommons.org/licenses/by/3.0/');
  L.push('- OGA-BY 3.0: https://opengameart.org/content/oga-by-30-faq');
  L.push('- GPL 3.0: https://www.gnu.org/licenses/gpl-3.0.html');
  L.push('- SIL OFL 1.1: https://openfontlicense.org', '');

  L.push('## 1. 캐릭터 스프라이트', '');
  L.push('Universal LPC Spritesheet Character Generator 의 레이어를 합성해 만들었다.');
  L.push('https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator');
  L.push('https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/', '');
  L.push(`전체 작가 (${allAuthors.size}명): ${[...allAuthors].sort((a, b) => a.localeCompare(b)).join(', ')}`, '');
  L.push('### 레이어별 상세', '');
  for (const g of chars) {
    const c = g.credit;
    L.push(`- ${g.name} — ${c.file}`);
    L.push(`  - 작가: ${c.authors.join(', ')}`);
    L.push(`  - 라이선스: ${c.licenses.join(', ')}`);
    if (c.urls?.length) L.push(`  - 출처: ${c.urls.join(' , ')}`);
    if (c.notes) L.push(`  - 비고: ${c.notes.replace(/\s+/g, ' ')}`);
    L.push(`  - 사용 캐릭터: ${[...g.characters].join(', ')}`);
  }
  L.push('');

  L.push('## 2. 타일셋', '');
  L.push('public/assets/tiles/tiles_l1~l3.png 는 아래 타일을 32×32 로 잘라 다시 배치했다 (일부 회색화·경고 줄무늬 추가).', '');
  for (const t of tiles) {
    L.push(`- ${t.title}`);
    L.push(`  - 작가: ${t.authors.join(', ')}`);
    L.push(`  - 라이선스: ${t.licenses.join(', ')}`);
    L.push(`  - 출처: ${t.url}`);
    if (t.note) L.push(`  - 비고: ${t.note}`);
  }
  L.push('');

  L.push('## 3. 폰트', '');
  L.push('- Galmuri (갈무리) — Lee Minseo (quiple)');
  L.push('  - 라이선스: SIL Open Font License 1.1');
  L.push('  - 출처: https://github.com/quiple/galmuri', '');
  L.push('---');
  L.push('이 파일은 tools/build-credits.mjs 가 생성한다 (npm run assets).', '');
  fs.writeFileSync(OUT, L.join('\n'), 'utf8');
  console.log(`[credits] 캐릭터 레이어 출처 ${chars.length}건, 타일 출처 ${tiles.length}건 → ${path.relative(PROJECT_ROOT, OUT)}`);
}

if (isMain(import.meta.url)) buildCredits();
