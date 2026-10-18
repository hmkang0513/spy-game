// L1 「항구 카페 접선」 (05_레벨설계서 L1)
// 경비 감지 없음. 페퍼에게 초대장(C1-06)을 받고 카페 문(출구)을 나서면 클리어 (AC-59).
import type { LevelDef } from '../../types';
import { buildLegend } from '../tiles';

/*
 * 맵 28×20 — 구역
 *  - 서쪽 테라스 x1..7 y1..10 (바다 쪽, 젖은 영수증)
 *  - 북쪽 창가석 x10..19 y1..4 (페퍼 자리)
 *  - 1층 홀 x9..20 y6..13 (테이블 6개)
 *  - 동쪽 카운터 x21..26 y6..13, 주방 x21..26 y1..4
 *  - 남쪽 입구 (14,14) = 카페 문(초대장을 받으면 열림), 입구 밖 부두 길 y15..17
 *  - 부두 동쪽 끝 (27,16) = 출구. 경찰이 부두를 순찰한다(감지 없음, 원뿔 안내만)
 */
const level1: LevelDef = {
  id: 1,
  title: '항구 카페 접선',
  subtitle: '블루 앵커의 단골 주문',
  targetTimeSec: 360,
  guardsActive: false,
  briefing: {
    dialogue: 'brief_l1',
    objectivesPreview: ['접선자 페퍼를 찾는다', '접선 암호를 알아낸다', '페퍼에게 정보를 받는다', '부두를 따라 항구를 빠져나간다'],
    startClues: ['C1-01', 'C1-02'],
  },
  map: {
    tileset: 'tiles_l1',
    legend: buildLegend('tiles_l1'),
    rows: [
      '~HHHHHHH##WWWWWWWWWW########',
      '~-------##hTh.hTh.Th#BB==BB#',
      '~-Th-Th-##..........#,,,,,,#',
      '~-------##hTh...hTh.#,,,,,,#',
      '~-------##..........#B,,,,B#',
      '~-Th-Th-##P..PPPP..P###D####',
      '~-------#............,,,,BB#',
      '~-P---P-#.h...h...h..,,,,,,#',
      '~-------D.T...T...T..,=====#',
      '~-Th----#.h...h...h..,hhhhh#',
      '~-------#.h...h...h..,,,,,,#',
      '~HHHHHHH#.T...T...T..,,,,,,#',
      '~~~~~~~~#.h...h...h..,,,,,,#',
      '~~~~~~~~#............,,,,,P#',
      '~~~~~~~~##WW##D##WW#########',
      'C--------------------------C',
      'C--------------------------D',
      'C--------------------------C',
      '~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      '~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    ],
  },
  player: { spawn: { tx: 14, ty: 13 }, facing: 'up', character: 'moth_l1' },
  npcs: [
    { id: 'pepper', character: 'pepper', pos: { tx: 19, ty: 1 }, facing: 'down', dialogue: 'pepper' },
    { id: 'mio', character: 'mio', pos: { tx: 22, ty: 7 }, facing: 'left', dialogue: 'mio' },
    { id: 'do_bosun', character: 'do_bosun', pos: { tx: 18, ty: 9 }, facing: 'up', dialogue: 'do_bosun' },
    { id: 'lu', character: 'lu', pos: { tx: 10, ty: 3 }, facing: 'right', dialogue: 'lu' },
  ],
  guards: [
    {
      // 엔딩 예고용 순찰 경찰. guardsActive=false 이므로 원뿔만 보이고 감지하지 않는다 (AC-59)
      id: 'police',
      character: 'police_l1',
      kind: 'patrol',
      pos: { tx: 2, ty: 16 },
      facingDeg: 0,
      patrol: {
        waypoints: [
          { tx: 2, ty: 16 },
          { tx: 24, ty: 16 },
        ],
        waitSec: 3,
      },
    },
  ],
  interactables: [
    { id: 'receipt', kind: 'inspect', pos: { tx: 6, ty: 9 }, dialogue: 'insp_receipt' },
    {
      id: 'cafe_door',
      kind: 'lockedDoor',
      pos: { tx: 14, ty: 14 },
      opensWithClue: 'C1-06',
      blockedText: '아직 나갈 때가 아니다. 접선부터 끝내자.',
      openText: '카페 문을 열었다. 짠 바닷바람이 분다.',
    },
    {
      id: 'exit_dock',
      kind: 'exit',
      pos: { tx: 27, ty: 16 },
      requires: ['C1-06'],
      blockedText: '아직 나갈 때가 아니다. 접선부터 끝내자.',
    },
  ],
  clues: [
    {
      id: 'C1-01',
      name: '등대 요원 배지',
      kind: 'item',
      description: '등대 요원임을 증명하는 작은 배지. 뒷면에 나방 문양이 새겨져 있다.',
      source: '체리 국장에게서 / 브리핑',
    },
    {
      id: 'C1-02',
      name: '접선자 인상착의',
      kind: 'person',
      description: '정보원 페퍼. 파란 우산과 신문을 들고 있다. 창가 자리를 좋아한다.',
      source: '체리 국장에게서 / 브리핑',
    },
    {
      id: 'C1-03',
      name: '단골 주문 쪽지',
      kind: 'document',
      description: "창가 손님의 단골 주문: '소금 라테, 얼음 셋'. 얼음 개수까지 따진다.",
      source: '미오에게서 / 블루 앵커 카운터',
    },
    {
      id: 'C1-04',
      name: '젖은 영수증',
      kind: 'document',
      description: "'흑깃호 선원 일동 — 생선튀김 4인분.' 바닷물에 젖어 글씨가 번졌다.",
      source: '블루 앵커 테라스 바닥',
      optional: true,
    },
    {
      id: 'C1-05',
      name: "상회 화물선 '흑깃호'",
      kind: 'document',
      description: '까마귀 상회의 화물선. 밤에만 검은 깃발을 달고 입항한다.',
      source: '페퍼에게서 / 창가석',
      optional: true,
      carryOver: true,
    },
    {
      id: 'C1-06',
      name: '대사관 파티 초대장',
      kind: 'item',
      description: '벨모라 대사관 가든 파티 초대장. 이름 칸이 비어 있어 누구든 될 수 있다.',
      source: '페퍼에게서 / 창가석',
      carryOver: true,
    },
  ],
  combos: [],
  objectives: [
    { id: 'l1_find_contact', text: '접선자 페퍼 찾기' },
    { id: 'l1_password', text: '접선 암호 알아내기' },
    { id: 'l1_get_info', text: '페퍼에게 정보 받기' },
    { id: 'l1_leave', text: '부두를 따라 항구 빠져나가기' },
  ],
  checkpoints: [],
  rules: {
    coneHintText: '경찰의 시야에 들어갔다. 다음 임무부터는 이 원뿔을 피해야 한다.',
  },
  zones: [],
  dialogues: [
    // ── 브리핑 ──
    {
      id: 'brief_l1',
      entries: [{ node: 'b1' }],
      nodes: {
        b1: { id: 'b1', speaker: 'chief', text: '모스, 첫 임무다. 긴장했나? 사탕 하나 줄까?', next: 'b2' },
        b2: { id: 'b2', speaker: 'player', text: '괜찮습니다. …딸기 맛이면 받을게요.', next: 'b3' },
        b3: {
          id: 'b3',
          speaker: 'chief',
          text: "항구 카페 '블루 앵커'에 정보원 페퍼가 있다. 까마귀 상회의 다음 거래를 알고 있지.",
          next: 'b4',
        },
        b4: { id: 'b4', speaker: 'chief', text: '인상착의는 파란 우산, 신문. 수첩에 적어 뒀다.', next: 'b5' },
        b5: { id: 'b5', speaker: 'player', text: '접선 암호는요?', next: 'b6' },
        b6: {
          id: 'b6',
          speaker: 'chief',
          text: '페퍼는 까다로워. 자기 단골 주문을 아는 사람만 상대한다. 그건 현장에서 알아내.',
          next: 'b7',
        },
        b7: { id: 'b7', speaker: 'chief', text: '등대 배지 잊지 말고. 행운을 빈다, 나방 요원.' },
      },
    },
    // ── 페퍼 (정보원) ──
    {
      id: 'pepper',
      entries: [
        { when: { clues: ['C1-06'] }, node: 'pp_back' },
        { when: { flags: ['pepper_trusted'] }, node: 'pp_again' },
        { node: 'pp_who' },
      ],
      nodes: {
        pp_who: {
          id: 'pp_who',
          speaker: 'pepper',
          text: '(신문 너머로) …누가 보냈지? 증명할 걸 보여 봐.',
          summaryText: '…누가 보냈지? 보여 봐.',
          effects: [{ type: 'completeObjective', objective: 'l1_find_contact' }],
          present: { accept: ['C1-01'], success: 'pp_badge_ok', wrong: 'pp_badge_wrong' },
        },
        pp_badge_wrong: {
          id: 'pp_badge_wrong',
          speaker: 'pepper',
          text: '그건 내가 찾는 게 아니야. 등대에서 왔다면 뭘 내밀어야 할지 알 텐데.',
          next: 'pp_who',
        },
        pp_badge_ok: {
          id: 'pp_badge_ok',
          speaker: 'pepper',
          text: '나방 배지라… 등대가 이번엔 신입을 보냈군. 반갑네.',
          effects: [{ type: 'setFlag', flag: 'pepper_trusted' }],
          next: 'pp_order',
        },
        pp_again: {
          id: 'pp_again',
          speaker: 'pepper',
          text: '또 왔나. 이번엔 제대로 주문할 생각이 든 건가?',
          next: 'pp_order',
        },
        pp_order: {
          id: 'pp_order',
          speaker: 'pepper',
          text: '자, 그래서. 뭘 주문할 건가?',
          choices: [
            { text: '그냥 커피 마시러 왔어요.', next: 'pp_just_coffee' },
            { text: '소금 라테, 얼음 셋.', next: 'pp_password_ok', requires: ['C1-03'] },
          ],
        },
        pp_just_coffee: {
          id: 'pp_just_coffee',
          speaker: 'pepper',
          text: '그럼 커피나 즐기게. 난 신문이나 마저 읽지.',
          next: 'pp_just_coffee2',
        },
        pp_just_coffee2: {
          id: 'pp_just_coffee2',
          speaker: 'narrator',
          text: '페퍼가 신문을 다시 펼쳤다. 이 사람의 단골 주문을 아는 사람이 있을 텐데.',
        },
        pp_password_ok: {
          id: 'pp_password_ok',
          speaker: 'pepper',
          text: '…얼음 셋까지. 제대로 배웠군. 미오 녀석, 입이 가볍다니까.',
          effects: [{ type: 'completeObjective', objective: 'l1_password' }],
          next: 'pp_info',
        },
        pp_info: {
          id: 'pp_info',
          speaker: 'pepper',
          text: '까마귀 상회가 벨모라 대사관 파티에서 큰 거래를 확정한다.',
          next: 'pp_invite',
        },
        pp_invite: {
          id: 'pp_invite',
          speaker: 'pepper',
          text: '이 초대장이면 들어갈 수 있어. 이름 칸은 비워 뒀지. 마음에 드는 이름을 쓰게.',
          effects: [
            { type: 'giveClue', clue: 'C1-06' },
            { type: 'completeObjective', objective: 'l1_get_info' },
          ],
          next: 'pp_after',
        },
        pp_back: {
          id: 'pp_back',
          speaker: 'pepper',
          text: '아직 안 갔나? 라테가 식겠어.',
          next: 'pp_after',
        },
        pp_after: {
          id: 'pp_after',
          speaker: 'pepper',
          text: '더 물어볼 게 있나?',
          choices: [
            {
              text: '이 영수증, 뭔지 아세요?',
              next: 'pp_receipt',
              requires: ['C1-04'],
              showIf: { notClues: ['C1-05'] },
            },
            { text: '이제 가 볼게요.', next: 'pp_bye' },
          ],
        },
        pp_receipt: {
          id: 'pp_receipt',
          speaker: 'pepper',
          text: '흑깃호… 까마귀 상회 화물선이야. 밤에만 검은 깃발을 달고 들어오지.',
          effects: [{ type: 'giveClue', clue: 'C1-05' }],
          next: 'pp_receipt2',
        },
        pp_receipt2: {
          id: 'pp_receipt2',
          speaker: 'pepper',
          text: '파티에서 그 이름을 아는 척하면, 닫힌 입도 열릴 거다.',
          next: 'pp_after',
        },
        pp_bye: {
          id: 'pp_bye',
          speaker: 'pepper',
          text: '문 앞에 경찰이 어슬렁거린다. 태연하게 나가. 신입 티 내지 말고.',
        },
      },
    },
    // ── 미오 (바리스타) ──
    {
      id: 'mio',
      entries: [{ when: { clues: ['C1-06'] }, node: 'mio_done' }, { node: 'mio_hello' }],
      nodes: {
        mio_hello: {
          id: 'mio_hello',
          speaker: 'mio',
          text: '어서 오세요, 블루 앵커입니다! 주문하시겠어요?',
          summaryText: '또 오셨네요! 주문하시겠어요?',
          choices: [
            { text: '아무거나 추천해 주세요.', next: 'mio_recommend' },
            { text: '창가 손님이 마시는 걸로요.', next: 'mio_regular' },
            { text: '그냥 둘러볼게요.', next: 'mio_bye' },
          ],
        },
        mio_recommend: {
          id: 'mio_recommend',
          speaker: 'mio',
          text: "오늘의 추천은 '안개 모카'! 오늘따라 안개가 짙거든요.",
          next: 'mio_recommend2',
        },
        mio_recommend2: {
          id: 'mio_recommend2',
          speaker: 'player',
          text: '(맛있겠지만… 오늘은 일하러 왔다.)',
          next: 'mio_hello',
        },
        mio_regular: {
          id: 'mio_regular',
          speaker: 'mio',
          text: "아, 그 신문 읽는 신사분요? 매일 '소금 라테, 얼음 셋'이에요.",
          effects: [
            { type: 'giveClue', clue: 'C1-03' },
            { type: 'completeObjective', objective: 'l1_password' },
          ],
          next: 'mio_regular2',
        },
        mio_regular2: {
          id: 'mio_regular2',
          speaker: 'mio',
          text: '얼음 개수까지 따지는 손님은 그분뿐이라니까요. 넷이면 화내세요.',
          next: 'mio_hello',
        },
        mio_bye: {
          id: 'mio_bye',
          speaker: 'mio',
          text: '천천히 둘러보세요! 테라스 바람이 좋아요.',
        },
        mio_done: {
          id: 'mio_done',
          speaker: 'mio',
          text: '라테 주문은 잘 통하셨어요? 표정이 한결 밝아지셨네요.',
        },
      },
    },
    // ── 도 갑판장 (단골 노선원) ──
    {
      id: 'do_bosun',
      entries: [{ node: 'do_hello' }],
      nodes: {
        do_hello: {
          id: 'do_hello',
          speaker: 'do_bosun',
          text: '허허, 신참 냄새가 나는구먼. 바다 냄새 말고.',
          summaryText: '또 왔나, 신참.',
          choices: [
            { text: '요즘 항구는 어때요?', next: 'do_harbor' },
            { text: '혹시 떨어진 물건 못 보셨어요?', next: 'do_receipt' },
            { text: '좋은 하루 되세요.', next: 'do_bye' },
          ],
        },
        do_harbor: {
          id: 'do_harbor',
          speaker: 'do_bosun',
          text: '조용하지. 낮에는. 그런데 요즘 밤마다 검은 깃발 단 배가 들어와.',
          next: 'do_harbor2',
        },
        do_harbor2: {
          id: 'do_harbor2',
          speaker: 'do_bosun',
          text: '그 배 선원들이 여기서 튀김을 먹고 갔지. 팁은 한 푼도 안 주고. 쯧.',
          next: 'do_hello',
        },
        do_receipt: {
          id: 'do_receipt',
          speaker: 'do_bosun',
          text: '떨어진 거? 아까 그 선원 놈들이 테라스에 종이 쪼가리를 흘리고 갔어.',
          next: 'do_receipt2',
        },
        do_receipt2: {
          id: 'do_receipt2',
          speaker: 'do_bosun',
          text: '서쪽 문으로 나가면 테라스야. 바닷바람에 날아가기 전에 서둘러.',
          effects: [{ type: 'setFlag', flag: 'heard_receipt' }],
          next: 'do_hello',
        },
        do_bye: {
          id: 'do_bye',
          speaker: 'do_bosun',
          text: '자네도. 파도는 늘 조심하고, 사람은 더 조심하게.',
        },
      },
    },
    // ── 루 (화가, 오답 유머) ──
    {
      id: 'lu',
      entries: [{ node: 'lu_hello' }],
      nodes: {
        lu_hello: {
          id: 'lu_hello',
          speaker: 'lu',
          text: '어머, 손님도 바다 그리러 오셨어요? 이 파란색 좀 보세요!',
          summaryText: '오늘 바다는 잉크 블루예요.',
          choices: [
            { text: '(속삭이며) 혹시… 저를 기다리셨나요?', next: 'lu_wait' },
            { text: '소금 라테, 얼음 셋.', next: 'lu_latte', requires: ['C1-03'] },
            { text: '이 근처에 신문 읽는 분 못 보셨어요?', next: 'lu_hint' },
            { text: '그림 멋지네요. 실례했어요.', next: 'lu_bye' },
          ],
        },
        lu_wait: {
          id: 'lu_wait',
          speaker: 'lu',
          text: '네? 아, 모델 해 주시게요? 옆모습이 좋네요! 조금만 왼쪽으로…',
          next: 'lu_wait2',
        },
        lu_wait2: {
          id: 'lu_wait2',
          speaker: 'player',
          text: '(파란 스카프일 뿐이었다. 접선자는 우산과 신문이라고 했지.)',
          next: 'lu_hello',
        },
        lu_latte: {
          id: 'lu_latte',
          speaker: 'lu',
          text: '…라테요? 라테 거품에 그림 그려 드릴까요? 얼음 셋은 좀 어렵겠다.',
          next: 'lu_latte2',
        },
        lu_latte2: {
          id: 'lu_latte2',
          speaker: 'player',
          text: '(암호를 엉뚱한 사람에게 말해 버렸다. 못 들은 걸로 해 주길.)',
          next: 'lu_hello',
        },
        lu_hint: {
          id: 'lu_hint',
          speaker: 'lu',
          text: '창가 끝자리 신사분요? 아침부터 신문만 보세요. 우산도 파래서 그리고 싶었는데.',
          next: 'lu_hello',
        },
        lu_bye: {
          id: 'lu_bye',
          speaker: 'lu',
          text: '나중에 완성되면 보여 드릴게요! 제목은 「바다와 수상한 손님」.',
        },
      },
    },
    // ── 조사: 젖은 영수증 ──
    {
      id: 'insp_receipt',
      entries: [{ when: { clues: ['C1-04'] }, node: 'rc_done' }, { node: 'rc_1' }],
      nodes: {
        rc_1: {
          id: 'rc_1',
          speaker: 'narrator',
          text: '테라스 바닥에 젖은 영수증이 달라붙어 있다.',
          next: 'rc_2',
        },
        rc_2: {
          id: 'rc_2',
          speaker: 'narrator',
          text: "'흑깃호 선원 일동 — 생선튀김 4인분.' 팁 칸은 깨끗하게 비어 있다.",
          effects: [{ type: 'giveClue', clue: 'C1-04' }],
          next: 'rc_3',
        },
        rc_3: {
          id: 'rc_3',
          speaker: 'player',
          text: '흑깃호라… 이 동네 사정에 밝은 사람에게 물어볼까.',
        },
        rc_done: {
          id: 'rc_done',
          speaker: 'narrator',
          text: '더는 쓸 만한 게 없다. 바닷바람만 짭짤하다.',
        },
      },
    },
  ],
};

export default level1;
