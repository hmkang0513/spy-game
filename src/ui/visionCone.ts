// 시야 원뿔 렌더러 (AC-25·26·30, 03 §4.1·§7) — 근거리 진한 면, 중거리 보통 면, 원거리 빗금
import Phaser from 'phaser';
import { TILE } from '../config';
import type { Vec2 } from '../types';
import { C } from './theme';

export type ConeLook = 'base' | 'suspicious' | 'alert';

export interface ConeDrawOptions {
  look: ConeLook;
  nearTiles: number;
  midTiles: number;
  /** 외곽선 깜빡임(감지 시작 알림) */
  flash: boolean;
  highContrast: boolean;
  /** 동전 조준 시 반응할 경비 강조 */
  dim?: boolean;
}

const LOOK: Record<ConeLook, { color: number; alpha: number }> = {
  base: { color: C.cone, alpha: 0.26 },
  suspicious: { color: C.suspicion, alpha: 0.3 },
  alert: { color: C.danger, alpha: 0.34 },
};

/** 원점에서 각 끝점까지를 최대 r 로 자른 점 */
function clampRing(origin: Vec2, ends: Vec2[], r: number): Vec2[] {
  return ends.map((e) => {
    const d = Math.hypot(e.x - origin.x, e.y - origin.y);
    const k = d > r ? r / d : 1;
    return { x: origin.x + (e.x - origin.x) * k, y: origin.y + (e.y - origin.y) * k };
  });
}

function fillPoly(g: Phaser.GameObjects.Graphics, pts: Vec2[]): void {
  if (pts.length < 3) return;
  g.beginPath();
  g.moveTo(pts[0]!.x, pts[0]!.y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i]!.x, pts[i]!.y);
  g.closePath();
  g.fillPath();
}

function strokePoly(g: Phaser.GameObjects.Graphics, pts: Vec2[], dashed: boolean): void {
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % pts.length]!;
    if (!dashed) {
      g.lineBetween(a.x, a.y, b.x, b.y);
      continue;
    }
    // 점선 4px / 3px
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    for (let s = 0; s < len; s += 7) {
      const t0 = s / len;
      const t1 = Math.min(1, (s + 4) / len);
      g.lineBetween(a.x + (b.x - a.x) * t0, a.y + (b.y - a.y) * t0, a.x + (b.x - a.x) * t1, a.y + (b.y - a.y) * t1);
    }
  }
}

/** 45° 빗금을 다각형 안쪽에만 그린다 (스캔라인 클리핑, 마스크 없이) */
function hatchPoly(g: Phaser.GameObjects.Graphics, pts: Vec2[], spacing: number): void {
  if (pts.length < 3) return;
  const sums = pts.map((p) => p.x + p.y);
  const min = Math.ceil(Math.min(...sums) / spacing) * spacing;
  const max = Math.max(...sums);
  for (let c = min; c <= max; c += spacing) {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i]!;
      const b = pts[(i + 1) % pts.length]!;
      const sa = sums[i]!;
      const sb = sums[(i + 1) % pts.length]!;
      if ((sa <= c && sb > c) || (sb <= c && sa > c)) {
        const t = (c - sa) / (sb - sa);
        xs.push(a.x + (b.x - a.x) * t);
      }
    }
    xs.sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i += 2) g.lineBetween(xs[i]!, c - xs[i]!, xs[i + 1]!, c - xs[i + 1]!);
  }
}

/** castCone 결과([origin, ...끝점])로 원뿔을 그린다 */
export function drawCone(g: Phaser.GameObjects.Graphics, polygon: Vec2[], o: ConeDrawOptions): void {
  const origin = polygon[0];
  const ends = polygon.slice(1);
  if (!origin || ends.length < 2) return;
  const { color, alpha } = LOOK[o.look];
  const boost = o.highContrast ? 0.15 : 0;
  const k = o.dim ? 0.5 : 1;
  const nearR = o.nearTiles * TILE;
  const midR = o.midTiles * TILE;

  const mid = clampRing(origin, ends, midR);
  // 중거리(근거리 포함) 면 + 근거리 면을 겹쳐 진하게
  g.fillStyle(color, (alpha + boost) * k);
  fillPoly(g, [origin, ...mid]);
  g.fillStyle(color, (alpha * 0.8 + boost) * k);
  fillPoly(g, [origin, ...clampRing(origin, ends, nearR)]);
  // 원거리: 바깥 끝점 + 안쪽 호(역순) = 빗금 구역
  const far = [...ends, ...[...mid].reverse()];
  g.fillStyle(color, (0.1 + boost) * k);
  fillPoly(g, far);
  g.lineStyle(1, color, (0.45 + boost) * k);
  hatchPoly(g, far, 4 * Math.SQRT2);
  // 외곽선 — 경보면 점선, 감지 시작이면 깜빡임
  const outlineAlpha = o.flash ? 1 : 0.8;
  g.lineStyle(o.highContrast ? 2 : 1, o.flash ? 0xffffff : color, outlineAlpha * k);
  strokePoly(g, polygon, o.look === 'alert');
}
