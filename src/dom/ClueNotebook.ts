// O2 단서 수첩 (DOM) — 탭(인물/문서/물건)·카드·상세·제시 모드·L3 연결 모드 (AC-20~23, 03 §2 O2)
import type Phaser from 'phaser';
import type { ClueDef, ClueId, ClueKind } from '../types';
import type { LevelSession } from '../state/session';

export interface NotebookOptions {
  session: LevelSession;
  mode: 'view' | 'present';
  /** 제시 모드: "누구에게" */
  target?: string;
  onPresent?: (id: ClueId) => void;
  /** presented = 단서를 제시하고 닫혔는지 */
  onClose?: (presented: boolean) => void;
}

const TABS: { kind: ClueKind; label: string }[] = [
  { kind: 'person', label: '인물' },
  { kind: 'document', label: '문서' },
  { kind: 'item', label: '물건' },
];
const COLS = 4;
const EMPTY = '아직 모은 단서가 없습니다. 사람들과 대화하거나 주변을 조사해 보세요.';

class ClueNotebook {
  private game: Phaser.Game | null = null;
  private root: HTMLElement | null = null;
  private opts: NotebookOptions | null = null;
  private tab = 0;
  private index = 0;
  private pending: ClueId | null = null;
  private message = '';
  /** 이번에 연 동안 NEW 로 보여 줄 단서 */
  private fresh = new Set<ClueId>();
  private readonly onKey = (e: KeyboardEvent): void => this.handleKey(e);

  attach(game: Phaser.Game): void {
    this.game = game;
  }

  get isOpen(): boolean {
    return this.opts !== null;
  }

  open(opts: NotebookOptions): void {
    if (this.opts) this.close();
    this.opts = opts;
    this.pending = null;
    this.message = '';
    this.fresh = new Set(opts.session.unseen);
    opts.session.unseen.clear(); // 배지는 수첩을 열면 사라진다 (AC-20)
    // 처음엔 단서가 있는 첫 탭
    const first = TABS.findIndex((t) => this.cluesOf(t.kind).length > 0);
    this.tab = first < 0 ? 0 : first;
    this.index = 0;
    if (this.game?.input.keyboard) this.game.input.keyboard.enabled = false;
    window.addEventListener('keydown', this.onKey, true);
    this.root = document.createElement('div');
    this.root.className = 'nb';
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-label', '단서 수첩');
    document.getElementById('ui-root')?.appendChild(this.root);
    this.render();
  }

  close(presented = false): void {
    const opts = this.opts;
    if (!opts) return;
    this.opts = null;
    window.removeEventListener('keydown', this.onKey, true);
    this.root?.remove();
    this.root = null;
    if (this.game?.input.keyboard) this.game.input.keyboard.enabled = true;
    opts.onClose?.(presented);
  }

  // ── 데이터 ──
  private cluesOf(kind: ClueKind): ClueDef[] {
    return this.opts?.session.clues.list().filter((c) => c.kind === kind) ?? [];
  }

  private get current(): ClueDef[] {
    return this.cluesOf(TABS[this.tab]!.kind);
  }

  private get selected(): ClueDef | undefined {
    return this.current[this.index];
  }

  private get canCombine(): boolean {
    return this.opts?.mode === 'view' && (this.opts.session.level.combos.length ?? 0) > 0;
  }

  // ── 동작 ──
  private presentSelected(): void {
    const c = this.selected;
    const opts = this.opts;
    if (!c || opts?.mode !== 'present') return;
    this.close(true);
    opts.onPresent?.(c.id);
  }

  /** L3 연결: 첫 단서를 고르고 두 번째를 고르면 연결 (AC-23) */
  private combineSelected(): void {
    const c = this.selected;
    const s = this.opts?.session;
    if (!c || !s || !this.canCombine) return;
    if (!this.pending || this.pending === c.id) {
      this.pending = this.pending === c.id ? null : c.id;
      this.message = this.pending ? '연결할 두 번째 단서를 고르세요.' : '';
    } else {
      const result = s.combine(this.pending, c.id);
      const name = result ? s.clues.list().find((d) => d.id === result)?.name : null;
      this.message = name ? `새 단서: ${name}` : '연결되지 않는다.';
      if (result) {
        s.unseen.delete(result);
        this.fresh.add(result);
      }
      this.pending = null;
    }
    this.render();
  }

  private setTab(t: number): void {
    this.tab = (t + TABS.length) % TABS.length;
    this.index = 0;
    this.render();
  }

  private handleKey(e: KeyboardEvent): void {
    if (!this.opts) return;
    const n = this.current.length;
    let handled = true;
    switch (e.code) {
      case 'Escape':
      case 'Tab':
        this.close();
        break;
      case 'KeyQ':
        this.setTab(this.tab - 1);
        break;
      case 'KeyE':
        this.setTab(this.tab + 1);
        break;
      case 'ArrowLeft':
        this.move(-1, n);
        break;
      case 'ArrowRight':
        this.move(1, n);
        break;
      case 'ArrowUp':
        this.move(-COLS, n);
        break;
      case 'ArrowDown':
        this.move(COLS, n);
        break;
      case 'Enter':
      case 'Space':
        if (this.opts.mode === 'present') this.presentSelected();
        else if (this.canCombine) this.combineSelected();
        break;
      default:
        handled = false;
    }
    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  private move(d: number, n: number): void {
    if (n === 0) return;
    this.index = Math.min(n - 1, Math.max(0, this.index + d));
    this.render();
  }

  // ── 그리기 ──
  private render(): void {
    const root = this.root;
    const opts = this.opts;
    if (!root || !opts) return;
    root.replaceChildren();
    const total = opts.session.clues.list().length;

    const head = el('div', 'nb-head');
    head.append(el('span', 'nb-title', '단서 수첩'));
    const tabs = el('div', 'nb-tabs');
    tabs.setAttribute('role', 'tablist');
    TABS.forEach((t, i) => {
      const b = el('button', `nb-tab${i === this.tab ? ' on' : ''}`, `${t.label} ${this.cluesOf(t.kind).length}`);
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(i === this.tab));
      b.onclick = () => this.setTab(i);
      tabs.append(b);
    });
    head.append(tabs);
    const x = el('button', 'nb-close', '✕ Esc');
    x.onclick = () => this.close();
    head.append(x);
    root.append(head);

    if (opts.mode === 'present') root.append(el('div', 'nb-band', `누구에게: ${opts.target ?? ''}  —  제시할 단서를 고르세요`));

    const body = el('div', 'nb-body');
    const grid = el('div', 'nb-grid');
    const list = this.current;
    if (list.length === 0) grid.append(el('p', 'nb-empty', opts.mode === 'present' && total === 0 ? '제시할 단서가 없습니다.' : EMPTY));
    list.forEach((c, i) => {
      const card = el('button', `nb-card${i === this.index ? ' sel' : ''}${this.pending === c.id ? ' pend' : ''}`);
      card.append(el('span', 'nb-card-kind', TABS.find((t) => t.kind === c.kind)!.label));
      card.append(el('span', 'nb-card-name', c.name));
      if (this.fresh.has(c.id)) card.append(el('span', 'nb-new', 'NEW'));
      card.onclick = () => {
        this.index = i;
        this.render();
      };
      card.ondblclick = () => (opts.mode === 'present' ? this.presentSelected() : this.combineSelected());
      grid.append(card);
    });
    body.append(grid, this.detail());
    root.append(body);

    const enter = opts.mode === 'present' ? ' · Enter 제시' : this.canCombine ? ' · Enter 연결' : '';
    const foot = el('div', 'nb-foot', `Q/E 탭 · 방향키 이동${enter} · Esc 닫기`);
    root.append(foot);
  }

  private detail(): HTMLElement {
    const d = el('div', 'nb-detail');
    const c = this.selected;
    const opts = this.opts!;
    if (!c) {
      d.append(el('p', 'nb-dim', '단서를 고르면 자세히 볼 수 있습니다.'));
      if (opts.mode === 'present') {
        const b = el('button', 'nb-btn', '닫기');
        b.onclick = () => this.close();
        d.append(b);
      }
      return d;
    }
    d.append(el('h3', 'nb-name', c.name));
    d.append(el('p', 'nb-desc', c.description));
    d.append(el('p', 'nb-src', `출처: ${c.source}`));
    if (c.carryOver) d.append(el('p', 'nb-dim', '다음 임무로 가져감'));
    if (opts.mode === 'present') {
      const b = el('button', 'nb-btn', '이 단서 제시 Enter');
      b.onclick = () => this.presentSelected();
      d.append(b);
    } else if (this.canCombine) {
      const label = this.pending && this.pending !== c.id ? '이 단서와 연결 Enter' : this.pending === c.id ? '연결 취소' : '연결하기 Enter';
      const b = el('button', 'nb-btn', label);
      b.onclick = () => this.combineSelected();
      d.append(b);
    }
    if (this.message) d.append(el('p', 'nb-msg', this.message));
    return d;
  }
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = cls;
  if (text !== undefined) e.textContent = text;
  if (e instanceof HTMLButtonElement) e.type = 'button';
  return e;
}

export const notebook = new ClueNotebook();
