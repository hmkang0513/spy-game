/**
 * 에셋 전체 빌드 (npm run assets)
 *   1) build-characters.mjs — LPC 레이어 합성 → public/assets/characters/*.png
 *   2) build-tiles.mjs      — OGA 타일 잘라내기 → public/assets/tiles/tiles_l{1,2,3}.png
 *   3) build-credits.mjs    — public/assets/CREDITS.md
 * 원본은 네트워크 없이 D:\drive\tools\lpc, D:\drive\tools\lpc-tiles 캐시에서 읽는다
 * (환경변수 ASSET_SOURCE_ROOT 로 상위 폴더 변경 가능). 다시 받는 방법은 각 스크립트 상단 주석 참고.
 */
import { buildCharacters } from './build-characters.mjs';
import { buildTiles } from './build-tiles.mjs';
import { buildCredits } from './build-credits.mjs';

await buildCharacters();
await buildTiles();
buildCredits();
console.log('[assets] 완료');
