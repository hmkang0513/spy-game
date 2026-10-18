// 레벨 데이터 효과로 표현하지 않는 진행 규칙 (레벨 데이터 담당과 합의한 id)
export const RULES = {
  /** 이 플래그가 켜지면 체크포인트 저장 후 무음 경보 (AC-61) */
  silentAlarmFlag: 'chip_taken',
  /** 직원 구역에 처음 들어가면 완료되는 목표 */
  staffZoneObjective: 'l2_infiltrate',
  /** 이 단서가 생기면 완료되는 목표 (L3 금고 번호 추리) */
  clueObjectives: { 'C3-02': 'l3_deduce' } as Record<string, string>,
  /** 하품 빈틈 표시를 여는 단서 (C3-05) */
  blinkRevealClue: 'C3-05',
} as const;
