/**
 * Domain model: SavedService (Phase C4).
 *
 * A reusable service/labour line for the quick-pick on a service bill. Like a
 * product but identified by name (no barcode) and carrying a SAC code.
 */
export interface SavedService {
  id: number;
  name: string;
  price: number;
  /** SAC code, when the shop bills GST. */
  sacCode: string | null;
  gstRate: number;
  createdAt: number;
  updatedAt: number;
}

/** Values used to save/reuse a service (upsert by name). */
export interface NewServiceInput {
  name: string;
  price: number;
  sacCode?: string | null;
  gstRate?: number;
}
