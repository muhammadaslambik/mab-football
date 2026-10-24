// =============================================================================
// Penanda pemain yang dikontrol, gaya PES / Winning Eleven: segitiga kecil tepat di atas kepala
// dan nama (nomor + nama belakang) kecil di atasnya, tanpa kotak besar supaya tidak menutupi
// permainan. (x, y) = titik puncak kepala pemain di layar.
// =============================================================================
export function drawNameTag(ctx, x, y, number, name, { color = '#ffe066', size = 12 } = {}) {
  ctx.save();
  // segitiga penunjuk
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y - 3);
  ctx.lineTo(x - 5.5, y - 12);
  ctx.lineTo(x + 5.5, y - 12);
  ctx.closePath();
  ctx.stroke();
  ctx.fill();
  // nama
  ctx.font = `bold ${size}px system-ui, "Segoe UI", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const label = `${number}  ${String(name).toUpperCase()}`;
  const ty = y - 17;
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,0,0,0.75)';
  ctx.strokeText(label, x, ty);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(label, x, ty);
  ctx.restore();
}
