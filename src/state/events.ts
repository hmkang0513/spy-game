// 타입이 붙은 EventBus (04_상세설계서 §2.7). 씬 사이 통신에 쓴다.
import type { GameEventName, GameEvents } from '../types';

type Handler<K extends GameEventName> = (payload: GameEvents[K]) => void;

class EventBus {
  private readonly handlers = new Map<GameEventName, Set<Handler<never>>>();

  /** 구독하고, 구독 해제 함수를 돌려준다 */
  on<K extends GameEventName>(name: K, handler: Handler<K>): () => void {
    let set = this.handlers.get(name);
    if (!set) {
      set = new Set();
      this.handlers.set(name, set);
    }
    set.add(handler as Handler<never>);
    return () => set.delete(handler as Handler<never>);
  }

  emit<K extends GameEventName>(name: K, payload: GameEvents[K]): void {
    const set = this.handlers.get(name);
    if (!set) return;
    for (const h of [...set]) (h as Handler<K>)(payload);
  }
}

export const bus = new EventBus();

/** 씬이 끝날 때 한꺼번에 해제할 구독 묶음 */
export class Subscriptions {
  private offs: (() => void)[] = [];

  on<K extends GameEventName>(name: K, handler: Handler<K>): void {
    this.offs.push(bus.on(name, handler));
  }

  clear(): void {
    for (const off of this.offs) off();
    this.offs = [];
  }
}
