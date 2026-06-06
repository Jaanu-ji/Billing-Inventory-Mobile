/**
 * PdfService — turns a saved bill into a clean A4 invoice PDF.
 *
 * Two responsibilities, kept separate so the template can be unit-tested without
 * a device:
 *   - `buildBillHtml(bill, profile)` : PURE. Shapes the Bill / BillItem /
 *     ShopProfile models into a self-contained HTML invoice string. No native
 *     code, no I/O — fully testable in Jest.
 *   - `generateBillPdf(bill, profile)` : renders that HTML to a real PDF file in
 *     the app's (scoped) Documents dir and returns its path. The only part that
 *     touches the native module.
 *
 * The same template handles BOTH a simple (kacha) bill and a GST (pakka) bill —
 * the GST sections are shown conditionally from the fields already stored on the
 * bill, so nothing is recomputed here.
 *
 * Future: thermal print and cloud backup can reuse PdfService / bill data here.
 */
import {generatePDF} from 'react-native-html-to-pdf';
import {Config} from '../constants/config';
import {shopTypeLabel} from '../constants/shopTypes';
import {formatDateTime} from '../utils/format';
import type {Bill, BillItem} from '../models/Bill';
import type {ShopProfile} from '../models/ShopProfile';

/** Result of rendering a bill to disk. */
export interface GeneratedPdf {
  /** Absolute path to the written .pdf file. */
  filePath: string;
  /** `invoice-<billNumber>.pdf` — used as the share/attachment name. */
  fileName: string;
}

/** Invoice money format: always 2 decimals (clarity on a printed bill). */
function inr(n: number): string {
  const amount = Number.isFinite(n) ? n : 0;
  return `${Config.currencySymbol}${amount.toFixed(2)}`;
}

/** Escape user-entered text so a stray <, > or & can't break the HTML. */
function esc(value: string | null | undefined): string {
  if (value == null) {
    return '';
  }
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** One row of the items table; GST columns are only rendered for a GST bill. */
function itemRow(item: BillItem, index: number, isGst: boolean): string {
  const hsn = isGst ? `<td class="c">${esc(item.hsnCode) || '-'}</td>` : '';
  const rate = isGst ? `<td class="c">${item.gstRate}%</td>` : '';
  return `
    <tr>
      <td class="c">${index + 1}</td>
      <td>${esc(item.name)}</td>
      ${hsn}
      <td class="c">${item.quantity}</td>
      <td class="r">${inr(item.price)}</td>
      ${rate}
      <td class="r">${inr(item.lineTotal)}</td>
    </tr>`;
}

/**
 * Build the full invoice HTML for a bill. Pure — exported for unit testing.
 * `bill.items` must be populated (BillRepository.getById and .create both do so).
 */
export function buildBillHtml(bill: Bill, profile: ShopProfile | null): string {
  const isGst = bill.billType === 'gst';
  const items = bill.items ?? [];
  // Place of supply: customer's state if captured, else the shop's own state.
  const placeOfSupply = bill.customerState ?? profile?.state ?? null;

  // ---- Header (shop) ----
  const shopName = esc(profile?.shopName) || 'Invoice';
  const shopLines: string[] = [];
  if (profile) {
    shopLines.push(esc(shopTypeLabel(profile.shopType)));
    if (profile.address) {
      shopLines.push(esc(profile.address));
    }
    if (profile.phone) {
      shopLines.push(`Ph: ${esc(profile.phone)}`);
    }
    if (profile.gstEnabled && profile.gstin) {
      shopLines.push(`GSTIN: ${esc(profile.gstin)}`);
    }
  }

  // ---- Bill-to (customer) ----
  const billToLines: string[] = [];
  if (bill.customerName) {
    billToLines.push(`<strong>${esc(bill.customerName)}</strong>`);
  }
  if (bill.customerPhone) {
    billToLines.push(`Ph: ${esc(bill.customerPhone)}`);
  }
  if (isGst && bill.customerGstin) {
    billToLines.push(`GSTIN: ${esc(bill.customerGstin)}`);
  }
  if (isGst && placeOfSupply) {
    billToLines.push(`Place of supply: ${esc(placeOfSupply)}`);
  }
  const billToBlock = billToLines.length
    ? `<div class="party">
         <div class="party-label">Bill to</div>
         ${billToLines.map(l => `<div>${l}</div>`).join('')}
       </div>`
    : '';

  // ---- Items table head ----
  const headCols = isGst
    ? `<th class="c">#</th><th>Item</th><th class="c">HSN</th>
       <th class="c">Qty</th><th class="r">Rate</th>
       <th class="c">GST</th><th class="r">Taxable</th>`
    : `<th class="c">#</th><th>Item</th>
       <th class="c">Qty</th><th class="r">Rate</th><th class="r">Amount</th>`;
  const rows = items.map((it, i) => itemRow(it, i, isGst)).join('');
  const colSpan = isGst ? 6 : 4;

  // ---- Totals ----
  const totalRows: string[] = [
    `<tr><td class="r tlabel" colspan="${colSpan}">${
      isGst ? 'Taxable value' : 'Subtotal'
    }</td><td class="r">${inr(bill.subtotal)}</td></tr>`,
  ];
  if (isGst && !bill.isInterState) {
    totalRows.push(
      `<tr><td class="r tlabel" colspan="${colSpan}">CGST</td><td class="r">${inr(
        bill.cgst,
      )}</td></tr>`,
      `<tr><td class="r tlabel" colspan="${colSpan}">SGST</td><td class="r">${inr(
        bill.sgst,
      )}</td></tr>`,
    );
  }
  if (isGst && bill.isInterState) {
    totalRows.push(
      `<tr><td class="r tlabel" colspan="${colSpan}">IGST</td><td class="r">${inr(
        bill.igst,
      )}</td></tr>`,
    );
  }
  totalRows.push(
    `<tr class="grand"><td class="r tlabel" colspan="${colSpan}">Total</td><td class="r">${inr(
      bill.total,
    )}</td></tr>`,
  );

  // ---- Footer ----
  const declaration = isGst
    ? `<p class="decl">Declaration: We declare that this invoice shows the actual
       price of the goods described and that all particulars are true and correct.</p>`
    : '';
  const docTitle = isGst ? 'TAX INVOICE' : 'INVOICE';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: Helvetica, Arial, sans-serif; color: #1a1a1a; font-size: 12px; margin: 0; padding: 24px; }
  .top { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #222; padding-bottom: 12px; }
  .shop-name { font-size: 22px; font-weight: 800; margin: 0 0 4px; }
  .shop-meta { color: #555; line-height: 1.5; }
  .doc-type { text-align: right; }
  .doc-type .badge { display: inline-block; border: 1.5px solid #222; border-radius: 4px; padding: 4px 10px; font-weight: 800; letter-spacing: 1px; }
  .doc-type .meta { color: #555; margin-top: 8px; line-height: 1.6; }
  .meta strong { color: #1a1a1a; }
  .parties { display: flex; justify-content: space-between; margin: 18px 0; }
  .party { line-height: 1.5; }
  .party-label { text-transform: uppercase; font-size: 10px; letter-spacing: 1px; color: #888; margin-bottom: 4px; }
  table.items { width: 100%; border-collapse: collapse; margin-top: 6px; }
  table.items th { background: #f0f2f5; text-align: left; padding: 8px; border-bottom: 1.5px solid #ccc; font-size: 11px; }
  table.items td { padding: 8px; border-bottom: 1px solid #eee; }
  .c { text-align: center; }
  .r { text-align: right; }
  .tlabel { color: #555; border-bottom: none; }
  tr.grand td { border-top: 2px solid #222; font-size: 15px; font-weight: 800; padding-top: 10px; }
  .decl { margin-top: 18px; color: #555; font-size: 11px; line-height: 1.5; border-top: 1px dashed #ccc; padding-top: 10px; }
  .thanks { margin-top: 14px; text-align: center; color: #777; font-style: italic; }
</style>
</head>
<body>
  <div class="top">
    <div>
      <p class="shop-name">${shopName}</p>
      <div class="shop-meta">${shopLines.map(l => `<div>${l}</div>`).join('')}</div>
    </div>
    <div class="doc-type">
      <span class="badge">${docTitle}</span>
      <div class="meta">
        <div>Bill <strong>#${bill.billNumber}</strong></div>
        <div>${esc(formatDateTime(bill.createdAt))}</div>
      </div>
    </div>
  </div>

  <div class="parties">
    ${billToBlock}
  </div>

  <table class="items">
    <thead><tr>${headCols}</tr></thead>
    <tbody>
      ${rows}
      ${totalRows.join('')}
    </tbody>
  </table>

  ${declaration}
  <p class="thanks">Thank you for your business!</p>
</body>
</html>`;
}

class PdfServiceImpl {
  /**
   * Render a bill to a PDF file and return its path.
   *
   * We deliberately DON'T pass a `directory`, so the lib writes to the app's
   * internal **cache dir**. That matters for two reasons: (1) no storage
   * permission is ever needed, and (2) react-native-share's bundled FileProvider
   * only exposes the cache dir (and external Download/) — a file written
   * elsewhere (e.g. external files/Documents) can't be turned into a shareable
   * content:// URI and the share silently fails on Android 7+. Cache is also
   * genuinely temporary, so generated invoices never clutter the device.
   *
   * The OS adds a unique suffix to the temp file; the human-facing name shown to
   * the recipient is `invoice-<billNumber>.pdf`, applied via the share `filename`.
   */
  async generateBillPdf(
    bill: Bill,
    profile: ShopProfile | null,
  ): Promise<GeneratedPdf> {
    const html = buildBillHtml(bill, profile);
    const res = await generatePDF({
      html,
      fileName: `invoice-${bill.billNumber}`,
      base64: false,
    });
    if (!res.filePath) {
      throw new Error('PDF generation failed: no file path returned');
    }
    return {filePath: res.filePath, fileName: `invoice-${bill.billNumber}.pdf`};
  }
}

/** Shared instance used across the app. */
export const PdfService = new PdfServiceImpl();
