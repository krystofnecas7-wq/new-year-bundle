/**
 * share.js, auto grafika do stories.
 *
 * Nakreslí kartičku 1080 x 1920 ve stylu appky a buď ji pošle přes systémové
 * sdílení (mobil), nebo ji stáhne jako PNG (počítač).
 */

const W = 1080;
const H = 1920;

function wrap(ctx, text, maxWidth) {
  const words = String(text).split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function draw({ kicker, big, line, sub, brand, by }) {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  const font = '"Bricolage Grotesque", system-ui, "Segoe UI", Arial, sans-serif';

  // pozadí
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#1d1438");
  bg.addColorStop(1, "#0b0b1a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, H * 0.38, 50, W / 2, H * 0.38, W);
  glow.addColorStop(0, "rgba(255,93,143,0.28)");
  glow.addColorStop(1, "rgba(11,11,26,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // ohňostrojové tečky
  ctx.fillStyle = "rgba(255,209,102,0.55)";
  for (let i = 0; i < 70; i++) {
    const a = (i / 70) * Math.PI * 2;
    const r = 330 + (i % 5) * 26;
    ctx.beginPath();
    ctx.arc(W / 2 + Math.cos(a) * r, H * 0.38 + Math.sin(a) * r, 4 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.textAlign = "center";

  ctx.fillStyle = "#ffd166";
  ctx.font = `800 46px ${font}`;
  ctx.fillText(brand.toUpperCase(), W / 2, 170);

  ctx.fillStyle = "#c8c8e0";
  ctx.font = `700 56px ${font}`;
  ctx.fillText(kicker, W / 2, 520);

  const warm = ctx.createLinearGradient(W * 0.2, 0, W * 0.8, 0);
  warm.addColorStop(0, "#ff8a3d");
  warm.addColorStop(1, "#ff5d8f");
  ctx.fillStyle = warm;
  ctx.font = `900 ${String(big).length > 4 ? 200 : 360}px ${font}`;
  ctx.fillText(String(big), W / 2, 920);

  ctx.fillStyle = "#f4f4ff";
  ctx.font = `800 72px ${font}`;
  wrap(ctx, line, W - 160).forEach((l, i) => ctx.fillText(l, W / 2, 1130 + i * 90));

  ctx.fillStyle = "#a9a9c7";
  ctx.font = `500 50px ${font}`;
  wrap(ctx, sub, W - 200).forEach((l, i) => ctx.fillText(l, W / 2, 1420 + i * 66));

  ctx.fillStyle = "#6a6a8a";
  ctx.font = `600 36px ${font}`;
  ctx.fillText(by, W / 2, H - 120);

  return c;
}

/**
 * @returns {Promise<"shared"|"downloaded"|"cancelled">}
 */
export async function shareCard(opts) {
  const canvas = draw(opts);
  const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
  if (!blob) throw new Error("canvas toBlob failed");
  const file = new File([blob], "new-year-bundle.png", { type: "image/png" });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: opts.brand });
      return "shared";
    } catch (e) {
      if (e && e.name === "AbortError") return "cancelled";
      // jinak spadneme na stažení
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "new-year-bundle.png";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return "downloaded";
}
