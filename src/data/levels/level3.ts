// L3 「지하 연구소」 (05_레벨설계서 L3)
// 클리어: 금고에서 오로라 칩(C3-06)을 꺼내고 화물 엘리베이터 또는 비상 통로로 탈출 (AC-61).
// 칩을 꺼내면 flag 'chip_taken' 이 켜진다 → 프론트가 체크포인트 저장 후 무음 경보를 건다.
import type { LevelDef } from '../../types';
import { buildLegend } from '../tiles';

/*
 * 맵 40×30 — 구역
 *  - 남쪽 하역장 x14..25 y21..28 (시작, CP3-1, 말순 여사, 상자 은신처)
 *  - 창고 복도 T자: 가로 x4..36 y13..15 + 세로 x18..20 y16..20 (순찰 G4, 상자 은신처 4)
 *  - 서쪽 휴게실 x1..8 y17..22 (모모, 자판기), 문 (6,16)
 *  - 서북 연구실 A x1..8 y4..11 (실험일지), 잠긴 문 (6,12) 3핀
 *  - 동쪽 빈 창고 x27..30 y17..21 (개구부 y16), 경비실 x32..38 y17..22 (근무표), 문 (33,16)
 *    정지 경비 G5 가 경비실 문 앞 (33,15) 에서 서쪽을 본다 → 빈 창고 개구부에 동전을 던져 유인
 *  - 북쪽 금고실 대기 복도 x22..35 y8..11 (회전 경비 G6 브루노), 입구 x33..35 y12
 *  - 금고실 x24..31 y1..6, 카드 문/4핀 자물쇠 (27,7)
 *  - 북동 화물 엘리베이터 x34..38 y2..6 (출구), 문 (35,7)
 *  - 북서 비상 통로: 잠긴 문 (21,9) 3핀 → x12..20 y8..9 → x10..11 y3..9 → x1..11 y1..2 → 출구 (0,1)
 */
const level3: LevelDef = {
  id: 3,
  title: '지하 연구소',
  subtitle: '동전 하나, 자물쇠 하나',
  targetTimeSec: 900,
  guardsActive: true,
  briefing: {
    dialogue: 'brief_l3',
    objectivesPreview: [
      '연구소에 진입한다',
      '박사의 연구 기록을 찾는다',
      '금고 번호를 추리한다',
      '금고실에 들어간다',
      '오로라 칩을 확보한다',
      '연구소를 탈출한다',
    ],
    // L2 이월 필수 단서. 정상 진행이면 이미 갖고 있다 (중복 지급 없음)
    startClues: ['C2-04'],
  },
  map: {
    tileset: 'tiles_l3',
    legend: buildLegend('tiles_l3'),
    rows: [
      '#############          ##########       ',
      'D;;;;;;;;;;;#          #B,,SS,,B########',
      '#;;;;;;;;;;;#          #,,,,,,,,##;EEE;#',
      '##########;;#          #,,,,,,,,##;EEE;#',
      '#MM,BB,MM#;;#          #,,,,,,,,##;EEE;#',
      '#,,,,,,,,#;;#          #,,,,,,,,##;;;;;#',
      '#,,ddd,,,#;;#          #M,,,,,,M##;;;;;#',
      '#,,,,,,,,#;;###############D#######D####',
      '#,,,,,,,,#;;;;;;;;;;;#B;;;;;;;;;;;;;#   ',
      '#M,,,,,,M#;;;;;;;;;;;D;;;;;;;;;;;;;;#   ',
      '#,,,,,,,,#############;;;;;;;;;;;;;;#   ',
      '#B,,,,,,B#           #C;;;;;;;;;;;;;#   ',
      '######D##########################;;;##  ',
      '   #;;;;;C;;;;;;;;;;;;;C;;;;;;;;;;;;;#  ',
      '   #;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;#  ',
      '   #;;;;;;;;;;C;;;;;;;;;;;;;;;;;;;;;C#  ',
      '######D###########;;;######DDD###D######',
      '#MM,,,,BB#       #;;;#    #;;;;#;;;;dd;#',
      '#,,,,,,,,#       #;;;#    #;;;;#;;;;;h;#',
      '#,,TT,,,,#       #;;;#    #;;;;#;;;;;;;#',
      '#,,hh,,,,#   #####;;;######;;;;#;;;;;;;#',
      '#,,,,,,,,#   #CC;;;;;;;;CC#;;;C#;;;;;;;#',
      '#,,,,,,,,#   #C;;;;;;;;;;C######KK;;;;K#',
      '##########   #;;;;;;;;;;;;#    #########',
      '             #;;;;;;;;;;;;#             ',
      '             #;;;CC;;;CC;;#             ',
      '             #;;;;;;;;;;;;#             ',
      '             #;;;;;;;;;;;;#             ',
      '             #CCC;;;;;;CCC#             ',
      '             ##############             ',
    ],
  },
  player: { spawn: { tx: 20, ty: 27 }, facing: 'up', character: 'moth_l3' },
  npcs: [
    { id: 'malsun', character: 'malsun', pos: { tx: 16, ty: 24 }, facing: 'right', dialogue: 'malsun' },
    { id: 'momo', character: 'momo', pos: { tx: 5, ty: 21 }, facing: 'up', dialogue: 'momo' },
  ],
  guards: [
    {
      // G4 순찰: 창고 복도 T자 왕복 (세로 → 서쪽 끝 → 동쪽 → 세로), 1바퀴 약 30초
      id: 'G4',
      character: 'guard_l3_g4',
      kind: 'patrol',
      pos: { tx: 19, ty: 18 },
      facingDeg: 270,
      patrol: {
        waypoints: [
          { tx: 19, ty: 18 },
          { tx: 19, ty: 14 },
          { tx: 7, ty: 14 },
          { tx: 30, ty: 14 },
        ],
        waitSec: 1.5,
      },
      catchLine: '어이, 거기! 하역 시간 끝났어!',
    },
    {
      // G5 정지: 경비실 문 앞에서 서쪽(연구실 A 방향)을 응시. 빈 창고 쪽 소음에 유인된다
      id: 'G5',
      character: 'guard_l3_g5',
      kind: 'static',
      pos: { tx: 33, ty: 15 },
      facingDeg: 180,
      catchLine: '경비실 앞에서 얼쩡거리면 곤란하지.',
    },
    {
      // G6 브루노 회전: 대기 복도 중앙, 270° 구간을 8초 주기로 훑는다. 8초마다 2초 하품 (C3-05)
      id: 'G6',
      character: 'bruno',
      kind: 'rotate',
      pos: { tx: 28, ty: 10 },
      facingDeg: 180,
      rotate: { anglesDeg: [180, 270, 0, 90], holdSec: 2 },
      blink: { everySec: 8, closedSec: 2 },
      catchLine: '오늘 야근 확정이군.',
    },
  ],
  interactables: [
    // 은신처: 하역장 상자 2, 창고 복도 상자 4
    { id: 'crate_dock_1', kind: 'hide', pos: { tx: 16, ty: 21 } },
    { id: 'crate_dock_2', kind: 'hide', pos: { tx: 19, ty: 25 } },
    { id: 'crate_hall_1', kind: 'hide', pos: { tx: 10, ty: 13 } },
    { id: 'crate_hall_2', kind: 'hide', pos: { tx: 15, ty: 15 } },
    { id: 'crate_hall_3', kind: 'hide', pos: { tx: 24, ty: 13 } },
    { id: 'crate_hall_4', kind: 'hide', pos: { tx: 30, ty: 13 } },
    // 잠긴 문
    { id: 'door_lab_a', kind: 'lockedDoor', pos: { tx: 6, ty: 12 }, pins: 3 },
    { id: 'door_vault', kind: 'lockedDoor', pos: { tx: 27, ty: 7 }, pins: 4, opensWithClue: 'C3-03' },
    { id: 'door_emergency', kind: 'lockedDoor', pos: { tx: 21, ty: 9 }, pins: 3, revealedBy: 'C3-04' },
    // 조사
    { id: 'lab_journal', kind: 'inspect', pos: { tx: 4, ty: 7 }, dialogue: 'insp_journal' },
    { id: 'duty_roster', kind: 'inspect', pos: { tx: 36, ty: 18 }, dialogue: 'insp_roster' },
    { id: 'vending', kind: 'inspect', pos: { tx: 1, ty: 18 }, dialogue: 'insp_vending' },
    { id: 'safe', kind: 'inspect', pos: { tx: 27, ty: 2 }, dialogue: 'insp_safe' },
    // 동전 (말순 여사 3 + 맵 2 = 최대 5, AC-46)
    { id: 'coin_1', kind: 'coinPickup', pos: { tx: 7, ty: 21 } },
    { id: 'coin_2', kind: 'coinPickup', pos: { tx: 24, ty: 26 } },
    // 출구
    {
      id: 'exit_elevator',
      kind: 'exit',
      pos: { tx: 36, ty: 3 },
      requires: ['C3-06'],
      blockedText: '칩 없이 돌아갈 순 없다. 국장님 사탕이 걸려 있다.',
    },
    {
      id: 'exit_emergency',
      kind: 'exit',
      pos: { tx: 0, ty: 1 },
      requires: ['C3-06'],
      revealedBy: 'C3-04',
      blockedText: '칩 없이 돌아갈 순 없다.',
    },
  ],
  clues: [
    // L2 이월 단서
    {
      id: 'C2-04',
      name: '박사의 메모',
      kind: 'document',
      description: "주노아 박사의 버릇: '금고 번호는 늘 첫 실험 날로 해 둔다.'",
      source: '나리에게서 / 벨모라 대사관',
      carryOver: true,
    },
    {
      id: 'C2-05',
      name: '까마귀 부인의 명함',
      kind: 'item',
      description: '검은 깃털이 찍힌 명함. 상회 사람들에게 보여 주면 알아서 길을 비킨다.',
      source: '까마귀 부인에게서 / 벨모라 대사관',
      optional: true,
      carryOver: true,
    },
    // L3 단서
    {
      id: 'C3-01',
      name: '실험일지',
      kind: 'document',
      description: "'작성 시작 2월 2일.' … '3월 21일, 첫 실험 성공!' 밑줄이 세 번 그어져 있다.",
      source: '연구실 A 책상',
    },
    {
      id: 'C3-02',
      name: '금고 번호',
      kind: 'document',
      description: '첫 실험 날 = 3월 21일. 금고 번호는 0321.',
      source: '단서 연결: 박사의 메모 + 실험일지',
    },
    {
      id: 'C3-03',
      name: '연구원 출입증',
      kind: 'item',
      description: '금고실 카드 문을 바로 여는 출입증. 사진 속 모모가 울상이다.',
      source: '모모에게서 / 휴게실',
      optional: true,
    },
    {
      id: 'C3-04',
      name: '비상 통로 소문',
      kind: 'person',
      description: '말순 여사: 북서쪽에 잠긴 비상 통로가 있다. 다들 잊어버렸다.',
      source: '말순 여사에게서 / 하역장',
      optional: true,
    },
    {
      id: 'C3-05',
      name: '경비실 근무표',
      kind: 'document',
      description: "'브루노 대장: 8초마다 하품, 2초간 눈 감음. 고칠 것.' 아무도 안 고쳤다.",
      source: '경비실 벽',
      optional: true,
    },
    {
      id: 'C3-06',
      name: '오로라 칩',
      kind: 'item',
      description: '손톱만 한 초소형 배터리. 주노아 박사의 역작. 은은한 오로라 빛이 돈다.',
      source: '금고실 금고',
    },
  ],
  combos: [{ a: 'C2-04', b: 'C3-01', result: 'C3-02' }],
  objectives: [
    { id: 'l3_enter', text: '연구소 진입하기' },
    { id: 'l3_research', text: '박사의 연구 기록 찾기' },
    { id: 'l3_deduce', text: '금고 번호 추리하기' },
    { id: 'l3_vault', text: '금고실 진입하기' },
    { id: 'l3_chip', text: '오로라 칩 확보하기' },
    { id: 'l3_escape', text: '연구소 탈출하기' },
  ],
  checkpoints: [
    // CP3-1 하역장
    { id: 'CP3-1', area: { tx: 14, ty: 21, w: 12, h: 8 }, spawn: { tx: 20, ty: 27 } },
    // CP3-2 연구실 A 앞 (자물쇠 첫 사용 직전)
    { id: 'CP3-2', area: { tx: 4, ty: 13, w: 5, h: 3 }, spawn: { tx: 6, ty: 14 } },
    // CP3-3 금고실 대기 복도 입구
    { id: 'CP3-3', area: { tx: 33, ty: 11, w: 3, h: 2 }, spawn: { tx: 34, ty: 12 } },
    // CP3-4 칩 획득 직전·직후 (금고실 안)
    { id: 'CP3-4', area: { tx: 24, ty: 1, w: 8, h: 6 }, spawn: { tx: 27, ty: 4 } },
  ],
  rules: {
    silentAlarmFlag: 'chip_taken',
    clueObjectives: { 'C3-02': 'l3_deduce' },
    blinkRevealClue: 'C3-05',
  },
  zones: [],
  dialogues: [
    // ── 브리핑 ──
    {
      id: 'brief_l3',
      entries: [{ node: 'b1' }],
      nodes: {
        b1: {
          id: 'b1',
          speaker: 'chief',
          text: '거래 문서가 가리킨 곳은 소금곶 통조림 공장 지하. 박사의 연구소다.',
          next: 'b2',
        },
        b2: {
          id: 'b2',
          speaker: 'chief',
          text: '주노아 박사는 몸을 피했다. 남은 건 금고 속 오로라 칩뿐이야.',
          next: 'b3',
        },
        b3: {
          id: 'b3',
          speaker: 'chief',
          text: '새 기술 두 개. 잠긴 문은 E로 따고, 동전은 G로 조준해서 던져.',
          next: 'b4',
        },
        b4: {
          id: 'b4',
          speaker: 'chief',
          text: '박사의 메모, 기억하지? 수첩에서 단서 두 개를 골라 연결해 봐.',
          next: 'b5',
        },
        b5: { id: 'b5', speaker: 'player', text: '이번에도 사탕은 돌아와서 주시는 거죠?', next: 'b6' },
        b6: { id: 'b6', speaker: 'chief', text: '두 개 주지. 마지막 임무다, 모스. 조용히 다녀와.' },
      },
    },
    // ── 말순 여사 (청소부, 동전·비상 통로) ──
    {
      id: 'malsun',
      entries: [{ when: { flags: ['met_malsun'] }, node: 'ms_again' }, { node: 'ms_first' }],
      nodes: {
        ms_first: {
          id: 'ms_first',
          speaker: 'malsun',
          text: '젊은이, 여기 사람 아니지? 신발이 너무 깨끗해.',
          effects: [
            { type: 'setFlag', flag: 'met_malsun' },
            { type: 'completeObjective', objective: 'l3_enter' },
          ],
          next: 'ms_first2',
        },
        ms_first2: {
          id: 'ms_first2',
          speaker: 'malsun',
          text: '…뭐, 나랑은 상관없지. 여기 놈들 신발은 더 더러우니까.',
          next: 'ms_hub',
        },
        ms_again: {
          id: 'ms_again',
          speaker: 'malsun',
          text: '또 왔어? 청소는 끝이 없다니까.',
          next: 'ms_hub',
        },
        ms_hub: {
          id: 'ms_hub',
          speaker: 'malsun',
          text: '(대걸레를 짚고 숨을 고른다.)',
          choices: [
            { text: '청소 도와드릴게요.', next: 'ms_help', showIf: { notFlags: ['got_coins'] } },
            { text: '다른 출구는 없나요?', next: 'ms_exit' },
            { text: '수고하세요.', next: 'ms_bye' },
          ],
        },
        ms_help: {
          id: 'ms_help',
          speaker: 'malsun',
          text: '어머, 기특해라. 자, 수고비. 바닥에서 주운 거지만 돈은 돈이야.',
          effects: [
            { type: 'giveCoins', amount: 3 },
            { type: 'setFlag', flag: 'got_coins' },
          ],
          next: 'ms_help2',
        },
        ms_help2: {
          id: 'ms_help2',
          speaker: 'malsun',
          text: '동전 떨어지는 소리 나면 경비들이 쪼르르 달려가더라고. 호호.',
          next: 'ms_help3',
        },
        ms_help3: {
          id: 'ms_help3',
          speaker: 'narrator',
          text: 'G를 누르고 있으면 조준, 좌클릭으로 던진다. 소리가 닿는 경비가 표시된다.',
          next: 'ms_hub',
        },
        ms_exit: {
          id: 'ms_exit',
          speaker: 'malsun',
          text: '북서쪽에 비상 통로가 있지. 문이 잠겨서 다들 잊어버렸어.',
          effects: [{ type: 'giveClue', clue: 'C3-04' }],
          next: 'ms_exit2',
        },
        ms_exit2: {
          id: 'ms_exit2',
          speaker: 'malsun',
          text: '대기 복도 서쪽 끝이야. 자물쇠쯤은 젊은이가 알아서 하겠지?',
          next: 'ms_hub',
        },
        ms_bye: {
          id: 'ms_bye',
          speaker: 'malsun',
          text: '그래, 다치지 말고. 바닥 미끄러워.',
        },
      },
    },
    // ── 모모 (겁 많은 연구원) ──
    {
      id: 'momo',
      entries: [{ when: { clues: ['C3-03'] }, node: 'mm_after' }, { node: 'mm_hello' }],
      nodes: {
        mm_hello: {
          id: 'mm_hello',
          speaker: 'momo',
          text: '히익! 누, 누구세요? 경비 부를 거예요! …아마도요.',
          summaryText: '히익, 또 오셨어요?',
          choices: [
            { text: '상회에서 점검 나왔어요.', next: 'mm_card', requires: ['C2-05'] },
            { text: '박사님 친구예요.', next: 'mm_friend' },
            { text: '그냥 지나가는 중이에요.', next: 'mm_bye' },
          ],
        },
        mm_card: {
          id: 'mm_card',
          speaker: 'momo',
          text: '까, 까마귀 부인 명함…! 실례했습니다! 점검이라면 이게 필요하시죠?',
          next: 'mm_pass',
        },
        mm_pass: {
          id: 'mm_pass',
          speaker: 'momo',
          text: '금고실 출입증이에요. 이거면 카드 문이 그냥 열려요.',
          effects: [{ type: 'giveClue', clue: 'C3-03' }],
          next: 'mm_pass2',
        },
        mm_pass2: {
          id: 'mm_pass2',
          speaker: 'momo',
          text: '저, 저는 아무것도 못 본 거예요. 자판기랑 대화 중이었어요.',
        },
        mm_friend: {
          id: 'mm_friend',
          speaker: 'momo',
          text: '박사님 친구요? …다행이다. 박사님은 무사히 피하셨어요.',
          next: 'mm_friend2',
        },
        mm_friend2: {
          id: 'mm_friend2',
          speaker: 'momo',
          text: '칩은 금고실 금고에 있어요. 번호는 저도 몰라요. 박사님만 아세요.',
          effects: [{ type: 'setFlag', flag: 'momo_friend' }],
          next: 'mm_friend3',
        },
        mm_friend3: {
          id: 'mm_friend3',
          speaker: 'momo',
          text: '박사님은 연구실 A에서 일지를 꼼꼼히 쓰셨어요. 문은 잠겼지만요.',
          next: 'mm_hello',
        },
        mm_bye: {
          id: 'mm_bye',
          speaker: 'momo',
          text: '지, 지나가세요. 전 아무도 못 봤어요. 정말로요.',
        },
        mm_after: {
          id: 'mm_after',
          speaker: 'momo',
          text: '출입증 잃어버리시면 저 진짜 잘려요… 부탁드려요.',
        },
      },
    },
    // ── 조사: 실험일지 (연구실 A) ──
    {
      id: 'insp_journal',
      entries: [{ when: { clues: ['C3-01'] }, node: 'jn_done' }, { node: 'jn_1' }],
      nodes: {
        jn_1: {
          id: 'jn_1',
          speaker: 'narrator',
          text: '책상 위에 두꺼운 실험일지가 펼쳐져 있다.',
          next: 'jn_2',
        },
        jn_2: {
          id: 'jn_2',
          speaker: 'narrator',
          text: "'작성 시작 2월 2일.' 첫 장부터 글씨가 빼곡하다.",
          next: 'jn_3',
        },
        jn_3: {
          id: 'jn_3',
          speaker: 'narrator',
          text: "'3월 21일, 첫 실험 성공! 오늘을 잊지 말자.' 밑줄이 세 번.",
          effects: [
            { type: 'giveClue', clue: 'C3-01' },
            { type: 'completeObjective', objective: 'l3_enter' },
            { type: 'completeObjective', objective: 'l3_research' },
          ],
          next: 'jn_4',
        },
        jn_4: {
          id: 'jn_4',
          speaker: 'player',
          text: '박사의 메모와 맞춰 보면… 수첩(Tab)에서 둘을 연결해 보자.',
        },
        jn_done: {
          id: 'jn_done',
          speaker: 'narrator',
          text: '나머지는 수식뿐이다. 읽을수록 머리가 아프다.',
        },
      },
    },
    // ── 조사: 경비실 근무표 ──
    {
      id: 'insp_roster',
      entries: [{ when: { clues: ['C3-05'] }, node: 'rs_done' }, { node: 'rs_1' }],
      nodes: {
        rs_1: {
          id: 'rs_1',
          speaker: 'narrator',
          text: '벽에 경비실 근무표가 붙어 있다.',
          next: 'rs_2',
        },
        rs_2: {
          id: 'rs_2',
          speaker: 'narrator',
          text: "'브루노 대장: 8초마다 하품. 하품 중 2초간 눈 감음. 고칠 것.'",
          effects: [{ type: 'giveClue', clue: 'C3-05' }],
          next: 'rs_3',
        },
        rs_3: {
          id: 'rs_3',
          speaker: 'player',
          text: '대장님의 하품 타이밍이 보일 것 같다. 아무도 안 고쳤군.',
        },
        rs_done: {
          id: 'rs_done',
          speaker: 'narrator',
          text: '근무표 구석에 누가 그려 놓은 하품하는 곰 그림이 있다.',
        },
      },
    },
    // ── 조사: 자판기 (분위기) ──
    {
      id: 'insp_vending',
      entries: [{ node: 'vd_1' }],
      nodes: {
        vd_1: {
          id: 'vd_1',
          speaker: 'narrator',
          text: "자판기. '오늘의 추천: 야근 커피'. 버튼이 유난히 닳아 있다.",
        },
      },
    },
    // ── 조사: 금고 (번호 입력) ──
    {
      id: 'insp_safe',
      entries: [
        { when: { clues: ['C3-06'] }, node: 'safe_empty' },
        { when: { clues: ['C3-02'] }, node: 'safe_known' },
        { node: 'safe_intro' },
      ],
      nodes: {
        safe_intro: {
          id: 'safe_intro',
          speaker: 'narrator',
          text: '묵직한 4자리 다이얼 금고다. 박사는 번호를 어디에 남겼을까.',
          effects: [{ type: 'completeObjective', objective: 'l3_vault' }],
          next: 'safe_menu',
        },
        safe_known: {
          id: 'safe_known',
          speaker: 'narrator',
          text: '묵직한 4자리 다이얼 금고다. 번호라면 이미 알고 있다.',
          effects: [
            { type: 'completeObjective', objective: 'l3_deduce' },
            { type: 'completeObjective', objective: 'l3_vault' },
          ],
          next: 'safe_menu',
        },
        safe_menu: {
          id: 'safe_menu',
          speaker: 'narrator',
          text: '어떻게 할까?',
          choices: [
            { text: '추리한 번호를 입력한다.', next: 'safe_open', requires: ['C3-02'] },
            { text: '번호를 직접 입력한다.', next: 'safe_code' },
            { text: '그만둔다.', next: 'safe_leave' },
          ],
        },
        safe_code: {
          id: 'safe_code',
          speaker: 'narrator',
          text: '다이얼을 돌린다. 네 자리 숫자를 입력하자. (3번 틀리면 경보)',
          codeInput: {
            answer: '0321',
            success: 'safe_open',
            wrong: 'safe_wrong',
            maxWrong: 3,
            onMaxWrong: 'safe_alarm',
          },
        },
        safe_wrong: {
          id: 'safe_wrong',
          speaker: 'narrator',
          text: '삐빅. 틀렸다. 금고가 째려보는 기분이다.',
          choices: [
            { text: '다시 입력한다.', next: 'safe_code' },
            { text: '그만둔다.', next: 'safe_leave' },
          ],
        },
        safe_alarm: {
          id: 'safe_alarm',
          speaker: 'narrator',
          text: '삐— 삐— 삐—! 금고 경보 장치가 울렸다!',
          effects: [{ type: 'triggerAlarm' }],
        },
        safe_open: {
          id: 'safe_open',
          speaker: 'narrator',
          text: '0, 3, 2, 1. 철컥 — 금고 문이 열렸다.',
          next: 'safe_chip',
        },
        safe_chip: {
          id: 'safe_chip',
          speaker: 'narrator',
          text: '안에는 손톱만 한 칩이 은은하게 빛난다. 오로라 칩이다.',
          effects: [
            { type: 'giveClue', clue: 'C3-06' },
            { type: 'setFlag', flag: 'chip_taken' },
            { type: 'completeObjective', objective: 'l3_deduce' },
            { type: 'completeObjective', objective: 'l3_vault' },
            { type: 'completeObjective', objective: 'l3_chip' },
          ],
          next: 'safe_chip2',
        },
        safe_chip2: {
          id: 'safe_chip2',
          speaker: 'player',
          text: '챙겼다. 이제 조용히… 나가기만 하면 돼.',
        },
        safe_leave: {
          id: 'safe_leave',
          speaker: 'narrator',
          text: '금고에서 손을 뗐다. 번호를 더 찾아보자.',
        },
        safe_empty: {
          id: 'safe_empty',
          speaker: 'narrator',
          text: '금고는 비었다. 박사에게 미안할 만큼 깔끔하게.',
        },
      },
    },
  ],
};

export default level3;
