// S4/S5 레벨 — 맵·플레이어·NPC·경비. 조사/잠입은 phase 로 구분한다 (02 §4, 03 리드 정리)
import Phaser from 'phaser';
import { TILE, TUNING } from '../config';
import { applyLevelClear, computeGrade, worldToTile } from '../core';
import type { CheckpointData, InteractableDef, LevelDef, LevelId, LevelRules, TileRect, ZoneDef } from '../types';
import { ActionKeys } from '../input/bindings';
import { Player } from '../entities/Player';
import { Npc } from '../entities/Npc';
import { Interactable, HINT_LABEL } from '../entities/Interactable';
import type { Guard, GuardWorld } from '../entities/Guard';
import { dist, tileToFeet } from '../entities/actor';
import { LevelWorld } from './level/world';
import { Stealth } from './level/stealth';
import { CoinAim } from './level/coinAim';
import { excuseDialogue, EXCUSE_DIALOGUE_ID } from './level/excuse';
import { abilitiesFor, findDialogue, getLevel } from '../state/content';
import { gameState } from '../state/game';
import { LevelSession, currentSession, setSession, type SignalEffect } from '../state/session';
import { Subscriptions, bus } from '../state/events';
import { notebook } from '../dom/ClueNotebook';
import { addText, fadeIn, fadeTo } from '../ui/theme';
import { COLORS } from '../config';
import type { DialogueLaunch } from './DialogueScene';

export interface LevelLaunch {
  level: LevelId;
  /** 체크포인트에서 시작 (붙잡힘·재시작·이어하기) */
  fromCheckpoint?: boolean;
  /** 같은 판에서 체크포인트로 복귀 (붙잡힘·일시정지 재시작) — 경보 횟수·시간 유지, 복귀 +1 */
  returning?: boolean;
}

export type Phase = 'investigate' | 'infiltrate' | 'ending';

/** 세션 시작 시 메모리에 두는 처음 상태 (체크포인트 전 붙잡힘용) */
let startSnapshot: CheckpointData | null = null;

export class LevelScene extends Phaser.Scene {
  level!: LevelDef;
  session!: LevelSession;
  world!: LevelWorld;
  player!: Player;
  stealth!: Stealth;
  private npcs: Npc[] = [];
  private items: Interactable[] = [];
  private keys!: ActionKeys;
  private coinAim!: CoinAim;
  private hint!: Phaser.GameObjects.Text;
  private subs = new Subscriptions();
  private reachedCheckpoints = new Set<string>();
  private zoneId: string | null = null;
  private talkingTo: Npc | null = null;
  /** 대화·자물쇠 등 오버레이가 열려 있음 */
  overlay: 'none' | 'dialogue' | 'lockpick' | 'notebook' = 'none';
  private excuseGuard: Guard | null = null;
  private excuseAccepted = false;
  private caught = false;
  private done = false;
  /** 원뿔 첫 진입 안내를 이미 띄웠는지 */
  private coneHintShown = false;
  /** 대화 중 걸린 경보 — 대화가 닫힌 직후 적용 (04 §9, AC-13) */
  private pendingAlarm = false;
  private resumed = false;

  constructor() {
    super('Level');
  }

  init(data: LevelLaunch): void {
    this.level = getLevel(data.level);
    const save = gameState.data;
    let cp: CheckpointData | null = null;
    if (data.fromCheckpoint) {
      const stored = gameState.checkpoint();
      cp = stored?.level === data.level ? stored : startSnapshot?.level === data.level ? startSnapshot : null;
    }
    const existing = currentSession();
    const prev = existing?.level.id === data.level ? existing : null;
    if (cp) {
      this.session = new LevelSession(this.level, save.carriedClues, cp);
      if (data.returning && prev) this.session.carryFrom(prev);
    } else if (prev && prev.elapsedSec === 0) this.session = prev;
    else this.session = new LevelSession(this.level, save.carriedClues);
    setSession(this.session);
    if (!cp) startSnapshot = this.session.toCheckpoint('start');
    this.resumed = Boolean(cp && this.session.checkpointId);
    this.npcs = [];
    this.items = [];
    // 복원한 체크포인트와 그 앞의 체크포인트는 이미 지난 것으로 본다 (LevelDef 순서)
    const order = this.level.checkpoints.findIndex((c) => c.id === this.session.checkpointId);
    this.reachedCheckpoints = new Set(this.level.checkpoints.slice(0, order + 1).map((c) => c.id));
    this.pendingAlarm = false;
    this.zoneId = null;
    this.overlay = 'none';
    this.excuseGuard = null;
    this.caught = false;
    this.done = false;
    this.coneHintShown = false;
    this.talkingTo = null;
  }

  create(): void {
    const s = this.session;
    this.world = new LevelWorld(this, this.level, s.openedDoors);
    this.physics.world.setBounds(0, 0, this.world.widthPx, this.world.heightPx);

    const spawn = this.spawnTile();
    this.player = new Player(this, this.level.player.character, spawn, this.level.player.facing);
    this.physics.add.collider(this.player.body, this.world.collision);

    this.npcs = this.level.npcs.map((d) => new Npc(this, d));
    this.items = this.level.interactables.map((d) => new Interactable(this, d));
    this.refreshItems();

    this.stealth = new Stealth(this, this.level.guards, s.alertCount, {
      interceptSpot: (g) => this.tryExcuse(g),
      onCaught: (g) => this.onCaught(g),
    });
    this.coinAim = new CoinAim(this, {
      grid: () => this.world.grid,
      playerFeet: () => this.player.feet,
      guardsNear: (p, r) => this.stealth.guardsNear(p, r),
      clearHighlights: () => this.stealth.clearHighlights(),
      spendCoin: () => s.useCoin(),
      onLand: (p) => this.stealth.makeNoise(p, TUNING.coin.noiseTiles, this.guardWorld()),
    });

    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.world.widthPx, this.world.heightPx);
    cam.startFollow(this.player.sprite, true);
    cam.setRoundPixels(true);

    this.hint = addText(this, 0, 0, '', 'tag', COLORS.ink, { backgroundColor: COLORS.accent, padding: { x: 3, y: 1 } })
      .setOrigin(0.5, 1)
      .setDepth(6000)
      .setVisible(false);

    this.keys = new ActionKeys(this, ['up', 'down', 'left', 'right', 'interact', 'crouchToggle', 'crouchHold', 'notebook', 'pause', 'coinAim']);
    s.onSignal = (e) => this.onSignal(e);
    s.onFlag = (f) => {
      // 같은 대화의 나머지 효과(칩 단서 등)가 적용된 뒤 저장하도록 한 틱 미룬다
      if (f === this.rules.silentAlarmFlag) this.time.delayedCall(0, () => this.onChipTaken());
    };
    this.subs.on('clue:added', ({ clue }) => {
      this.refreshItems();
      const obj = this.rules.clueObjectives?.[clue.id];
      if (obj) s.completeObjective(obj);
    });
    this.subs.on('objective:changed', () => this.updatePhase());

    // 물리 갱신 뒤 스프라이트를 충돌 박스에 맞춘다
    const sync = (): void => this.player.syncSprite();
    this.events.on(Phaser.Scenes.Events.POST_UPDATE, sync);
    this.scene.launch('HUD', { level: this.level.id });
    this.updatePhase();
    // 붙잡힘·재시작·이어하기 모두 알린다 (HUD 가 준비된 다음 틱)
    if (this.resumed) this.time.delayedCall(0, () => bus.emit('toast', { kind: 'info', text: '체크포인트에서 재개' }));

    // 일시정지에서 돌아오면 그 사이 눌린 키를 지운다
    const onResume = (): void => this.keys.reset();
    this.events.on(Phaser.Scenes.Events.RESUME, onResume);
    const onBlur = (): void => this.openPause();
    window.addEventListener('blur', onBlur);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.POST_UPDATE, sync);
      this.events.off(Phaser.Scenes.Events.RESUME, onResume);
      this.coinAim.destroy();
      window.removeEventListener('blur', onBlur);
      this.subs.clear();
      this.session.onSignal = null;
      this.session.onFlag = null;
      notebook.close();
      for (const k of ['HUD', 'Dialogue', 'Lockpick', 'Pause']) this.scene.stop(k);
    });
    fadeIn(this);
  }

  // ── 초기 배치 ──
  private spawnTile(): { tx: number; ty: number } {
    const id = this.session.checkpointId;
    const cp = id ? this.level.checkpoints.find((c) => c.id === id) : undefined;
    return cp?.spawn ?? this.level.player.spawn;
  }

  /** 줍기·열림·숨김 상태를 세션에 맞춘다 */
  private refreshItems(): void {
    for (const it of this.items) {
      const d = it.def;
      const gone = (d.kind === 'coinPickup' && this.session.flags.has(pickupFlag(d))) || (d.kind === 'lockedDoor' && this.session.openedDoors.has(d.id));
      const revealed = !d.revealedBy || this.session.hasClue(d.revealedBy);
      it.setState(gone, revealed);
    }
  }

  get phase(): Phase {
    if (this.level.guardsActive) return 'infiltrate';
    const objs = this.level.objectives;
    const cur = this.session.currentObjective;
    return cur && objs.length > 1 && cur.id === objs[objs.length - 1]!.id ? 'ending' : 'investigate';
  }

  /** L1 은 경비가 원뿔만 보이며 마지막 목표에서 지나간다 (AC-59) */
  private updatePhase(): void {
    if (!this.level.guardsActive) this.stealth.setVisible(this.phase === 'ending');
  }

  get rules(): LevelRules {
    return this.level.rules ?? {};
  }

  /** 검문이 아닌 대화 중 — 경비는 움직이되 게이지·경보 상태 머신은 멈춘다 (04 §9, AC-13) */
  private get frozenByDialogue(): boolean {
    return this.overlay === 'dialogue' && this.excuseGuard === null;
  }

  can(ability: 'crouch' | 'hide' | 'lockpick' | 'coin'): boolean {
    return abilitiesFor(this.level.id).some((a) => a.id === ability);
  }

  guardWorld(): GuardWorld {
    const p = this.player;
    return {
      grid: this.world.grid,
      alert: this.stealth.state,
      player: { feet: p.feet, crouched: p.crouched, hidden: p.hidden },
      // 검문 대화 중에는 감지하지 않는다
      detect: this.level.guardsActive && this.excuseGuard === null && !this.caught,
      highContrast: gameState.settings.highContrast,
      showBlink: this.rules.blinkRevealClue !== undefined && this.session.hasClue(this.rules.blinkRevealClue),
    };
  }

  // ── 매 프레임 ──
  update(_t: number, deltaMs: number): void {
    if (this.done) return;
    const dt = Math.min(deltaMs / 1000, 0.05);
    const s = this.session;
    s.elapsedSec += dt;

    const inputOk = this.overlay === 'none' && !this.caught;
    this.player.frozen = !inputOk || this.coinAim.aiming;
    this.player.update(inputOk ? this.keys : null, this.can('crouch'), dt);
    this.coinAim.update(inputOk && this.keys.down('coinAim'), this.can('coin') && s.coins > 0 && this.player.hide === 'none');

    if (this.level.guardsActive || this.phase === 'ending') this.stealth.update(dt, this.guardWorld(), this.frozenByDialogue);
    this.checkConeHint();
    s.alertCount = this.stealth.alert.alertCount;
    for (const it of this.items) it.update(dt);
    this.talkingTo?.faceToward(this.player.feet);

    if (inputOk) {
      if (this.keys.pressed('pause')) this.openPause();
      else if (this.keys.pressed('notebook')) this.openNotebook();
      else if (this.keys.pressed('interact')) this.interact();
    }
    this.updateHint();
    this.checkAreas();
  }

  /** 경비 원뿔에 처음 들어가면 한 번 안내한다 (L1 경찰 튜토리얼) */
  private checkConeHint(): void {
    const text = this.rules.coneHintText;
    if (!text || this.coneHintShown) return;
    if (this.stealth.guards.some((g) => g.zone !== 'none')) {
      this.coneHintShown = true;
      bus.emit('toast', { kind: 'warn', text });
    }
  }

  private updateHint(): void {
    const target = this.overlay === 'none' && !this.coinAim.aiming ? this.nearestTarget() : null;
    if (!target) {
      this.hint.setVisible(false);
      return;
    }
    const label = this.player.hide === 'hidden' ? '나오기' : target instanceof Npc ? '대화' : HINT_LABEL[target.def.kind];
    const pos = target instanceof Npc ? { x: target.pos.x, y: target.pos.y - 50 } : { x: target.pos.x, y: target.pos.y - 18 };
    this.hint.setText(`[E] ${label}`).setPosition(Math.round(pos.x), Math.round(pos.y)).setVisible(true);
  }

  private nearestTarget(): Npc | Interactable | null {
    const feet = this.player.feet;
    const range = TUNING.interactRangeTiles * TILE;
    let best: Npc | Interactable | null = null;
    let bestD = range;
    for (const n of this.npcs) {
      const d = dist(n.pos, feet);
      if (d <= bestD) [best, bestD] = [n, d];
    }
    for (const it of this.items) {
      if (!it.available) continue;
      if (it.def.kind === 'hide' && !this.can('hide')) continue;
      const d = dist(it.pos, feet);
      if (d <= bestD) [best, bestD] = [it, d];
    }
    return best;
  }

  // ── 상호작용 (E) ──
  interact(): void {
    if (this.player.hide === 'hidden') {
      this.player.leaveHide();
      return;
    }
    if (this.player.hide !== 'none') return;
    const target = this.nearestTarget();
    if (!target) return;
    if (target instanceof Npc) {
      this.talkingTo = target;
      this.openDialogue(target.def.dialogue);
      return;
    }
    this.useItem(target.def);
  }

  private useItem(d: InteractableDef): void {
    const s = this.session;
    switch (d.kind) {
      case 'inspect':
        if (d.dialogue) this.openDialogue(d.dialogue);
        break;
      case 'hide':
        this.enterHide(d);
        break;
      case 'lockedDoor':
        if (d.opensWithClue && s.hasClue(d.opensWithClue)) {
          bus.emit('toast', { kind: 'info', text: d.openText ?? '출입증으로 문을 열었다' });
          this.openDoor(d.id);
        } else if (this.can('lockpick')) this.openLockpick(d);
        else bus.emit('toast', { kind: 'warn', text: d.blockedText ?? '잠겨 있다' });
        break;
      case 'coinPickup':
        s.setFlag(pickupFlag(d));
        s.giveCoins(1);
        bus.emit('toast', { kind: 'info', text: `동전을 주웠다 (${s.coins}/${TUNING.coin.max})` });
        this.refreshItems();
        break;
      case 'exit': {
        const missing = (d.requires ?? []).filter((c) => !s.hasClue(c));
        if (missing.length > 0) bus.emit('toast', { kind: 'warn', text: d.blockedText ?? '아직 할 일이 남았다' });
        else this.completeLevel();
        break;
      }
    }
  }

  /** 은신 — 근거리에서 보고 있는 경비가 있으면 실패하고 발각 (AC-39) */
  private enterHide(d: InteractableDef): void {
    const w = this.guardWorld();
    const witness = w.detect ? this.stealth.guards.find((g) => g.seesNear(w, this.player.feet)) : undefined;
    if (witness) {
      witness.gauge = 1;
      this.stealth.forceAlert(this.player.feet);
      return;
    }
    for (const g of this.stealth.guards) g.gauge = 0;
    this.player.enterHide(tileToFeet(d.pos));
  }

  openDoor(id: string): void {
    this.session.openedDoors.add(id);
    this.world.openDoor(id);
    this.refreshItems();
  }

  // ── 오버레이 ──
  openDialogue(dialogueId: string, onEnd?: () => void): void {
    const excuse = dialogueId === EXCUSE_DIALOGUE_ID;
    const dialogue = excuse ? (findDialogue(this.level, dialogueId) ?? excuseDialogue()) : findDialogue(this.level, dialogueId);
    if (!dialogue) {
      console.warn(`대화 없음: ${dialogueId}`);
      return;
    }
    this.overlay = 'dialogue';
    this.player.stop();
    const data: DialogueLaunch = {
      dialogue,
      session: this.session,
      // 검문 대화의 경비 화자는 실제로 붙잡은 경비로 바꿔 보여 준다
      guardSpeaker: excuse ? this.excuseGuard?.def.character : undefined,
      onEnd: () => {
        this.overlay = 'none';
        this.talkingTo?.faceToward(null);
        this.talkingTo = null;
        this.keys.reset();
        onEnd?.();
        this.flushAlarm();
      },
    };
    this.scene.launch('Dialogue', data);
    this.scene.bringToTop('Dialogue');
  }

  private openLockpick(d: InteractableDef): void {
    this.overlay = 'lockpick';
    this.player.stop();
    this.scene.launch('Lockpick', {
      pins: d.pins ?? 3,
      onMiss: () => this.stealth.makeNoise(tileToFeet(d.pos), TUNING.lockpick.noiseTiles, this.guardWorld()),
      onClose: (opened: boolean) => {
        this.overlay = 'none';
        this.keys.reset();
        if (opened) {
          bus.emit('toast', { kind: 'info', text: '자물쇠를 열었다' });
          this.openDoor(d.id);
        }
      },
    });
    this.scene.bringToTop('Lockpick');
  }

  openNotebook(): void {
    if (this.overlay !== 'none' || this.caught || this.done || this.scene.isPaused() || this.scene.isActive('Pause')) return;
    this.overlay = 'notebook';
    this.player.stop();
    this.scene.pause();
    notebook.open({
      session: this.session,
      mode: 'view',
      onClose: () => {
        this.overlay = 'none';
        this.scene.resume();
        this.keys.reset();
      },
    });
  }

  openPause(): void {
    if (this.done || this.caught || this.scene.isPaused() || this.scene.isActive('Pause') || notebook.isOpen) return;
    this.scene.launch('Pause', { level: this.level.id });
    this.scene.bringToTop('Pause');
  }

  // ── 영역: 체크포인트·구역 ──
  private checkAreas(): void {
    const t = worldToTile(this.player.feet);
    for (const cp of this.level.checkpoints) {
      if (!this.reachedCheckpoints.has(cp.id) && inRect(t, cp.area)) {
        this.reachedCheckpoints.add(cp.id);
        this.saveCheckpoint(cp.id);
      }
    }
    const zone = this.level.zones.find((z) => inRect(t, z.area)) ?? null;
    if ((zone?.id ?? null) !== this.zoneId) {
      this.zoneId = zone?.id ?? null;
      if (zone?.kind === 'staff') {
        // 직원 전용 구역 진입 알림 (AC-41)
        bus.emit('toast', { kind: 'warn', text: `직원 전용 구역 — ${zone.label}` });
        if (this.rules.staffZoneObjective) this.session.completeObjective(this.rules.staffZoneObjective);
      } else if (zone) bus.emit('toast', { kind: 'info', text: zone.label });
    }
  }

  saveCheckpoint(id: string): void {
    this.session.checkpointId = id;
    gameState.store.saveCheckpoint(this.session.toCheckpoint(id));
    bus.emit('checkpoint:saved', { id });
  }

  private currentZone(): ZoneDef | undefined {
    const t = worldToTile(this.player.feet);
    return this.level.zones.find((z) => inRect(t, z.area));
  }

  // ── 검문 (AC-40, 41) ──
  private tryExcuse(guard: Guard): boolean {
    const zone = this.currentZone();
    if (zone?.kind !== 'guest' || this.session.usedExcuseGuards.has(guard.id) || this.overlay !== 'none') return false;
    this.excuseGuard = guard;
    this.excuseAccepted = false;
    guard.hold(true, this.world.grid);
    for (const g of this.stealth.guards) g.gauge = 0;
    this.openDialogue(EXCUSE_DIALOGUE_ID, () => this.finishExcuse());
    return true;
  }

  private finishExcuse(): void {
    const guard = this.excuseGuard;
    this.excuseGuard = null;
    if (!guard) return;
    this.session.usedExcuseGuards.add(guard.id);
    guard.hold(false, this.world.grid);
    if (this.excuseAccepted) {
      this.player.setFeet(tileToFeet(this.world.nearestWalkable(this.excuseReturnTile())));
      this.stealth.enterCaution();
    } else this.pendingAlarm = true;
  }

  /** 돌려보낼 위치: rules.excuseReturnZone 구역 중심(없으면 가장 큰 손님 구역) */
  private excuseReturnTile(): { tx: number; ty: number } {
    const guests = this.level.zones.filter((z) => z.kind === 'guest');
    const hall = guests.find((z) => z.id === this.rules.excuseReturnZone) ?? [...guests].sort((a, b) => b.area.w * b.area.h - a.area.w * a.area.h)[0];
    if (!hall) return this.level.player.spawn;
    return { tx: hall.area.tx + Math.floor(hall.area.w / 2), ty: hall.area.ty + Math.floor(hall.area.h / 2) };
  }

  // ── 신호 효과 ──
  private onSignal(e: SignalEffect): void {
    if (e.type === 'endLevel') this.time.delayedCall(50, () => this.completeLevel());
    else if (e.type === 'triggerAlarm') this.raiseAlarm();
    else if (e.type === 'excuseAccepted') this.excuseAccepted = true;
  }

  /** 칩 획득 직전 체크포인트 저장 후 무음 경보 (AC-61) */
  private onChipTaken(): void {
    const feet = this.player.feet;
    const nearest = [...this.level.checkpoints].sort((a, b) => dist(tileToFeet(a.spawn), feet) - dist(tileToFeet(b.spawn), feet))[0];
    if (nearest) {
      this.reachedCheckpoints.add(nearest.id);
      this.saveCheckpoint(nearest.id);
    }
    this.raiseAlarm();
  }

  /** 경보 — 대화 중이면 대화가 닫힌 직후로 미룬다 */
  private raiseAlarm(): void {
    this.pendingAlarm = true;
    if (this.overlay !== 'dialogue') this.flushAlarm();
  }

  private flushAlarm(): void {
    if (!this.pendingAlarm || this.caught || this.done) return;
    this.pendingAlarm = false;
    this.stealth.forceAlert(this.player.feet);
    bus.emit('toast', { kind: 'warn', text: '경보가 울렸다!' });
  }

  // ── 붙잡힘 → 체크포인트 (AC-36, 52, 03 §6) ──
  private onCaught(guard: Guard): void {
    if (this.caught) return;
    this.caught = true;
    this.player.stop();
    this.player.resetHide();
    this.scene.stop('Lockpick');
    this.scene.stop('Dialogue');
    bus.emit('player:caught', { by: guard.id });
    this.time.delayedCall(300, () => this.cameras.main.fadeOut(250, 213, 94, 0));
    this.time.delayedCall(700, () => this.restartFromCheckpoint());
  }

  restartFromCheckpoint(): void {
    const launch: LevelLaunch = { level: this.level.id, fromCheckpoint: true, returning: true };
    this.scene.restart(launch);
  }

  // ── 클리어 ──
  completeLevel(): void {
    if (this.done) return;
    this.done = true;
    const s = this.session;
    for (const o of this.level.objectives) s.objectivesDone.add(o.id);
    const stats = s.stats();
    const grade = computeGrade(stats, this.level.targetTimeSec);
    const prevBest = gameState.data.bestGrade[this.level.id];
    const { data, newBest } = applyLevelClear(gameState.data, this.level.id, grade, s.carryOverClues());
    gameState.save(data);
    if (gameState.checkpoint()?.level === this.level.id) gameState.store.clearCheckpoint();
    startSnapshot = null;
    setSession(null);
    bus.emit('level:complete', { stats });
    fadeTo(this, 'Result', { stats, grade, newBest, prevBest, level: this.level.id });
  }

  /** 테스트 API: 타일로 순간이동 */
  teleport(tx: number, ty: number): void {
    this.player.resetHide();
    this.player.setFeet(tileToFeet({ tx, ty }));
  }
}

function pickupFlag(d: InteractableDef): string {
  return `pickup:${d.id}`;
}

function inRect(t: { tx: number; ty: number }, r: TileRect): boolean {
  return t.tx >= r.tx && t.tx < r.tx + r.w && t.ty >= r.ty && t.ty < r.ty + r.h;
}
