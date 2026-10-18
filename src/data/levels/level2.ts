// L2 「대사관 파티」 (05_레벨설계서 L2)
// 클리어: 상회 거래 문서(C2-03) + 박사의 메모(C2-04)를 얻고 주방 뒷문으로 탈출 (AC-60).
import type { LevelDef } from '../../types';
import { buildLegend } from '../tiles';

/*
 * 맵 40×30 — 구역
 *  - 북서 주방 x1..10 y1..6 (사물함 은신처 2, 뒷문 (0,3) = 출구)
 *  - 북쪽 대사 집무실 x15..22 y1..6 (서랍), 문 (19,7), 앞에 회전 경비 G3
 *  - 경비 대기실 x31..36 y1..6 (순찰표), 문 (33,7)
 *  - 직원 복도 x1..38 y8..11 (순찰 G2, 커튼 은신처 3). 동쪽이 본 복도, 서쪽은 주방 앞 통로
 *  - 서쪽 정원 x1..12 y13..22 (정지 경비 G1, 울타리·화분), 북쪽 쪽문 (8,12) → 직원 통로
 *  - 중앙 연회장 x14..31 y13..23, 동쪽 화장실 복도 x33..36 y13..22, 끝에 직원 전용 문 (35,12)
 *  - 남쪽 로비 x16..25 y25..28 (접수대), 정문 (20,29)
 */
const level2: LevelDef = {
  id: 2,
  title: '대사관 파티',
  subtitle: '샴페인과 비밀 서류',
  targetTimeSec: 720,
  guardsActive: true,
  briefing: {
    dialogue: 'brief_l2',
    objectivesPreview: [
      '파티에 입장한다',
      '대사 집무실 위치를 알아낸다',
      '직원 구역에 잠입한다',
      '상회 거래 문서를 확보한다',
      '나리에게 박사 정보를 얻는다',
      '주방 뒷문으로 탈출한다',
    ],
    // L1 이월 단서. 정상 진행이면 이미 갖고 있다 (중복 지급 없음, AC-22)
    startClues: ['C1-06'],
  },
  map: {
    tileset: 'tiles_l2',
    legend: buildLegend('tiles_l2'),
    rows: [
      '########################################',
      '#B==B,,B==B####BB_h__BB########dd,,KK###',
      '#,,,,,,,,,,####__dddd__########,h,,,K###',
      'D,,====,,,,####________########,,,,,,###',
      '#,,====,,,,####________########,,TT,,###',
      '#,,,,,,,,,,####________########,,,,,,###',
      '#B,,,,,,,,,####P______P########,,,,,,###',
      '######D############D#####WWWWWW##D######',
      '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
      '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
      '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
      '#,,,,,,,,P,,,,,,,,,,,,,,,,,,,,P,,,,,,,,#',
      '########D##########################D####',
      '#P""""""""""P#P,,,,,======,,,,,P#,,,,#  ',
      '#""""""""""""#,,,,,,,,,,,,,,,,,,#,,,,#  ',
      '#""HHH""HHH""#,,,,,,,,,,,,,,,,,,#,,,,#  ',
      '#""""""""""""#,,hTh,,hTh,,hTh,,,#,,,P#  ',
      '#""""""""""""D,,,,,,,,,,,,,,,,,,#,,,,#  ',
      '#""""""""""""D,,,,,,,,,,,,,,,,,,D,,,,#  ',
      '#""HHH""HHH""#,,,,,,,,,,,,,,,,,,D,,,,#  ',
      '#""""""""""""#,,hTh,,hTh,,hTh,,,#,,,,#  ',
      '#""""""""""""#,,,,,,,,,,,,,,,,,,#,,,,#  ',
      '#P""""""""""P#,,,,,,,,,,,,,,,,,,#,,,P#  ',
      '##############P,,,,,,,,,,,,,,,,P######  ',
      '             #######DD###########       ',
      '               #P,,,,,,===#             ',
      '               #,,,,,,,,,,#             ',
      '               #,,,,,,,,,,#             ',
      '               #P,,,,,,,,P#             ',
      '               #####D######             ',
    ],
  },
  player: { spawn: { tx: 20, ty: 28 }, facing: 'up', character: 'moth_l2' },
  npcs: [
    { id: 'bella', character: 'bella', pos: { tx: 22, ty: 25 }, facing: 'down', dialogue: 'bella' },
    { id: 'crane', character: 'crane', pos: { tx: 24, ty: 18 }, facing: 'down', dialogue: 'crane' },
    { id: 'nari', character: 'nari', pos: { tx: 29, ty: 21 }, facing: 'left', dialogue: 'nari' },
    { id: 'toby', character: 'toby', pos: { tx: 17, ty: 18 }, facing: 'right', dialogue: 'toby' },
    { id: 'madame_crow', character: 'madame_crow', pos: { tx: 28, ty: 14 }, facing: 'down', dialogue: 'madame_crow' },
  ],
  guards: [
    {
      // G1 정지·좌우 회전: 정원 중앙. 울타리 뒤 빗금 구역에서 웅크리기를 처음 배운다
      id: 'G1',
      character: 'guard_l2_g1',
      kind: 'static',
      pos: { tx: 6, ty: 17 },
      facingDeg: 180,
      rotate: { anglesDeg: [180, 0], holdSec: 4 },
      catchLine: '손님, 정원 구경은 여기까지입니다.',
    },
    {
      // G2 순찰: 직원 복도 서→동 → 경비 대기실 → 복도 → 주방 입구 → 복도 복귀 (1바퀴 약 40초)
      id: 'G2',
      character: 'guard_l2_g2',
      kind: 'patrol',
      pos: { tx: 13, ty: 10 },
      facingDeg: 0,
      patrol: {
        waypoints: [
          { tx: 13, ty: 10 },
          { tx: 36, ty: 10 },
          { tx: 33, ty: 9 },
          { tx: 33, ty: 3 },
          { tx: 33, ty: 9 },
          { tx: 6, ty: 9 },
        ],
        waitSec: 2,
      },
      catchLine: '직원 구역에서 뭘 찾으십니까?',
    },
    {
      // G3 회전: 집무실 문 앞. 서→위→동 180° 구간을 6초 주기로 훑는다. 동쪽을 볼 때 문 쪽 빈틈
      id: 'G3',
      character: 'guard_l2_g3',
      kind: 'rotate',
      pos: { tx: 21, ty: 10 },
      facingDeg: 180,
      rotate: { anglesDeg: [180, 270, 0, 270], holdSec: 1.5 },
      catchLine: '대사님 방엔 아무도 못 들어갑니다.',
    },
  ],
  interactables: [
    // 은신처: 직원 복도 커튼 3, 주방 사물함 2, 정원 대형 화분 2
    { id: 'curtain_1', kind: 'hide', pos: { tx: 26, ty: 8 } },
    { id: 'curtain_2', kind: 'hide', pos: { tx: 29, ty: 8 } },
    { id: 'curtain_3', kind: 'hide', pos: { tx: 38, ty: 11 } },
    { id: 'locker_1', kind: 'hide', pos: { tx: 10, ty: 5 } },
    { id: 'locker_2', kind: 'hide', pos: { tx: 10, ty: 6 } },
    { id: 'garden_plant_1', kind: 'hide', pos: { tx: 2, ty: 13 } },
    { id: 'garden_plant_2', kind: 'hide', pos: { tx: 11, ty: 22 } },
    // 조사
    { id: 'patrol_sheet', kind: 'inspect', pos: { tx: 31, ty: 2 }, dialogue: 'insp_patrol_sheet' },
    { id: 'office_drawer', kind: 'inspect', pos: { tx: 19, ty: 3 }, dialogue: 'insp_drawer' },
    // 출구: 주방 뒷문
    {
      id: 'exit_backdoor',
      kind: 'exit',
      pos: { tx: 0, ty: 3 },
      requires: ['C2-03', 'C2-04'],
      blockedText: '아직 할 일이 남았다.',
    },
  ],
  clues: [
    // L1 이월 단서 (검문·입장, 까마귀 부인 선택지에서 참조)
    {
      id: 'C1-05',
      name: "상회 화물선 '흑깃호'",
      kind: 'document',
      description: '까마귀 상회의 화물선. 밤에만 검은 깃발을 달고 입항한다.',
      source: '페퍼에게서 / 블루 앵커 창가석',
      optional: true,
      carryOver: true,
    },
    {
      id: 'C1-06',
      name: '대사관 파티 초대장',
      kind: 'item',
      description: '벨모라 대사관 가든 파티 초대장. 손님 구역에서 들키면 내밀어 보자.',
      source: '페퍼에게서 / 블루 앵커 창가석',
      carryOver: true,
    },
    // L2 단서
    {
      id: 'C2-01',
      name: '경비 순찰표',
      kind: 'document',
      description: "'복도 → 대기실 → 복도 → 주방 앞. 1바퀴 약 40초.' 커피 얼룩이 묻어 있다.",
      source: '경비 대기실 책상',
      optional: true,
    },
    {
      id: 'C2-02',
      name: '비서의 걱정',
      kind: 'person',
      description: '나리: 주노아 박사가 연구실을 어딘가 지하로 옮겼다. 연락이 뜸해 걱정이다.',
      source: '나리에게서 / 연회장',
    },
    {
      id: 'C2-03',
      name: '상회 거래 문서',
      kind: 'document',
      description: "'까마귀 상회 — 오로라 칩 인수 확약서. 장소: 소금곶 통조림 공장 지하.'",
      source: '대사 집무실 서랍',
      carryOver: true,
    },
    {
      id: 'C2-04',
      name: '박사의 메모',
      kind: 'document',
      description: "주노아 박사의 버릇: '금고 번호는 늘 첫 실험 날로 해 둔다.'",
      source: '나리에게서 / 연회장',
      carryOver: true,
    },
    {
      id: 'C2-05',
      name: '까마귀 부인의 명함',
      kind: 'item',
      description: '검은 깃털이 찍힌 명함. 상회 사람들에게 보여 주면 알아서 길을 비킨다.',
      source: '까마귀 부인에게서 / 연회장',
      optional: true,
      carryOver: true,
    },
    {
      id: 'C2-06',
      name: '토비의 귀띔',
      kind: 'person',
      description: '토비: 9시 종이 울리면 복도 경비가 주방에 간식을 먹으러 간다.',
      source: '토비에게서 / 연회장',
      optional: true,
    },
  ],
  combos: [],
  objectives: [
    { id: 'l2_enter', text: '파티 입장하기' },
    { id: 'l2_find_office', text: '대사 집무실 위치 알아내기' },
    { id: 'l2_infiltrate', text: '직원 구역 잠입하기' },
    { id: 'l2_get_doc', text: '상회 거래 문서 확보하기' },
    { id: 'l2_nari', text: '나리에게 박사 정보 얻기' },
    { id: 'l2_escape', text: '주방 뒷문으로 탈출하기' },
  ],
  checkpoints: [
    // CP2-1 정원 입구 (연회장 쪽 문 앞)
    { id: 'CP2-1', area: { tx: 13, ty: 16, w: 2, h: 4 }, spawn: { tx: 14, ty: 17 } },
    // CP2-2 직원 전용 문 안쪽
    { id: 'CP2-2', area: { tx: 33, ty: 10, w: 5, h: 3 }, spawn: { tx: 35, ty: 11 } },
    // CP2-3 문서 획득 직후 (집무실 안, 문 앞)
    { id: 'CP2-3', area: { tx: 15, ty: 1, w: 8, h: 6 }, spawn: { tx: 19, ty: 6 } },
  ],
  zones: [
    { id: 'lobby', kind: 'guest', area: { tx: 16, ty: 24, w: 10, h: 6 }, label: '로비' },
    { id: 'banquet', kind: 'guest', area: { tx: 14, ty: 13, w: 18, h: 11 }, label: '연회장' },
    { id: 'garden', kind: 'guest', area: { tx: 1, ty: 13, w: 12, h: 10 }, label: '정원' },
    { id: 'restroom', kind: 'guest', area: { tx: 33, ty: 13, w: 4, h: 10 }, label: '화장실 복도' },
    { id: 'staff_corridor', kind: 'staff', area: { tx: 1, ty: 8, w: 38, h: 4 }, label: '직원 복도' },
    { id: 'kitchen', kind: 'staff', area: { tx: 1, ty: 1, w: 10, h: 6 }, label: '주방' },
    { id: 'office', kind: 'staff', area: { tx: 15, ty: 1, w: 8, h: 6 }, label: '대사 집무실' },
    { id: 'guard_room', kind: 'staff', area: { tx: 31, ty: 1, w: 6, h: 6 }, label: '경비 대기실' },
  ],
  dialogues: [
    // ── 브리핑 ──
    {
      id: 'brief_l2',
      entries: [{ node: 'b1' }],
      nodes: {
        b1: { id: 'b1', speaker: 'chief', text: '파티 좋아하나, 모스? 미안하지만 이번에도 일이다.', next: 'b2' },
        b2: {
          id: 'b2',
          speaker: 'chief',
          text: '벨모라 대사관 가든 파티. 까마귀 상회가 거기서 칩 거래를 확정한다.',
          next: 'b3',
        },
        b3: {
          id: 'b3',
          speaker: 'chief',
          text: '대사 집무실에서 거래 문서를 빼 와. 직원 구역은 경비가 지킨다.',
          next: 'b4',
        },
        b4: {
          id: 'b4',
          speaker: 'chief',
          text: '손님 구역에서 들키면 초대장을 내밀어. 단, 같은 경비에겐 한 번만 통한다.',
          next: 'b5',
        },
        b5: {
          id: 'b5',
          speaker: 'chief',
          text: '새 기술 두 개. C나 Shift로 몸을 낮추고, 커튼이나 화분 옆에선 E로 숨어.',
          next: 'b6',
        },
        b6: { id: 'b6', speaker: 'player', text: '드레스 코드는요?', next: 'b7' },
        b7: { id: 'b7', speaker: 'chief', text: '들키지 않는 옷. 행운을 빈다.' },
      },
    },
    // ── 벨라 (접수원) ──
    {
      id: 'bella',
      entries: [{ when: { flags: ['entered_party'] }, node: 'bella_after' }, { node: 'bella_hello' }],
      nodes: {
        bella_hello: {
          id: 'bella_hello',
          speaker: 'bella',
          text: '벨모라 대사관에 오신 걸 환영합니다. 초대장 확인하겠습니다.',
          summaryText: '초대장 확인하겠습니다.',
          choices: [
            { text: '윤하늘입니다. 명단에 있을 거예요.', next: 'bella_name' },
            { text: '여기 초대장이요.', next: 'bella_ok', requires: ['C1-06'] },
          ],
        },
        bella_name: {
          id: 'bella_name',
          speaker: 'bella',
          text: "윤… 하늘… 없네요. '하늘'님은 구름 사이 명단에 계신가 봐요.",
          next: 'bella_name2',
        },
        bella_name2: {
          id: 'bella_name2',
          speaker: 'bella',
          text: '초대장 없이는 들어가실 수 없어요. 규정이라서요, 죄송해요.',
          next: 'bella_hello',
        },
        bella_ok: {
          id: 'bella_ok',
          speaker: 'bella',
          text: '확인했습니다. 벨모라의 밤을 즐기세요!',
          effects: [
            { type: 'setFlag', flag: 'entered_party' },
            { type: 'completeObjective', objective: 'l2_enter' },
          ],
          next: 'bella_ok2',
        },
        bella_ok2: {
          id: 'bella_ok2',
          speaker: 'bella',
          text: '연회장은 정면, 정원은 왼편이에요. 직원 구역만 피해 주세요.',
        },
        bella_after: {
          id: 'bella_after',
          speaker: 'bella',
          text: '필요하신 게 있으세요? 화장실은 연회장 오른쪽 복도 끝이에요.',
        },
      },
    },
    // ── 오스왈드 크레인 대사 ──
    {
      id: 'crane',
      entries: [{ when: { clues: ['C2-03'] }, node: 'crane_after' }, { node: 'crane_hello' }],
      nodes: {
        crane_hello: {
          id: 'crane_hello',
          speaker: 'crane',
          text: '오오, 젊은 손님! 벨모라의 밤에 온 걸 환영하오. 허허.',
          summaryText: '즐기고 있소, 젊은 손님?',
          choices: [
            { text: '정원이 정말 멋지네요.', next: 'crane_garden' },
            { text: '대사님 집무실은 어디예요?', next: 'crane_office' },
            { text: '즐거운 파티 되세요.', next: 'crane_bye' },
          ],
        },
        crane_garden: {
          id: 'crane_garden',
          speaker: 'crane',
          text: '그렇지! 울타리는 내가 직접 골랐다오. 경비가 좀 무뚝뚝한 게 흠이지만.',
          next: 'crane_hello',
        },
        crane_office: {
          id: 'crane_office',
          speaker: 'crane',
          text: '집무실? 직원 구역 안쪽, 복도 한가운데라오. 서랍엔 비밀 서류뿐이지!',
          effects: [
            { type: 'setFlag', flag: 'knows_office' },
            { type: 'completeObjective', objective: 'l2_find_office' },
          ],
          next: 'crane_office2',
        },
        crane_office2: {
          id: 'crane_office2',
          speaker: 'crane',
          text: '…방금 그건 농담이오, 농담. 허허허. 샴페인이 좀 과했나.',
          next: 'crane_hello',
        },
        crane_bye: {
          id: 'crane_bye',
          speaker: 'crane',
          text: '그대도! 장미 향을 꼭 맡고 가시오.',
        },
        crane_after: {
          id: 'crane_after',
          speaker: 'crane',
          text: '어째 아까보다 표정이 밝구려. 샴페인 덕인가? 허허.',
        },
      },
    },
    // ── 나리 (박사의 비서) ──
    {
      id: 'nari',
      entries: [
        { when: { clues: ['C2-04'] }, node: 'nari_after' },
        { when: { clues: ['C2-02'] }, node: 'nari_again' },
        { node: 'nari_hello' },
      ],
      nodes: {
        nari_hello: {
          id: 'nari_hello',
          speaker: 'nari',
          text: '아… 실례해요. 사람을 좀 찾고 있어서요.',
          next: 'nari_hub',
        },
        nari_again: {
          id: 'nari_again',
          speaker: 'nari',
          text: '또 오셨네요. 혹시… 뭔가 알아내셨어요?',
          next: 'nari_hub',
        },
        nari_hub: {
          id: 'nari_hub',
          speaker: 'nari',
          text: '(태블릿을 꼭 쥐고 있다.)',
          choices: [
            { text: '무슨 일 있어요?', next: 'nari_worry', showIf: { notClues: ['C2-02'] } },
            { text: '이 문서를 보세요.', next: 'nari_doc', requires: ['C2-03'], showIf: { clues: ['C2-02'] } },
            { text: '실례했어요.', next: 'nari_bye' },
          ],
        },
        nari_worry: {
          id: 'nari_worry',
          speaker: 'nari',
          text: '저는 주노아 박사님 비서예요. 요즘 박사님 연락이 뜸해서요.',
          next: 'nari_worry2',
        },
        nari_worry2: {
          id: 'nari_worry2',
          speaker: 'nari',
          text: '연구실을 어딘가 지하로 옮겼다는데, 어딘지 알려 주질 않으세요.',
          effects: [{ type: 'giveClue', clue: 'C2-02' }],
          next: 'nari_worry3',
        },
        nari_worry3: {
          id: 'nari_worry3',
          speaker: 'nari',
          text: '여기 오면 누가 알까 싶었는데… 다들 샴페인 얘기뿐이네요.',
          next: 'nari_hub',
        },
        nari_doc: {
          id: 'nari_doc',
          speaker: 'nari',
          text: "'소금곶 통조림 공장 지하, 오로라 칩 인수'…? 거기가 박사님 연구소예요!",
          next: 'nari_doc2',
        },
        nari_doc2: {
          id: 'nari_doc2',
          speaker: 'nari',
          text: '상회가 박사님을 노리고 있었군요. …당신을 믿을게요.',
          next: 'nari_memo',
        },
        nari_memo: {
          id: 'nari_memo',
          speaker: 'nari',
          text: "박사님 버릇이 있어요. '금고 번호는 늘 첫 실험 날로 해 둔다.' 메모해 두세요.",
          effects: [
            { type: 'giveClue', clue: 'C2-04' },
            { type: 'completeObjective', objective: 'l2_nari' },
          ],
          next: 'nari_memo2',
        },
        nari_memo2: {
          id: 'nari_memo2',
          speaker: 'nari',
          text: '박사님 연구, 꼭 지켜 주세요. 저는 아무것도 못 본 걸로 할게요.',
        },
        nari_bye: {
          id: 'nari_bye',
          speaker: 'nari',
          text: '네… 좋은 저녁 되세요.',
        },
        nari_after: {
          id: 'nari_after',
          speaker: 'nari',
          text: '박사님 메모, 잘 간직해 주세요. 그리고… 조심하세요.',
        },
      },
    },
    // ── 토비 (웨이터) ──
    {
      id: 'toby',
      entries: [{ node: 'toby_hello' }],
      nodes: {
        toby_hello: {
          id: 'toby_hello',
          speaker: 'toby',
          text: '샴페인 한 잔 하시겠어요? 쟁반이 무거워서요, 하하.',
          summaryText: '샴페인 더 드릴까요?',
          choices: [
            { text: '한 잔 주세요.', next: 'toby_drink' },
            { text: '경비 순찰표를 봤어요.', next: 'toby_patrol', requires: ['C2-01'] },
            { text: '수고하세요.', next: 'toby_bye' },
          ],
        },
        toby_drink: {
          id: 'toby_drink',
          speaker: 'toby',
          text: '여기요! …쉿, 손님한테만 하나 알려 드릴까요?',
          next: 'toby_tip',
        },
        toby_tip: {
          id: 'toby_tip',
          speaker: 'toby',
          text: '9시 종이 울리면 복도 경비 아저씨가 주방에 간식 먹으러 와요. 매일요.',
          effects: [{ type: 'giveClue', clue: 'C2-06' }],
          next: 'toby_hello',
        },
        toby_patrol: {
          id: 'toby_patrol',
          speaker: 'toby',
          text: '헉, 그걸 어떻게 보셨어요? …좋아요, 그럼 이것도요.',
          next: 'toby_locker',
        },
        toby_locker: {
          id: 'toby_locker',
          speaker: 'toby',
          text: '주방 사물함 두 번째는 고장 나서 안 잠겨요. 숨기 딱 좋죠. 제 땡땡이 장소예요.',
          effects: [{ type: 'setFlag', flag: 'toby_locker_hint' }],
          next: 'toby_hello',
        },
        toby_bye: {
          id: 'toby_bye',
          speaker: 'toby',
          text: '즐거운 시간 되세요! 쟁반 조심하세요, 제가 아니라 손님이요.',
        },
      },
    },
    // ── 까마귀 부인 (상회 간부) ──
    {
      id: 'madame_crow',
      entries: [
        { when: { clues: ['C2-05'] }, node: 'crow_after' },
        { when: { flags: ['crow_complimented'] }, node: 'crow_second' },
        { node: 'crow_hello' },
      ],
      nodes: {
        crow_hello: {
          id: 'crow_hello',
          speaker: 'madame_crow',
          text: '(부채 너머로) …처음 보는 얼굴이네. 누가 초대했지?',
          summaryText: '…또 너야?',
          choices: [
            { text: '드레스가 정말 멋지세요.', next: 'crow_compliment' },
            { text: '흑깃호는 잘 들어왔나요?', next: 'crow_ship', requires: ['C1-05'] },
            { text: '실례했습니다.', next: 'crow_bye' },
          ],
        },
        crow_compliment: {
          id: 'crow_compliment',
          speaker: 'madame_crow',
          text: '흥, 보는 눈은 있네. 깃털은 진짜야. 가짜는 질색이거든.',
          effects: [{ type: 'setFlag', flag: 'crow_complimented' }],
          next: 'crow_compliment2',
        },
        crow_compliment2: {
          id: 'crow_compliment2',
          speaker: 'madame_crow',
          text: '다음에 또 마주치면… 얘기 정도는 해 주지.',
        },
        crow_ship: {
          id: 'crow_ship',
          speaker: 'madame_crow',
          text: '…어머, 우리 쪽 사람이었어? 진작 말하지 그랬어.',
          next: 'crow_card',
        },
        crow_card: {
          id: 'crow_card',
          speaker: 'madame_crow',
          text: '공장 쪽에 볼일 있으면 이 명함을 보여. 다들 알아서 길을 비킬 거야.',
          effects: [{ type: 'giveClue', clue: 'C2-05' }],
          next: 'crow_card2',
        },
        crow_card2: {
          id: 'crow_card2',
          speaker: 'madame_crow',
          text: '그럼 공장에서 보자고, 깃털 친구.',
        },
        crow_second: {
          id: 'crow_second',
          speaker: 'madame_crow',
          text: '또 왔네? 칭찬은 한 번이면 충분한데. …뭐, 싫진 않아.',
          next: 'crow_second2',
        },
        crow_second2: {
          id: 'crow_second2',
          speaker: 'madame_crow',
          text: '마음에 들었어. 이거 줄게. 공장 사람들한테는 이거면 통해.',
          next: 'crow_card',
        },
        crow_bye: {
          id: 'crow_bye',
          speaker: 'madame_crow',
          text: '그래, 가 봐. 까마귀는 낯선 새를 오래 보지 않아.',
        },
        crow_after: {
          id: 'crow_after',
          speaker: 'madame_crow',
          text: '명함 잃어버리지 마. 재발급은 안 해 줘.',
        },
      },
    },
    // ── 경비 검문 (AC-40). 손님 구역에서 발각되면 시작. 화자는 붙잡은 경비로 바꿔 표시해도 된다 ──
    {
      id: 'excuse_l2',
      entries: [{ node: 'ex_start' }],
      nodes: {
        ex_start: {
          id: 'ex_start',
          speaker: 'guard_l2_g1',
          text: '잠깐! 여긴 손님 구역이 아닌데요? 뭐 하시는 분이죠?',
          next: 'ex_present',
        },
        ex_present: {
          id: 'ex_present',
          speaker: 'guard_l2_g1',
          text: '초대장 있으시면 보여 주시죠.',
          present: { accept: ['C1-06'], success: 'ex_ok', wrong: 'ex_wrong', cancel: 'ex_cancel' },
        },
        ex_wrong: {
          id: 'ex_wrong',
          speaker: 'guard_l2_g1',
          text: '그건 초대장이 아닌데요. 다시 보여 주세요.',
          next: 'ex_present',
        },
        ex_ok: {
          id: 'ex_ok',
          speaker: 'player',
          text: '화장실을 찾다가… 길을 잃었어요. 이 집, 너무 넓네요.',
          next: 'ex_ok2',
        },
        ex_ok2: {
          id: 'ex_ok2',
          speaker: 'guard_l2_g1',
          text: '화장실은 연회장 오른쪽 복도입니다. 이쪽으로 모시죠.',
          effects: [{ type: 'excuseAccepted' }],
        },
        ex_cancel: {
          id: 'ex_cancel',
          speaker: 'guard_l2_g1',
          text: '초대장도 없이요? 같이 좀 가 주셔야겠습니다!',
          effects: [{ type: 'triggerAlarm' }],
        },
      },
    },
    // ── 조사: 경비 순찰표 ──
    {
      id: 'insp_patrol_sheet',
      entries: [{ when: { clues: ['C2-01'] }, node: 'ps_done' }, { node: 'ps_1' }],
      nodes: {
        ps_1: {
          id: 'ps_1',
          speaker: 'narrator',
          text: '책상 위에 경비 순찰표가 놓여 있다. 커피 얼룩이 동그랗다.',
          effects: [{ type: 'completeObjective', objective: 'l2_infiltrate' }],
          next: 'ps_2',
        },
        ps_2: {
          id: 'ps_2',
          speaker: 'narrator',
          text: "'복도 → 대기실 → 복도 → 주방 앞. 1바퀴 약 40초.' 친절하기도 하지.",
          effects: [{ type: 'giveClue', clue: 'C2-01' }],
          next: 'ps_3',
        },
        ps_3: {
          id: 'ps_3',
          speaker: 'player',
          text: '복도 경비의 동선이 머릿속에 그려진다.',
        },
        ps_done: {
          id: 'ps_done',
          speaker: 'narrator',
          text: '이미 외웠다. 커피 얼룩 위치까지.',
        },
      },
    },
    // ── 조사: 대사 집무실 서랍 ──
    {
      id: 'insp_drawer',
      entries: [{ when: { clues: ['C2-03'] }, node: 'dr_done' }, { node: 'dr_1' }],
      nodes: {
        dr_1: {
          id: 'dr_1',
          speaker: 'narrator',
          text: '대사의 책상 서랍. 잠겨 있지 않다. 참 대사다운 보안이다.',
          next: 'dr_2',
        },
        dr_2: {
          id: 'dr_2',
          speaker: 'narrator',
          text: "'까마귀 상회 — 오로라 칩 인수 확약서. 장소: 소금곶 통조림 공장 지하.'",
          effects: [
            { type: 'giveClue', clue: 'C2-03' },
            { type: 'completeObjective', objective: 'l2_find_office' },
            { type: 'completeObjective', objective: 'l2_infiltrate' },
            { type: 'completeObjective', objective: 'l2_get_doc' },
          ],
          next: 'dr_3',
        },
        dr_3: {
          id: 'dr_3',
          speaker: 'player',
          text: '찾았다. 이 장소를 아는 사람이 연회장에 있을지도.',
        },
        dr_done: {
          id: 'dr_done',
          speaker: 'narrator',
          text: '남은 건 사탕 껍질뿐이다. 대사도 단 걸 좋아하나 보다.',
        },
      },
    },
  ],
};

export default level2;
