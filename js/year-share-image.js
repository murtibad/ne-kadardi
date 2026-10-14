// Canvas drawing of the "Yıllık fiş" share image. Text comes from buildYearShareModel.
import { COLORS, loadFonts, drawReceiptPaper } from './share-image.js';

const W = 1080;
const MARGIN = 80;
const PAD = 70; // inside the paper
const ROW_H = 64;
const FONT = '"Space Mono", ui-monospace, monospace';

function fitText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}…`;
}

export async function renderYearShareImage(model) {
  await loadFonts();

  const headerH = 330;
  const footerH = model.topLine ? 260 : 190;
  const H = MARGIN * 2 + headerH + model.rows.length * ROW_H + footerH;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);

  const startX = MARGIN;
  const endX = W - MARGIN;
  drawReceiptPaper(ctx, startX, MARGIN, endX, H - MARGIN);

  const left = startX + PAD;
  const right = endX - PAD;
  const cx = W / 2;

  function divider(dy) {
    ctx.beginPath();
    ctx.setLineDash([12, 12]);
    ctx.moveTo(left, dy);
    ctx.lineTo(right, dy);
    ctx.strokeStyle = COLORS.muted;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  let y = MARGIN + 90;
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.ink;
  ctx.font = `bold 36px ${FONT}`;
  ctx.fillText('*** NE KADARDI? ***', cx, y);
  y += 90;
  ctx.font = `bold 56px ${FONT}`;
  ctx.fillText(model.title, cx, y);
  y += 60;
  ctx.font = `30px ${FONT}`;
  ctx.fillStyle = COLORS.muted;
  ctx.fillText(model.count, cx, y);
  y += 50;
  divider(y);
  y += 70;

  // Columns: name | price (right-aligned) | rise (right-aligned, red accent).
  ctx.font = `30px ${FONT}`;
  const ratioW = Math.max(0, ...model.rows.map((r) => ctx.measureText(r.ratio).width));
  ctx.font = `bold 32px ${FONT}`;
  const priceW = Math.max(...model.rows.map((r) => ctx.measureText(r.price).width));
  const ratioRight = right;
  const priceRight = ratioW > 0 ? right - ratioW - 36 : right;
  const nameMax = priceRight - priceW - 32 - left;

  for (const row of model.rows) {
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.ink;
    ctx.font = `30px ${FONT}`;
    ctx.fillText(fitText(ctx, row.name, nameMax), left, y);
    ctx.textAlign = 'right';
    ctx.font = `bold 32px ${FONT}`;
    ctx.fillText(row.price, priceRight, y);
    if (row.ratio) {
      ctx.font = `30px ${FONT}`;
      ctx.fillStyle = COLORS.accent;
      ctx.fillText(row.ratio, ratioRight, y);
    }
    y += ROW_H;
  }

  y += 10 - ROW_H / 2;
  divider(y);
  y += 80;

  ctx.textAlign = 'center';
  if (model.topLine) {
    ctx.font = `bold 34px ${FONT}`;
    ctx.fillStyle = COLORS.ink;
    ctx.fillText(fitText(ctx, model.topLine, right - left), cx, y);
    y += 80;
  }
  ctx.font = `bold 34px ${FONT}`;
  ctx.fillStyle = COLORS.muted;
  ctx.fillText(model.siteAddress, cx, y);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))), 'image/png');
  });
}
