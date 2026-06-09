/**
 * Sync engine tests (Phase K) — pure, no DB / no network. Drives the SyncEngine
 * against in-memory fakes for the outbox, cursors, local store and transport.
 */
import {SyncEngine} from '../src/services/sync/SyncEngine';
import {toRemoteRow} from '../src/services/sync/LocalSyncStore';
import type {
  ISyncMetaRepository,
  ISyncQueueRepository,
} from '../src/repositories/ISyncRepository';
import type {ILocalSyncStore} from '../src/services/sync/LocalSyncStore';
import type {
  ISyncTransport,
  PullPage,
  RemoteRow,
} from '../src/services/sync/SyncTransport';
import type {SyncOp, SyncQueueItem, SyncableTable} from '../src/models/Sync';

class FakeQueue implements ISyncQueueRepository {
  items: SyncQueueItem[] = [];
  private seq = 1;
  async enqueue(tableName: SyncableTable, rowId: number, op: SyncOp) {
    this.items = this.items.filter(
      i => !(i.tableName === tableName && i.rowId === rowId),
    );
    this.items.push({id: this.seq++, tableName, rowId, op, createdAt: 0, attempts: 0});
  }
  async nextBatch(limit: number) {
    return this.items.slice(0, limit);
  }
  async remove(ids: number[]) {
    this.items = this.items.filter(i => !ids.includes(i.id));
  }
  async bumpAttempts(ids: number[]) {
    for (const i of this.items) {
      if (ids.includes(i.id)) {
        i.attempts += 1;
      }
    }
  }
  async dropExhausted(maxAttempts: number) {
    const before = this.items.length;
    this.items = this.items.filter(i => i.attempts < maxAttempts);
    return before - this.items.length;
  }
  async pendingRowIds(tableName: SyncableTable) {
    return new Set(this.items.filter(i => i.tableName === tableName).map(i => i.rowId));
  }
  async count() {
    return this.items.length;
  }
}

class FakeMeta implements ISyncMetaRepository {
  cursors = new Map<SyncableTable, number>();
  async getCursor(t: SyncableTable) {
    return this.cursors.get(t) ?? 0;
  }
  async setCursor(t: SyncableTable, v: number) {
    this.cursors.set(t, v);
  }
}

class FakeStore implements ILocalSyncStore {
  rows: Partial<Record<SyncableTable, Map<number, RemoteRow>>> = {};
  applied: {table: SyncableTable; rows: RemoteRow[]}[] = [];
  seed(table: SyncableTable, rows: RemoteRow[]) {
    this.rows[table] = new Map(rows.map(r => [Number(r.id), r]));
  }
  async fetchRows(table: SyncableTable, ids: number[]) {
    const m = this.rows[table];
    return ids.map(id => m?.get(id)).filter(Boolean) as RemoteRow[];
  }
  async applyRemote(table: SyncableTable, rows: RemoteRow[]) {
    this.applied.push({table, rows});
  }
}

class FakeTransport implements ISyncTransport {
  upserts: {table: SyncableTable; rows: RemoteRow[]}[] = [];
  removes: {table: SyncableTable; ids: number[]}[] = [];
  pages: Partial<Record<SyncableTable, PullPage>> = {};
  failUpsert = false;
  async upsert(table: SyncableTable, rows: RemoteRow[]) {
    if (this.failUpsert) {
      throw new Error('network down');
    }
    this.upserts.push({table, rows});
  }
  async remove(table: SyncableTable, ids: number[]) {
    this.removes.push({table, ids});
  }
  async pullSince(table: SyncableTable, cursorMs: number): Promise<PullPage> {
    return this.pages[table] ?? {rows: [], latest: cursorMs};
  }
}

const CFG = {pushBatchSize: 50, pullPageSize: 200, maxAttempts: 3};

function make(over?: {
  queue?: FakeQueue;
  meta?: FakeMeta;
  store?: FakeStore;
  transport?: FakeTransport;
}) {
  const queue = over?.queue ?? new FakeQueue();
  const meta = over?.meta ?? new FakeMeta();
  const store = over?.store ?? new FakeStore();
  const transport = over?.transport ?? new FakeTransport();
  const engine = new SyncEngine(queue, meta, store, transport, CFG);
  return {engine, queue, meta, store, transport};
}

describe('toRemoteRow (push payload shaping)', () => {
  it('parses local TEXT-JSON columns into objects for cloud jsonb', () => {
    const out = toRemoteRow('products', {
      id: 1,
      attributes: '{"batch":"DL2207"}',
    });
    expect(out.attributes).toEqual({batch: 'DL2207'});
  });

  it('null-coerces empty / invalid JSON', () => {
    expect(toRemoteRow('products', {id: 1, attributes: ''}).attributes).toBeNull();
    expect(toRemoteRow('products', {id: 1, attributes: 'not json'}).attributes).toBeNull();
    expect(toRemoteRow('parked_bills', {id: 1, items_json: '[]'}).items_json).toEqual([]);
  });

  it('converts local 0/1 booleans to real booleans', () => {
    expect(toRemoteRow('bills', {id: 1, is_inter_state: 1}).is_inter_state).toBe(true);
    expect(toRemoteRow('bills', {id: 1, is_inter_state: 0}).is_inter_state).toBe(false);
    expect(toRemoteRow('shop_profile', {id: 1, gst_enabled: 1}).gst_enabled).toBe(true);
  });

  it('leaves non-special columns untouched', () => {
    const out = toRemoteRow('products', {id: 1, name: 'A', price: 10});
    expect(out).toMatchObject({id: 1, name: 'A', price: 10});
  });

  it('strips the device-local updated_at (cloud owns its own LWW clock)', () => {
    const out = toRemoteRow('customers', {id: 1, name: 'Ram', updated_at: 123});
    expect(out.updated_at).toBeUndefined();
    expect(out).toMatchObject({id: 1, name: 'Ram'});
  });
});

describe('SyncEngine.push', () => {
  it('pushes upserts with live rows and clears the outbox', async () => {
    const {engine, queue, store, transport} = make();
    store.seed('products', [{id: 1, name: 'A'}, {id: 2, name: 'B'}]);
    await queue.enqueue('products', 1, 'upsert');
    await queue.enqueue('products', 2, 'upsert');

    const res = await engine.push();
    expect(res.pushed).toBe(2);
    expect(transport.upserts[0].rows.map(r => r.id).sort()).toEqual([1, 2]);
    expect(await queue.count()).toBe(0);
  });

  it('pushes deletes by id', async () => {
    const {engine, queue, transport} = make();
    await queue.enqueue('customers', 7, 'delete');
    await engine.push();
    expect(transport.removes).toEqual([{table: 'customers', ids: [7]}]);
    expect(await queue.count()).toBe(0);
  });

  it('keeps ops and bumps attempts when the transport fails', async () => {
    const transport = new FakeTransport();
    transport.failUpsert = true;
    const {engine, queue, store} = make({transport});
    store.seed('products', [{id: 1, name: 'A'}]);
    await queue.enqueue('products', 1, 'upsert');

    const res = await engine.push();
    expect(res.pushFailed).toBe(1);
    expect(queue.items[0].attempts).toBe(1);
    expect(await queue.count()).toBe(1); // retained for retry
  });

  it('drops poison ops after maxAttempts', async () => {
    const transport = new FakeTransport();
    transport.failUpsert = true;
    const {engine, queue, store} = make({transport});
    store.seed('products', [{id: 1, name: 'A'}]);
    await queue.enqueue('products', 1, 'upsert');
    // 3 failed passes => attempts hits maxAttempts (3) => dropped.
    await engine.push();
    await engine.push();
    await engine.push();
    expect(await queue.count()).toBe(0);
  });
});

describe('SyncEngine.pull', () => {
  it('applies remote rows and advances the cursor', async () => {
    const transport = new FakeTransport();
    transport.pages.products = {
      rows: [{id: 5, name: 'Cloud'}],
      latest: 1234,
    };
    const {engine, store, meta} = make({transport});
    const n = await engine.pull();
    expect(n).toBe(1);
    expect(store.applied[0]).toEqual({table: 'products', rows: [{id: 5, name: 'Cloud'}]});
    expect(await meta.getCursor('products')).toBe(1234);
  });

  it('skips a remote row that has a pending local op (local wins)', async () => {
    const transport = new FakeTransport();
    transport.pages.products = {rows: [{id: 9, name: 'Cloud'}], latest: 50};
    const queue = new FakeQueue();
    await queue.enqueue('products', 9, 'upsert'); // unpushed local edit
    const {engine, store} = make({transport, queue});

    await engine.pull();
    const productsApply = store.applied.find(a => a.table === 'products');
    expect(productsApply?.rows ?? []).toEqual([]); // row 9 skipped
  });
});

describe('SyncEngine.sync', () => {
  it('pushes then pulls', async () => {
    const transport = new FakeTransport();
    transport.pages.products = {rows: [{id: 3, name: 'C'}], latest: 10};
    const {engine, queue, store} = make({transport});
    store.seed('customers', [{id: 1, name: 'Ram'}]);
    await queue.enqueue('customers', 1, 'upsert');

    const res = await engine.sync();
    expect(res.pushed).toBe(1);
    expect(res.pulled).toBe(1);
  });
});
