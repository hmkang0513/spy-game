// L2 검문 대화 (AC-40) — 레벨 데이터에 'excuse_l2' 가 없을 때만 쓰는 기본 대화
import type { Dialogue } from '../../types';

export const EXCUSE_DIALOGUE_ID = 'excuse_l2';

/** 초대장(C1-06)을 제시하면 무마, 아니면 경보 */
export function excuseDialogue(guardChar = 'guard_l2_g1'): Dialogue {
  return {
    id: EXCUSE_DIALOGUE_ID,
    entries: [{ node: 'stop' }],
    nodes: {
      stop: {
        id: 'stop',
        speaker: guardChar,
        text: '거기, 잠깐. 여긴 손님 구역이 아닌데요? 신분을 확인하겠습니다.',
        present: { accept: ['C1-06'], success: 'ok', wrong: 'bad', cancel: 'bad' },
      },
      ok: {
        id: 'ok',
        speaker: 'player',
        text: '어머, 화장실을 찾다가 길을 잃었어요. 여기 초대장이요.',
        next: 'ok2',
      },
      ok2: {
        id: 'ok2',
        speaker: guardChar,
        text: '…초대 손님이시군요. 연회장은 저쪽입니다. 다시는 헤매지 마시죠.',
        effects: [{ type: 'excuseAccepted' }],
      },
      bad: {
        id: 'bad',
        speaker: guardChar,
        text: '이게 뭡니까? 수상한데… 거기 서!',
      },
    },
  };
}
