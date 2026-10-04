const W = 1080;
const H = 1350;

const COLORS = {
  bg: '#f4f1ea',
  paper: '#fffcf5',
  ink: '#181818',
  muted: '#737068',
  accent: '#d32f2f',
  // Dark enough to read on the cream receipt paper (>= 4.5:1)
  tier: { great: '#14532d', good: '#2f6b1f', mid: '#8a5300', poor: '#a8420a', bad: '#9b1c1c' },
  fill: { great: '#1f9d55', good: '#84cc16', mid: '#f5b301', poor: '#f97316', bad: '#dc2626' },
};

function loadFonts() {
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

export async function renderShareImage(model) {
  await loadFonts();
  const icon = await loadIcon(model.iconSrc);

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

  // Draw Card with Zigzag
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
  
  // Shadow
  ctx.shadowColor = 'rgba(0,0,0,0.06)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 15;
  ctx.fill();
  ctx.shadowColor = 'transparent';

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
  ctx.font = '40px "Space Mono", ui-monospace, monospace';
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
  drawRow('Gerçek Fiyat', model.actual, true);
  
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
    drawRow('Artış', model.increase);
    y += 20;
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
  ctx.fillRect(cx - meterW / 2, y + 24, meterW * pct, 18);
  
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
