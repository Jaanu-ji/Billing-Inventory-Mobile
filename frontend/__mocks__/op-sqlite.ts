/**
 * Jest mock for @op-engineering/op-sqlite.
 *
 * Unit tests exercise pure logic with an in-memory fake repository, so they
 * never touch a real database. This stub just lets the import chain load under
 * Jest (the native module isn't available outside a device/emulator).
 */
export function open(): any {
  return {
    execute: async () => ({rows: [], rowsAffected: 0, insertId: 0}),
    transaction: async (fn: (tx: any) => Promise<void>) => {
      await fn({
        execute: async () => ({rows: [], rowsAffected: 0, insertId: 0}),
      });
    },
  };
}
