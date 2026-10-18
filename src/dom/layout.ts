// 캔버스 정수 배율 계산과 DOM 오버레이(#ui-root) 정렬 (03 §0, AC-05)
import { GAME_HEIGHT, GAME_WIDTH } from '../config';

/** floor(min(w/640, h/360)), 최소 1 */
export function integerZoom(): number {
  return Math.max(1, Math.floor(Math.min(window.innerWidth / GAME_WIDTH, window.innerHeight / GAME_HEIGHT)));
}

/** #ui-root 를 캔버스 위에 같은 배율로 겹친다 */
export function layoutUiRoot(): void {
  const root = document.getElementById('ui-root');
  const canvas = document.querySelector<HTMLCanvasElement>('#game canvas');
  if (!root || !canvas) return;
  const rect = canvas.getBoundingClientRect();
  const zoom = Math.max(1, Math.round(rect.width / GAME_WIDTH));
  root.style.left = `${Math.round(rect.left)}px`;
  root.style.top = `${Math.round(rect.top)}px`;
  root.style.width = `${GAME_WIDTH}px`;
  root.style.height = `${GAME_HEIGHT}px`;
  root.style.transform = `scale(${zoom})`;
}
