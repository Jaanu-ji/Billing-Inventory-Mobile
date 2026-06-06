/**
 * ShareService — share a saved bill's PDF out of the app.
 *
 * Layered on top of the existing save flow: saving a bill never depends on
 * sharing, and sharing can be done later from bill history. This service
 * composes PdfService (make the PDF) with the system share sheet so the screens
 * stay free of any PDF / share-sheet detail.
 *
 * Two paths:
 *   - `shareBill`     : send the PDF file — opens the OS share sheet, where
 *                       WhatsApp / Gmail / Drive / Bluetooth etc. all appear and
 *                       the shopkeeper picks the target (the only way to attach a
 *                       file is to pick the contact).
 *   - `whatsAppBill`  : open the customer's WhatsApp chat DIRECTLY (Truecaller-
 *                       style deep link to the number) with a bill-summary text
 *                       pre-filled. A deep link can't pre-attach the PDF — that's
 *                       a WhatsApp limitation; use shareBill() to send the file.
 *
 * Future: thermal print and cloud backup can reuse PdfService / bill data here.
 */
import {Linking, Platform} from 'react-native';
import Share from 'react-native-share';
import {PdfService} from './PdfService';
import {formatPrice, formatDateTime} from '../utils/format';
import type {Bill} from '../models/Bill';
import type {ShopProfile} from '../models/ShopProfile';

/** Outcome of a share attempt (a user dismissal is not an error). */
export interface ShareOutcome {
  /** True if the share sheet reported the bill was actually shared. */
  shared: boolean;
}

/**
 * Derive a simple (cash-memo) view of a GST bill, for sending the customer a
 * plain non-GST copy. PURE and READ-ONLY — it returns a NEW in-memory Bill and
 * never touches the saved record, which stays a GST bill.
 *
 * No GST is recomputed: each line's already-stored `gstAmount` is folded into a
 * tax-inclusive unit price, so the simple bill's total equals exactly what the
 * customer paid (subtotal == total, no tax lines). A non-GST bill is returned
 * unchanged.
 */
export function toSimpleBill(bill: Bill): Bill {
  if (bill.billType !== 'gst') {
    return bill;
  }
  const items = (bill.items ?? []).map(it => {
    const inclTotal = it.lineTotal + it.gstAmount;
    const qty = it.quantity || 1;
    return {
      ...it,
      price: inclTotal / qty, // tax-inclusive unit price
      lineTotal: inclTotal,
      gstRate: 0,
      hsnCode: null,
      gstAmount: 0,
    };
  });
  return {
    ...bill,
    billType: 'simple',
    customerGstin: null,
    isInterState: false,
    cgst: 0,
    sgst: 0,
    igst: 0,
    subtotal: bill.total, // simple bill shows no tax: subtotal == total
    total: bill.total,
    items,
  };
}

/**
 * Normalise an Indian phone number to WhatsApp's `<country><number>` form (no
 * '+', no spaces). Assumes +91 when no country code is present — the common case
 * for these shops. Returns null if there aren't enough digits to dial.
 */
export function toWhatsAppNumber(phone: string | null | undefined): string | null {
  if (!phone) {
    return null;
  }
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `91${digits}`; // bare 10-digit Indian mobile
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return `91${digits.slice(1)}`; // leading-0 trunk prefix
  }
  if (digits.length >= 11 && digits.length <= 15) {
    return digits; // already includes a country code
  }
  return null;
}

class ShareServiceImpl {
  /** A short caption attached to a file share so the recipient has context. */
  private caption(bill: Bill, profile: ShopProfile | null): string {
    const shop = profile?.shopName ? `${profile.shopName} — ` : '';
    return `${shop}Invoice #${bill.billNumber}`;
  }

  /** A readable bill summary pre-filled into the WhatsApp chat (no PDF needed). */
  private billMessage(bill: Bill, profile: ShopProfile | null): string {
    const lines: string[] = [];
    if (profile?.shopName) {
      lines.push(`*${profile.shopName}*`);
    }
    lines.push(`Invoice #${bill.billNumber}`);
    lines.push(`Date: ${formatDateTime(bill.createdAt)}`);
    if (bill.customerName) {
      lines.push(`To: ${bill.customerName}`);
    }
    lines.push(`Total: ${formatPrice(bill.total)}`);
    lines.push('Thank you! 🙏');
    return lines.join('\n');
  }

  /** `file://`-prefixed URL the native share APIs expect for a local file. */
  private fileUrl(filePath: string): string {
    if (Platform.OS === 'android' && !filePath.startsWith('file://')) {
      return `file://${filePath}`;
    }
    return filePath;
  }

  /**
   * Generate the bill PDF and open the system share sheet. `failOnCancel: false`
   * means a user dismissal resolves quietly instead of throwing.
   */
  async shareBill(
    bill: Bill,
    profile: ShopProfile | null,
  ): Promise<ShareOutcome> {
    const {filePath, fileName} = await PdfService.generateBillPdf(bill, profile);
    const result = await Share.open({
      url: this.fileUrl(filePath),
      type: 'application/pdf',
      filename: fileName,
      title: this.caption(bill, profile),
      subject: this.caption(bill, profile),
      failOnCancel: false,
    });
    return {shared: result?.success ?? false};
  }

  /**
   * Share a GST bill as a SIMPLE (non-GST) PDF — same flow as `shareBill`, but
   * on a read-only simple copy (see `toSimpleBill`). The saved bill stays GST.
   */
  async shareBillAsSimple(
    bill: Bill,
    profile: ShopProfile | null,
  ): Promise<ShareOutcome> {
    return this.shareBill(toSimpleBill(bill), profile);
  }

  /**
   * Open the customer's WhatsApp chat DIRECTLY using a deep link to the number
   * (the Truecaller-style behaviour: tap → that person's chat opens), with a
   * bill-summary text pre-filled and ready to send.
   *
   * A WhatsApp deep link can't pre-attach the PDF file (platform limitation), so
   * this sends a readable text summary; to send the actual PDF, use `shareBill`
   * (system sheet → pick the contact). Tries the `whatsapp://` app scheme first,
   * then the universal `https://wa.me/` link (which opens the app if installed,
   * else the browser → WhatsApp / Play Store).
   */
  async whatsAppBill(
    bill: Bill,
    profile: ShopProfile | null,
    phone: string | null,
  ): Promise<ShareOutcome> {
    const number = toWhatsAppNumber(phone);
    const text = encodeURIComponent(this.billMessage(bill, profile));
    const appUrl = number
      ? `whatsapp://send?phone=${number}&text=${text}`
      : `whatsapp://send?text=${text}`;
    try {
      await Linking.openURL(appUrl);
      return {shared: true};
    } catch {
      const webUrl = number
        ? `https://wa.me/${number}?text=${text}`
        : `https://wa.me/?text=${text}`;
      await Linking.openURL(webUrl);
      return {shared: true};
    }
  }
}

/** Shared instance used across the app. */
export const ShareService = new ShareServiceImpl();
