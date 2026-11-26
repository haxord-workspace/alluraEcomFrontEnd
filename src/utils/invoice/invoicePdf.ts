import { jsPDF } from 'jspdf';
import { autoTable, type CellHookData, type FontStyle } from 'jspdf-autotable';
import { supportLine, type InvoiceData, type InvoiceTone } from './invoiceData';

/**
 * Draws the invoice PDF from the shared InvoiceData (the same object the on-screen
 * invoice renders). Pure: fonts and the logo are passed in, so it runs in the browser
 * and in Node alike. Every string is set in the embedded Poppins TTF (it has ₹, U+20B9).
 * The standard PDF fonts don't, and that is what used to print "¹" in place of ₹.
 */

export type PdfWeight = 'normal' | 'medium' | 'semibold' | 'bold';

export interface InvoicePdfAssets {
  /** Base64 TTF data per weight */
  fonts: Record<PdfWeight, string>;
  logo?: { data: Uint8Array; width: number; height: number };
}

type RGB = [number, number, number];

const FONT = 'Poppins';
const LINE = 1.3; // line-height factor, also used by autotable for row heights
const PAGE_W = 595.28; // A4 in pt
const PAGE_H = 841.89;
const M = 40; // page margin (~14 mm)
const CONTENT_W = PAGE_W - M * 2;
const RIGHT = PAGE_W - M;
const PAGE_NO_BAND = 22; // space kept at the bottom of every page for "Page x of y"
const CONT_HEADER = 16; // space for the "continued" line on pages 2+

const C = {
  brand: [86, 28, 8] as RGB, // #561C08
  cream: [247, 230, 200] as RGB, // #F7E6C8
  headBg: [251, 242, 228] as RGB,
  card: [252, 249, 245] as RGB,
  border: [234, 224, 212] as RGB,
  ink: [28, 25, 23] as RGB, // stone-900
  text: [68, 64, 60] as RGB, // stone-700
  muted: [120, 113, 108] as RGB, // stone-500
  faint: [168, 162, 158] as RGB, // stone-400
  green: [4, 120, 87] as RGB, // emerald-700
};

/** Same palette as the on-screen pills (Tailwind 50 / 200 / 800) */
const TONES: Record<InvoiceTone, { fill: RGB; border: RGB; text: RGB }> = {
  success: { fill: [236, 253, 245], border: [167, 243, 208], text: [6, 95, 70] },
  danger: { fill: [255, 241, 242], border: [254, 205, 211], text: [159, 18, 57] },
  info: { fill: [240, 249, 255], border: [186, 230, 253], text: [7, 89, 133] },
  warning: { fill: [255, 251, 235], border: [253, 230, 138], text: [146, 64, 14] },
};

const hexToRgb = (hex?: string): RGB | undefined => {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((hex || '').trim());
  if (!m) return undefined;
  const h = m[1].length === 3 ? m[1].replace(/./g, c => c + c) : m[1];
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)) as RGB;
};

export const renderInvoicePdf = (data: InvoiceData, assets: InvoicePdfAssets): jsPDF => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
  (Object.keys(assets.fonts) as PdfWeight[]).forEach(weight => {
    const file = `Poppins-${weight}.ttf`;
    doc.addFileToVFS(file, assets.fonts[weight]);
    doc.addFont(file, FONT, weight, undefined, 'Identity-H');
  });
  doc.setLineHeightFactor(LINE);
  doc.setProperties({
    title: `Invoice ${data.invoiceNumber || data.orderNumber}`,
    subject: `Invoice for order ${data.orderNumber}`,
    author: data.company.name,
    creator: data.company.name,
  });

  // ── tiny drawing helpers ────────────────────────────────────────────────────
  const font = (weight: PdfWeight, size: number, color: RGB = C.text) => {
    doc.setFont(FONT, weight);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };
  const lh = (size: number) => size * LINE;
  const wrap = (text: string, width: number): string[] => doc.splitTextToSize(text, width) as string[];
  const width = (text: string) => doc.getTextWidth(text);
  /** Draws text whose TOP edge is at `top` (baseline worked out the same way autotable does) */
  const text = (value: string | string[], x: number, top: number, opts: { align?: 'left' | 'right' | 'center'; charSpace?: number } = {}) => {
    const size = doc.getFontSize();
    doc.text(value, x, top + size * 0.85, { align: opts.align || 'left', charSpace: opts.charSpace, baseline: 'alphabetic' });
  };
  const sectionTitle = (label: string, x: number, top: number) => {
    font('bold', 7, C.muted);
    text(label.toUpperCase(), x, top, { charSpace: 0.7 });
    return lh(7);
  };
  const continuedHeader = () => {
    font('normal', 7.5, C.faint);
    text(
      [data.title, data.invoiceNumber, data.orderNumber].filter(Boolean).join('  ·  ') + '  (continued)',
      M,
      M - 6
    );
  };
  const newPage = (): number => {
    doc.addPage();
    continuedHeader();
    return M + CONT_HEADER;
  };

  let y = M;

  // ── Header: logo + tagline (left), title + meta block (right) ──────────────
  // Right block first so the left side knows how much room it has.
  font('normal', 8);
  const labelW = Math.max(0, ...data.meta.map(r => width(r.label)));
  font('bold', 8.5);
  const valueW = Math.min(190, Math.max(90, ...data.meta.map(r => width(r.value))));
  const META_GAP = 14;
  const metaW = labelW + META_GAP + valueW;
  const labelX = RIGHT - metaW;

  font('bold', 20, C.brand);
  text(data.title, RIGHT, y, { align: 'right' });
  let ry = y + lh(20) + 4;
  data.meta.forEach(row => {
    font(row.strong ? 'bold' : 'semibold', 8.5, row.strong ? C.brand : C.ink);
    const lines = wrap(row.value, valueW);
    text(lines, RIGHT, ry, { align: 'right' });
    font('normal', 8, C.muted);
    // Labels sit in their own column; rows grow with wrapped values, so nothing can collide
    text(row.label, labelX, ry + 0.5);
    ry += Math.max(1, lines.length) * lh(8.5) + 3;
  });

  let ly = y;
  if (assets.logo) {
    const logoH = 46;
    const logoW = (logoH * assets.logo.width) / assets.logo.height;
    doc.addImage(assets.logo.data, 'PNG', M, ly, logoW, logoH, 'allura-logo', 'FAST');
    ly += logoH + 6;
  } else {
    font('bold', 18, C.brand);
    text(data.company.name.toUpperCase(), M, ly, { charSpace: 1.5 });
    ly += lh(18) + 4;
  }
  if (data.company.tagline) {
    font('normal', 8.5, C.muted);
    const lines = wrap(data.company.tagline, Math.max(120, labelX - M - 24));
    text(lines, M, ly);
    ly += lines.length * lh(8.5);
  }

  y = Math.max(ly, ry) + 12;
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.75);
  doc.line(M, y, RIGHT, y);
  y += 18;

  // ── Party + payment cards ───────────────────────────────────────────────────
  const PAD = 12;
  const CARD_GAP = 12;
  const cardCount = data.parties.length + 1;
  const cardW = (CONTENT_W - CARD_GAP * (cardCount - 1)) / cardCount;
  const innerW = cardW - PAD * 2;

  type Card = { height: number; draw: (x: number, top: number) => void };

  const partyCard = (party: InvoiceData['parties'][number]): Card => {
    font('semibold', 10);
    const nameLines = wrap(party.name, innerW);
    font('normal', 8.5);
    const addrLines = party.lines.flatMap(line => wrap(line, innerW));
    const contactRows = party.contacts.map(c => {
      font('normal', 8.5);
      const label = `${c.label}: `;
      const lw = width(label);
      return { label, lw, lines: wrap(c.value, innerW - lw) };
    });
    const contactsH = contactRows.reduce((h, r) => h + r.lines.length * lh(8.5), 0);
    const height =
      PAD + lh(7) + 6 + nameLines.length * lh(10) + 2 + addrLines.length * lh(8.5) +
      (contactRows.length ? 14 + contactsH : 0) + PAD;

    return {
      height,
      draw: (x, top) => {
        let cy = top + PAD;
        cy += sectionTitle(party.title, x + PAD, cy) + 6;
        font('semibold', 10, C.ink);
        text(nameLines, x + PAD, cy);
        cy += nameLines.length * lh(10) + 2;
        if (addrLines.length) {
          font('normal', 8.5, C.text);
          text(addrLines, x + PAD, cy);
          cy += addrLines.length * lh(8.5);
        }
        if (contactRows.length) {
          cy += 7;
          doc.setDrawColor(...C.border);
          doc.setLineWidth(0.5);
          doc.line(x + PAD, cy, x + cardW - PAD, cy);
          cy += 7;
          contactRows.forEach(r => {
            font('normal', 8.5, C.muted);
            text(r.label, x + PAD, cy);
            font('normal', 8.5, C.ink);
            text(r.lines, x + PAD + r.lw, cy);
            cy += r.lines.length * lh(8.5);
          });
        }
      },
    };
  };

  const paymentCard = (): Card => {
    const p = data.payment;
    font('normal', 8.5);
    const txLabelW = width('Transaction ID');
    font('medium', 8.5);
    const methodLines = wrap(p.method, innerW - width('Method') - 10);
    const txLines = p.transactionId ? wrap(p.transactionId, innerW - txLabelW - 10) : [];
    const PILL_H = 14;
    const rowGap = 6;
    const height =
      PAD + lh(7) + 6 + methodLines.length * lh(8.5) + rowGap + PILL_H +
      (txLines.length ? rowGap + txLines.length * lh(8.5) : 0) + PAD;

    return {
      height,
      draw: (x, top) => {
        const right = x + cardW - PAD;
        let cy = top + PAD;
        cy += sectionTitle('Payment', x + PAD, cy) + 6;

        font('normal', 8.5, C.muted);
        text('Method', x + PAD, cy);
        font('medium', 8.5, C.ink);
        text(methodLines, right, cy, { align: 'right' });
        cy += methodLines.length * lh(8.5) + rowGap;

        font('normal', 8.5, C.muted);
        text('Status', x + PAD, cy + (PILL_H - lh(8.5)) / 2);
        const tone = TONES[p.tone];
        font('semibold', 7.5, tone.text);
        const pillW = width(p.status) + 14;
        doc.setFillColor(...tone.fill);
        doc.setDrawColor(...tone.border);
        doc.setLineWidth(0.6);
        doc.roundedRect(right - pillW, cy, pillW, PILL_H, PILL_H / 2, PILL_H / 2, 'FD');
        text(p.status, right - pillW / 2, cy + (PILL_H - 7.5 * 1.05) / 2, { align: 'center' });
        cy += PILL_H;

        if (txLines.length) {
          cy += rowGap;
          font('normal', 8.5, C.muted);
          text('Transaction ID', x + PAD, cy);
          font('normal', 8.5, C.ink);
          text(txLines, right, cy, { align: 'right' });
        }
      },
    };
  };

  const cards = [...data.parties.map(partyCard), paymentCard()];
  const cardH = Math.max(...cards.map(c => c.height));
  cards.forEach((card, i) => {
    const x = M + i * (cardW + CARD_GAP);
    doc.setFillColor(...C.card);
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.75);
    doc.roundedRect(x, y, cardW, cardH, 8, 8, 'FD');
    card.draw(x, y);
  });
  y += cardH + 22;

  // ── Items table ─────────────────────────────────────────────────────────────
  sectionTitle('Items', M, y);
  font('normal', 8, C.faint);
  text(`${data.itemCount} ${data.itemCount === 1 ? 'item' : 'items'}`, RIGHT, y, { align: 'right' });
  y += lh(8) + 4;

  const COL = { size: 108, qty: 36, unit: 80, total: 84 };
  const COL_ITEM = CONTENT_W - COL.size - COL.qty - COL.unit - COL.total;
  const CELL_PAD = { top: 7, bottom: 7, left: 8, right: 8 };
  const DOT = 6;
  const DOT_SPACE = DOT + 4;

  // Per-row layouts for the two custom-drawn columns (computed once, used for height and drawing)
  type ItemLayout = { name: string[]; sku: string[] };
  type VariantLayout = { line1?: string; line1Dot?: boolean; colorLine?: string; sizeLines: string[]; colorLines: string[]; empty: boolean };
  const itemLayouts: ItemLayout[] = [];
  const variantLayouts: VariantLayout[] = [];
  const itemInnerW = COL_ITEM - CELL_PAD.left - CELL_PAD.right;
  const sizeInnerW = COL.size - CELL_PAD.left - CELL_PAD.right;

  data.items.forEach(item => {
    font('medium', 8.5);
    const name = wrap(item.name, itemInnerW);
    font('normal', 7);
    const sku = item.sku ? wrap(item.sku, itemInnerW) : [];
    itemLayouts.push({ name, sku });

    font('normal', 8.5);
    const dotW = item.colorHex ? DOT_SPACE : 0;
    const oneLine = [item.size, item.colorName].filter(Boolean).join(' / ');
    if (!item.size && !item.colorName) {
      variantLayouts.push({ sizeLines: [], colorLines: [], empty: true });
    } else if (width(oneLine) + dotW <= sizeInnerW) {
      variantLayouts.push({ line1: oneLine, line1Dot: !!item.colorHex, sizeLines: [], colorLines: [], empty: false });
    } else {
      variantLayouts.push({
        sizeLines: item.size ? wrap(item.size, sizeInnerW) : [],
        colorLines: item.colorName ? wrap(item.colorName, sizeInnerW - dotW) : [],
        empty: false,
      });
    }
  });

  const variantLineCount = (v: VariantLayout) => (v.empty || v.line1 ? 1 : v.sizeLines.length + v.colorLines.length);

  const lastPageBeforeTable = doc.getNumberOfPages();
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M, top: M + CONT_HEADER, bottom: M + PAGE_NO_BAND - 14 },
    head: [['Item', 'Size / Color', 'Qty', 'Unit price', 'Total']],
    body: data.items.map(item => ['', '', String(item.qty), item.unitPrice, item.lineTotal]),
    theme: 'plain',
    showHead: 'everyPage',
    rowPageBreak: 'avoid',
    styles: {
      font: FONT,
      fontStyle: 'normal',
      fontSize: 8.5,
      textColor: C.text,
      cellPadding: CELL_PAD,
      valign: 'top',
      overflow: 'linebreak',
      lineWidth: 0,
    },
    headStyles: { fillColor: C.headBg, textColor: C.brand, fontStyle: 'semibold' as FontStyle, fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: COL_ITEM },
      1: { cellWidth: COL.size },
      2: { cellWidth: COL.qty, halign: 'right' },
      3: { cellWidth: COL.unit, halign: 'right' },
      4: { cellWidth: COL.total, halign: 'right', fontStyle: 'medium' as FontStyle, textColor: C.ink },
    },
    didParseCell: (d: CellHookData) => {
      if (d.section === 'head') {
        if (d.column.index >= 2) d.cell.styles.halign = 'right';
        return;
      }
      // Placeholder lines give autotable the right row height; the real text is drawn in didDrawCell
      if (d.column.index === 0) {
        const l = itemLayouts[d.row.index];
        d.cell.text = [...l.name, ...l.sku];
      } else if (d.column.index === 1) {
        d.cell.text = Array.from({ length: variantLineCount(variantLayouts[d.row.index]) }, () => 'X');
      }
    },
    willDrawCell: (d: CellHookData) => {
      if (d.section === 'body' && d.column.index <= 1) d.cell.text = [];
    },
    didDrawCell: (d: CellHookData) => {
      if (d.section !== 'body') return;
      const { cell } = d;
      const x = cell.x + CELL_PAD.left;
      let cy = cell.y + CELL_PAD.top;

      if (d.column.index === 0) {
        const l = itemLayouts[d.row.index];
        font('medium', 8.5, C.ink);
        text(l.name, x, cy);
        cy += l.name.length * lh(8.5) + 1;
        if (l.sku.length) {
          font('normal', 7, C.faint);
          text(l.sku, x, cy);
        }
      } else if (d.column.index === 1) {
        const v = variantLayouts[d.row.index];
        const item = data.items[d.row.index];
        const dot = (dx: number, top: number) => {
          const rgb = hexToRgb(item.colorHex);
          if (!rgb) return;
          doc.setFillColor(...rgb);
          doc.setDrawColor(...C.faint);
          doc.setLineWidth(0.5);
          doc.circle(dx + DOT / 2, top + lh(8.5) / 2 - 0.5, DOT / 2, 'FD');
        };
        font('normal', 8.5, C.text);
        if (v.empty) {
          text('—', x, cy);
        } else if (v.line1) {
          // "Free Size / ● Red": the dot sits right before the colour name, like on screen
          const prefix = item.size && item.colorName ? `${item.size} / ` : item.size || '';
          if (prefix) text(prefix, x, cy);
          let cx = x + (prefix ? width(prefix) : 0);
          if (item.colorName) {
            if (v.line1Dot) {
              dot(cx, cy);
              cx += DOT_SPACE;
            }
            text(item.colorName, cx, cy);
          }
        } else {
          if (v.sizeLines.length) {
            text(v.sizeLines, x, cy);
            cy += v.sizeLines.length * lh(8.5);
          }
          if (v.colorLines.length) {
            const hasDot = !!hexToRgb(item.colorHex);
            if (hasDot) dot(x, cy);
            text(v.colorLines, x + (hasDot ? DOT_SPACE : 0), cy);
          }
        }
      }

      // Thin row divider
      if (d.column.index === 0) {
        doc.setDrawColor(...C.border);
        doc.setLineWidth(0.5);
        doc.line(M, cell.y + d.row.height, RIGHT, cell.y + d.row.height);
      }
    },
    didDrawPage: () => {
      if (doc.getNumberOfPages() > lastPageBeforeTable) continuedHeader();
    },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  // ── Totals box (right aligned, directly under the table) ────────────────────
  const BOX_W = 236;
  const boxX = RIGHT - BOX_W;
  const boxInner = BOX_W - PAD * 2;
  const TOTAL_ROW_H = 30;
  const rows = data.totals.map(row => {
    font('semibold', 8.5);
    const vw = width(row.value);
    font(row.kind === 'discount' ? 'medium' : 'normal', 8.5);
    const labelLines = wrap(row.label, boxInner - vw - 12);
    return { row, labelLines, height: labelLines.length * lh(8.5) + 6 };
  });
  const boxH = PAD - 2 + rows.reduce((h, r) => h + r.height, 0) + 4 + TOTAL_ROW_H + 6;
  const pageBottom = PAGE_H - M - PAGE_NO_BAND;

  y += 14;
  if (y + boxH > pageBottom) y = newPage();
  doc.setFillColor(...C.card);
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.75);
  doc.roundedRect(boxX, y, BOX_W, boxH, 8, 8, 'FD');

  let ty = y + PAD - 2;
  rows.forEach(({ row, labelLines, height }) => {
    const isDiscount = row.kind === 'discount';
    font(isDiscount ? 'medium' : 'normal', 8.5, isDiscount ? C.green : C.text);
    text(labelLines, boxX + PAD, ty);
    font(isDiscount ? 'semibold' : 'medium', 8.5, isDiscount ? C.green : C.ink);
    text(row.value, boxX + BOX_W - PAD, ty, { align: 'right' });
    ty += height;
  });
  ty += 4;
  doc.setFillColor(...C.cream);
  doc.roundedRect(boxX + 6, ty, BOX_W - 12, TOTAL_ROW_H, 6, 6, 'F');
  font('bold', 10.5, C.brand);
  text('Total', boxX + PAD, ty + (TOTAL_ROW_H - lh(10.5)) / 2 + 1);
  font('bold', 12, C.brand);
  text(data.grandTotal, boxX + BOX_W - PAD, ty + (TOTAL_ROW_H - lh(12)) / 2 + 1, { align: 'right' });
  y += boxH + 20;

  // ── Terms (flow) + company footer (anchored to the bottom of the last page) ─
  font('normal', 8);
  const termLines = data.terms.map((term, i) => {
    const num = `${i + 1}.`;
    return { num, lines: wrap(term, CONTENT_W - 14) };
  });
  const termsH = lh(7) + 4 + termLines.reduce((h, t) => h + t.lines.length * lh(8) + 1, 0);

  font('normal', 8);
  const footerLines: { value: string[]; weight: PdfWeight; color: RGB; size: number }[] = [];
  const pushFooter = (value: string | undefined, weight: PdfWeight, color: RGB, size = 8) => {
    if (!value) return;
    font(weight, size);
    footerLines.push({ value: wrap(value, CONTENT_W), weight, color, size });
  };
  pushFooter(data.company.name, 'semibold', C.ink, 8.5);
  // pushFooter(data.company.gstin && `GSTIN: ${data.company.gstin}`, 'normal', C.muted);
  pushFooter(data.company.address, 'normal', C.muted);
  pushFooter(supportLine(data.company), 'normal', C.muted);
  const thankYouGap = 6;
  const footerH = 14 + footerLines.reduce((h, l) => h + l.value.length * lh(l.size), 0) + thankYouGap + lh(9);
  const footerTop = pageBottom - footerH;

  if (y + termsH > footerTop - 14) y = newPage();

  sectionTitle('Terms & Conditions', M, y);
  let ky = y + lh(7) + 4;
  termLines.forEach(t => {
    font('normal', 8, C.text);
    text(t.num, M, ky);
    text(t.lines, M + 14, ky);
    ky += t.lines.length * lh(8) + 1;
  });

  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.75);
  doc.setLineDashPattern([2.5, 2.5], 0);
  doc.line(M, footerTop, RIGHT, footerTop);
  doc.setLineDashPattern([], 0);
  let fy = footerTop + 14;
  footerLines.forEach(l => {
    font(l.weight, l.size, l.color);
    text(l.value, M, fy);
    fy += l.value.length * lh(l.size);
  });
  fy += thankYouGap;
  font('medium', 9, C.brand);
  text(data.thankYou, M, fy);

  // ── Page numbers ────────────────────────────────────────────────────────────
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    font('normal', 7.5, C.faint);
    text(`Page ${i} of ${pages}`, PAGE_W / 2, PAGE_H - M + 4, { align: 'center' });
  }

  return doc;
};
