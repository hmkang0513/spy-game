// 해상도·타일 크기·조정값 (04_상세설계서 §4). 수치는 플레이테스트로 조정한다.
import type { AlertTimings, ConeParams } from './types';

export const GAME_WIDTH = 640;
export const GAME_HEIGHT = 360;
export const TILE = 32;

export const TUNING = {
  walkSpeed: 120, // px/s (AC-09)
  crouchSpeed: 60,
  interactRangeTiles: 1.5, // AC-12

  cone: {
    fovDeg: 70,
    nearTiles: 2.5,
    midTiles: 5,
    farTiles: 7,
    rays: 32,
    cautionBonusTiles: 1, // AC-35
  },
  /** 구역별 게이지 충전 시간(초). null = 감지 안 됨 (AC-27) */
  fillTime: {
    near: { stand: 0.4, crouch: 0.4 },
    mid: { stand: 1.0, crouch: 2.0 },
    far: { stand: 1.6, crouch: null },
  },
  gaugeDecayPerSec: 0.4, // AC-28
  suspicionThreshold: 0.5, // AC-29

  alert: {
    suspiciousClearSec: 4,
    lostSightSec: 3,
    searchSec: 20,
    cautionSec: 30,
    alertSpeedMul: 1.5,
  },
  catchRangeTiles: 0.75, // AC-36
  hideTransitionSec: 0.3, // AC-39

  lockpick: { periodSec: 1.2, zoneRatio: 0.18, noiseTiles: 6 }, // AC-43, 44
  coin: { maxTiles: 8, noiseTiles: 5, investigateSec: 4, max: 5 }, // AC-46~48
  search: { radiusTiles: 5, points: 3 }, // AC-34

  fadeSec: 0.5, // AC-02
} as const;

export const DEFAULT_CONE: ConeParams = {
  fovDeg: TUNING.cone.fovDeg,
  nearTiles: TUNING.cone.nearTiles,
  midTiles: TUNING.cone.midTiles,
  farTiles: TUNING.cone.farTiles,
};

export const DEFAULT_ALERT_TIMINGS: AlertTimings = {
  suspiciousClearSec: TUNING.alert.suspiciousClearSec,
  lostSightSec: TUNING.alert.lostSightSec,
  searchSec: TUNING.alert.searchSec,
  cautionSec: TUNING.alert.cautionSec,
};

/** 디자인 토큰 — 색 (03_화면설계서 §4.1) */
export const COLORS = {
  bgVoid: '#0E1024',
  bgDeep: '#1B1F3B',
  panelGlass: '#232849',
  panelLine: '#3BB5A8',
  paper: '#F2E8CF',
  paperShade: '#D9C9A3',
  ink: '#2A2335',
  text: '#F4ECD8',
  textDim: '#9C97B5',
  textLocked: '#6B6788',
  accent: '#E3B341',
  accent2: '#3BB5A8',
  stamp: '#C8323C',
  safe: '#56B4E9',
  suspicion: '#E69F00',
  danger: '#D55E00',
  cone: '#F0E442',
} as const;

/** 폰트 패밀리 (03_화면설계서 §4.2) */
export const FONTS = {
  title: 'Galmuri14',
  body: 'Galmuri11',
  bold: 'Galmuri11Bold',
  small: 'Galmuri9',
  tag: 'Galmuri7',
  mono: 'GalmuriMono9',
} as const;
