import { formatPrice } from './format.js';
import { refLabelAtStart } from './price-chart.js';

const W = 1080;

export const COLORS = {
  bg: '#f4f1ea',
  paper: '#fffcf5',
  ink: '#181818',
  muted: '#737068',
  accent: '#d32f2f',
  // Dark enough to read on the cream receipt paper (>= 4.5:1)
  tier: { great: '#14532d', good: '#2f6b1f', mid: '#8a5300', poor: '#a8420a', bad: '#9b1c1c' },
  fill: { great: '#1f9d55', good: '#84cc16', mid: '#f5b301', poor: '#f97316', bad: '#dc2626' },
};

export function loadFonts() {
  if (document.fonts && document.fonts.load) {
    return Promise.race([
      Promise.all([
        document.fonts.load('bold 40px "Space Mono"'),
        document.fonts.load('40px "Space Mono"')
      ]),
      new Promise(resolve => setTimeout(resolve, 1500))
    ]);
  }
  return Promise.resolve();
}

function loadIcon(src) {
  if (!src) return Promise.resolve(null);
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + " " + word).width;
    if (width < maxWidth) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}

// Cream receipt paper with zigzag top and bottom edges and a soft shadow.
export function drawReceiptPaper(ctx, startX, startY, endX, endY) {
  const cardW = endX - startX;
  const toothW = 30;
  const toothH = 15;
  const teethCount = Math.floor(cardW / toothW);
  const actualW = cardW / teethCount;

  ctx.fillStyle = COLORS.paper;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  for (let i = 0; i < teethCount; i++) {
    ctx.lineTo(startX + i * actualW + actualW / 2, startY - toothH);
    ctx.lineTo(startX + (i + 1) * actualW, startY);
  }
  ctx.lineTo(endX, endY);
  for (let i = 0; i < teethCount; i++) {
    ctx.lineTo(endX - i * actualW - actualW / 2, endY + toothH);
    ctx.lineTo(endX - (i + 1) * actualW, endY);
  }
  ctx.lineTo(startX, startY);

  ctx.shadowColor = 'rgba(0,0,0,0.06)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 15;
  ctx.fill();
  ctx.shadowColor = 'transparent';
}

export async function renderShareImage(model) {
  await loadFonts();
  const icon = await loadIcon(model.iconSrc);

  const H = (model.taxLine ? 1470 : 1350) + (model.stamp ? 150 : 0) + (model.chart ? 400 : 0);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { alpha: false });

  // Background
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);

  // Paper Card dimensions
  const marginX = 80;
  const marginY = 80;
  const cardW = W - marginX * 2;
  const startX = marginX;
  const startY = marginY;
  const endX = W - marginX;
  const endY = H - marginY;

  drawReceiptPaper(ctx, startX, startY, endX, endY);

  // Content state
  const cx = W / 2;
  let y = startY + 90;

  // Header
  ctx.font = 'bold 36px "Space Mono", ui-monospace, monospace';
  ctx.fillStyle = COLORS.ink;
  ctx.textAlign = 'center';
  ctx.fillText('*** NE KADARDI? ***', cx, y);
  
  y += 90;
  
  // Title
  // Shrink the title until it fits in two lines; as a last resort cut it with an ellipsis.
  let titleSize = 56;
  let titleLines;
  for (;;) {
    ctx.font = `bold ${titleSize}px "Space Mono", ui-monospace, monospace`;
    titleLines = wrapText(ctx, model.title, cardW - 120);
    if (titleLines.length <= 2 || titleSize <= 40) break;
    titleSize -= 4;
  }
  if (titleLines.length > 2) {
    titleLines = titleLines.slice(0, 2);
    let last = titleLines[1];
    while (last.length > 1 && ctx.measureText(`${last}…`).width > cardW - 120) last = last.slice(0, -1);
    titleLines[1] = `${last.trimEnd()}…`;
  }
  for (const line of titleLines) {
    ctx.fillText(line, cx, y);
    y += Math.round(titleSize * 1.25);
  }
  
  // Unit
  y -= titleSize < 56 ? 0 : 10;
  // Long units ("1 biniş, tam bilet (elektronik kart) · İstanbul") ran past the paper edges.
  let unitSize = 40;
  ctx.font = `${unitSize}px "Space Mono", ui-monospace, monospace`;
  while (ctx.measureText(model.unit).width > cardW - 120 && unitSize > 26) {
    unitSize -= 2;
    ctx.font = `${unitSize}px "Space Mono", ui-monospace, monospace`;
  }
  ctx.fillStyle = COLORS.muted;
  ctx.fillText(model.unit, cx, y);
  
  y += 60;
  
  // Divider helper
  function drawDivider(dy) {
    ctx.beginPath();
    ctx.setLineDash([12, 12]);
    ctx.moveTo(startX + 80, dy);
    ctx.lineTo(endX - 80, dy);
    ctx.strokeStyle = COLORS.muted;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.setLineDash([]);
  }
  
  drawDivider(y);
  y += 70;
  
  // Row helper
  function drawRow(label, value, isBold = false) {
    ctx.font = (isBold ? 'bold ' : '') + '44px "Space Mono", ui-monospace, monospace';
    ctx.fillStyle = COLORS.ink;
    ctx.textAlign = 'left';
    ctx.fillText(label, startX + 80, y);
    ctx.textAlign = 'right';
    ctx.fillText(value, endX - 80, y);
    y += 70;
  }

  drawRow('Tahminin', model.guess);
  drawRow(model.actualLabel || 'Gerçek fiyat', model.actual, true);
  
  y += 30;
  
  // Verdict Box
  const boxW = cardW - 160;
  const boxH = 100;
  const tierColor = COLORS.tier[model.tier] || COLORS.accent;
  ctx.strokeStyle = tierColor;
  ctx.lineWidth = 4;
  ctx.strokeRect(cx - boxW / 2, y, boxW, boxH);
  
  ctx.font = 'bold 36px "Space Mono", ui-monospace, monospace';
  ctx.fillStyle = tierColor;
  ctx.textAlign = 'center';
  // scale text if it's too long
  const verdictW = ctx.measureText(model.verdict).width;
  if (verdictW > boxW - 40) {
    ctx.font = 'bold 30px "Space Mono", ui-monospace, monospace';
  }
  ctx.fillText(model.verdict, cx, y + 64);
  
  y += boxH + 60;
  
  drawDivider(y);
  y += 70;
  
  if (model.hasCurrent) {
    drawRow(model.currentLabel, model.current);
    drawRow('Değişim', model.increase);
    y += 20;
  }

  if (model.chart) {
    const chart = model.chart;
    const originX = (W - chart.width) / 2;
    const originY = y;
    const bottomY = chart.height - 44;

    ctx.save();
    ctx.translate(originX, originY);

    // Fill area under the price line down to the plot bottom
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(chart.points[0].x, chart.points[0].y);
    for (let i = 1; i < chart.points.length; i++) {
      ctx.lineTo(chart.points[i].x, chart.points[i].y);
    }
    ctx.lineTo(chart.points[chart.points.length - 1].x, bottomY);
    ctx.lineTo(chart.points[0].x, bottomY);
    ctx.closePath();
    ctx.fillStyle = COLORS.accent;
    ctx.globalAlpha = 0.1;
    ctx.fill();
    ctx.restore();

    // Logarithmic price curve
    ctx.beginPath();
    ctx.moveTo(chart.points[0].x, chart.points[0].y);
    for (let i = 1; i < chart.points.length; i++) {
      ctx.lineTo(chart.points[i].x, chart.points[i].y);
    }
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Dashed horizontal reference line for the player's guess
    if (chart.ref) {
      ctx.beginPath();
      ctx.setLineDash([12, 10]);
      ctx.moveTo(24, chart.ref.y);
      ctx.lineTo(chart.width - 24, chart.ref.y);
      ctx.strokeStyle = COLORS.muted;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.font = 'bold 24px "Space Mono", ui-monospace, monospace';
      const refStart = refLabelAtStart(chart, 260);
      ctx.textAlign = refStart ? 'left' : 'right';
      ctx.strokeStyle = COLORS.paper;
      ctx.lineWidth = 8;
      ctx.lineJoin = 'round';
      ctx.fillStyle = COLORS.muted;
      const refText = `Tahminin ${formatPrice(chart.ref.price)}${chart.ref.off === 'above' ? ' ↑' : chart.ref.off === 'below' ? ' ↓' : ''}`;
      const refLabelY = chart.ref.y < 40 ? chart.ref.y + 30 : chart.ref.y - 10;
      const refX = refStart ? 24 : chart.width - 24;
      ctx.strokeText(refText, refX, refLabelY);
      ctx.fillText(refText, refX, refLabelY);
    }

    // Data points: question date in red, current price in solid ink, others hollow
    for (const p of chart.points) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.highlight ? 13 : 7, 0, Math.PI * 2);
      if (p.highlight) {
        ctx.fillStyle = COLORS.accent;
        ctx.strokeStyle = COLORS.paper;
        ctx.lineWidth = 5;
        ctx.fill();
        ctx.stroke();
      } else if (p.isCurrent) {
        ctx.fillStyle = COLORS.ink;
        ctx.fill();
      } else {
        ctx.fillStyle = COLORS.paper;
        ctx.strokeStyle = COLORS.ink;
        ctx.lineWidth = 3;
        ctx.fill();
        ctx.stroke();
      }
    }

    // Price labels above first, last and highlighted points (skip ends that collide with the highlight)
    const first = chart.points[0];
    const last = chart.points[chart.points.length - 1];
    const marked = chart.points.find((p) => p.highlight);
    const labels = [first, last, marked].filter(
      (p, i, a) => p && a.indexOf(p) === i && (!marked || p === marked || Math.abs(p.x - marked.x) > 130)
    );
    ctx.font = 'bold 28px "Space Mono", ui-monospace, monospace';
    ctx.strokeStyle = COLORS.paper;
    ctx.lineWidth = 8;
    ctx.lineJoin = 'round';
    for (const p of labels) {
      ctx.textAlign = p.x < chart.width * 0.25 ? 'left' : p.x > chart.width * 0.75 ? 'right' : 'center';
      ctx.fillStyle = p.highlight ? COLORS.accent : COLORS.ink;
      const labelY = Math.max(28, p.y - 22);
      const text = formatPrice(p.price);
      ctx.strokeText(text, p.x, labelY);
      ctx.fillText(text, p.x, labelY);
    }

    // Year axis ticks: drop a tick that would touch the one kept before it or the last one (which always stays).
    // The first label grows right and the last grows left, so they need a whole label width; centred ones need half.
    ctx.font = '26px "Space Mono", ui-monospace, monospace';
    const w = ctx.measureText('2026').width;
    const gap = (aEdge, bEdge) => (aEdge ? w : w / 2) + (bEdge ? w : w / 2) + 12;
    const ticks = chart.xTicks;
    const keptTicks = [];
    ticks.forEach((tk, i) => {
      const last = i === ticks.length - 1;
      const prev = keptTicks[keptTicks.length - 1];
      if (last || ((!prev || tk.x - prev.x >= gap(keptTicks.length === 1, false))
        && ticks[ticks.length - 1].x - tk.x >= gap(i === 0, true))) keptTicks.push(tk);
    });
    ctx.fillStyle = COLORS.muted;
    keptTicks.forEach((tk, i, a) => {
      ctx.textAlign = i === 0 ? 'left' : i === a.length - 1 ? 'right' : 'center';
      ctx.fillText(tk.label, tk.x, chart.height - 8);
    });

    ctx.restore();

    y += chart.height + 40;
    ctx.save();
    ctx.font = '26px "Space Mono", ui-monospace, monospace';
    ctx.fillStyle = COLORS.muted;
    ctx.textAlign = 'center';
    ctx.fillText('Yıllar içinde fiyatı', cx, y);
    ctx.restore();
    y += 100; // the score below is drawn at 64px from its baseline
  }

  if (model.taxLine) {
    let taxFontSize = 36;
    ctx.font = `${taxFontSize}px "Space Mono", ui-monospace, monospace`;
    while (ctx.measureText(model.taxLine).width > cardW - 120 && taxFontSize > 24) {
      taxFontSize -= 2;
      ctx.font = `${taxFontSize}px "Space Mono", ui-monospace, monospace`;
    }
    ctx.fillStyle = COLORS.muted;
    ctx.textAlign = 'center';
    ctx.fillText(model.taxLine, cx, y);
    y += 85;
  }

  // Score (pulled up a bit to leave room for the meter above the footer)
  y += 15;
  ctx.font = 'bold 64px "Space Mono", ui-monospace, monospace';
  ctx.fillStyle = tierColor;
  ctx.textAlign = 'center';
  ctx.fillText(`PUAN ${model.score}`, cx, y);

  // Meter under the score
  const meterW = 420;
  const pct = Math.max(0, Math.min(100, parseInt(model.score, 10) || 0)) / 100;
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(cx - meterW / 2, y + 20, meterW, 18);
  ctx.fillStyle = COLORS.fill[model.tier] || COLORS.accent;
  ctx.fillRect(cx - meterW / 2, y + 20, meterW * pct, 18);
  
  // Tilted red rubber stamp with the player's title
  if (model.stamp) {
    ctx.save();
    ctx.translate(cx, y + 120);
    ctx.rotate(-0.1);
    ctx.font = 'bold 34px "Space Mono", ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const words = wrapText(ctx, model.stamp, cardW - 260);
    const lineH = 44;
    const boxW = Math.max(...words.map((l) => ctx.measureText(l).width)) + 40;
    const boxH = words.length * lineH + 28;
    ctx.strokeStyle = COLORS.accent;
    ctx.fillStyle = COLORS.accent;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 6;
    ctx.strokeRect(-boxW / 2, -boxH / 2, boxW, boxH);
    words.forEach((l, i) => ctx.fillText(l, 0, (i - (words.length - 1) / 2) * lineH));
    ctx.restore();
  }

  // Bottom Icon and URL
  const bottomY = endY - 70;

  ctx.font = 'bold 36px "Space Mono", ui-monospace, monospace';
  ctx.fillStyle = COLORS.muted;
  ctx.textAlign = 'left';
  
  if (icon) {
    const iconSize = 64;
    const textW = ctx.measureText(model.siteAddress).width;
    const totalW = iconSize + 24 + textW;
    const startXIcon = cx - totalW / 2;
    ctx.drawImage(icon, startXIcon, bottomY - iconSize + 10, iconSize, iconSize);
    ctx.fillText(model.siteAddress, startXIcon + iconSize + 24, bottomY);
  } else {
    ctx.textAlign = 'center';
    ctx.fillText(model.siteAddress, cx, bottomY);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob failed'));
    }, 'image/png');
  });
}
