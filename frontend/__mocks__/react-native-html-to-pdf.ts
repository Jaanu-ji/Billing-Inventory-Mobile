/**
 * Jest mock for react-native-html-to-pdf (1.x TurboModule API: `generatePDF`).
 *
 * The native PDF renderer isn't available off-device, so this stub just returns
 * a fake file path. Pure-template tests assert on `buildBillHtml`'s output (no
 * native call); this only lets the import chain load under Jest.
 */
export function generatePDF(options: {fileName?: string}) {
  return Promise.resolve({
    filePath: `/tmp/${options.fileName ?? 'document'}.pdf`,
    base64: '',
  });
}
