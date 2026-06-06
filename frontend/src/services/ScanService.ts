import {Config} from '../constants/config';
import {TimeGate} from '../utils/debounce';
import {productRepository} from '../repositories/ProductRepository';
import type {IProductRepository} from '../repositories/IProductRepository';
import type {Product, NewProductInput} from '../models/Product';

/**
 * Result of processing a scanned barcode.
 *  - 'known'   : product found, show the matched card.
 *  - 'unknown' : new barcode, prompt for name + price.
 *  - 'ignored' : same barcode fired again within the debounce window.
 */
export type ScanOutcome =
  | {type: 'known'; product: Product}
  | {type: 'unknown'; barcode: string}
  | {type: 'ignored'};

/**
 * All scan business logic lives here, separate from the camera UI.
 * The screen just feeds raw barcode strings in and reacts to the outcome.
 */
export class ScanService {
  private readonly gate: TimeGate;

  constructor(
    private readonly repo: IProductRepository = productRepository,
    debounceMs: number = Config.scanDebounceMs,
  ) {
    this.gate = new TimeGate(debounceMs);
  }

  /**
   * Process one detected barcode. Applies debounce, then looks it up.
   * One physical scan => one meaningful outcome.
   */
  async handleScan(barcode: string): Promise<ScanOutcome> {
    const code = barcode.trim();
    if (code.length === 0) {
      return {type: 'ignored'};
    }
    if (!this.gate.shouldPass(code)) {
      return {type: 'ignored'};
    }
    const product = await this.repo.findByBarcode(code);
    if (product) {
      return {type: 'known', product};
    }
    return {type: 'unknown', barcode: code};
  }

  /** Save a brand-new product captured from the "unknown barcode" form. */
  async saveNewProduct(input: NewProductInput): Promise<Product> {
    return this.repo.create(input);
  }

  /**
   * Let a barcode be processed again immediately (e.g. after the user closes
   * the new-product form) instead of waiting out the debounce window.
   */
  allowImmediateRescan(barcode: string): void {
    this.gate.reset(barcode.trim());
  }
}

/** Shared instance for the app. */
export const scanService = new ScanService();
