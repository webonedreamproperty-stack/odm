/**
 * OD membership wallet card: exact ISO ID-1 size (85.6 × 54 mm) for print,
 * plus PNG export at matching aspect ratio for downloads.
 */

export const OD_MEMBER_CARD_WIDTH_MM = 85.6;
export const OD_MEMBER_CARD_HEIGHT_MM = 53.98;
/** ~300 DPI export */
export const OD_MEMBER_CARD_PX_W = 1012;
export const OD_MEMBER_CARD_PX_H = 638;

export type OdMemberCardExportPayload = {
  memberCode: string;
  /** e.g. "May 2, 2026" */
  validUntilLabel: string;
  /** Absolute URL encoded in QR */
  qrUrl: string;
  qrSvgOuterHTML?: string;
};

function waitForImages(doc: Document): Promise<void> {
  const imgs = Array.from(doc.images);
  const pending = imgs.filter((img) => !img.complete);
  if (pending.length === 0) return Promise.resolve();
  return Promise.all(
    pending.map(
      (img) =>
        new Promise<void>((resolve) => {
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
        })
    )
  ).then(() => {});
}

function buildQrImgTag(qrUrl: string, qrSvgOuterHTML: string | undefined): string {
  if (qrSvgOuterHTML) {
    return `<div class="qr">${qrSvgOuterHTML}</div>`;
  }
  return `<img class="qr-fallback" src="https://api.qrserver.com/v1/create-qr-code/?size=400x400&amp;margin=1&amp;data=${encodeURIComponent(
    qrUrl
  )}" alt="" width="120" height="120" />`;
}

function buildPrintHtml(payload: OdMemberCardExportPayload, logoSrc: string): string {
  const qrBlock = buildQrImgTag(payload.qrUrl, payload.qrSvgOuterHTML);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>OD Member card</title>
  <style>
    @page {
      margin: 0;
      size: ${OD_MEMBER_CARD_WIDTH_MM}mm ${OD_MEMBER_CARD_HEIGHT_MM}mm;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #1a1510;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .card {
      width: ${OD_MEMBER_CARD_WIDTH_MM}mm;
      height: ${OD_MEMBER_CARD_HEIGHT_MM}mm;
      margin: 0;
      padding: 3.2mm 3.6mm;
      border-radius: 3mm;
      background:
        linear-gradient(145deg, rgba(255,255,255,0.22) 0%, transparent 42%),
        linear-gradient(135deg, #c9a227 0%, #f3e7b8 28%, #e8c547 52%, #a67c1a 100%);
      border: 0.35mm solid rgba(255,255,255,0.45);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.35);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      color: #1b1813;
    }
    .top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 2mm;
    }
    .logo {
      height: 11mm;
      width: auto;
      display: block;
      filter: drop-shadow(0 0.3mm 0.6mm rgba(0,0,0,0.12));
    }
    .brand {
      text-align: right;
      line-height: 1.1;
    }
    .brand-script {
      font-size: 5.2mm;
      font-weight: 700;
      letter-spacing: -0.04em;
      color: #1b1813;
    }
    .brand-sub {
      font-size: 2.4mm;
      font-weight: 600;
      letter-spacing: 0.28em;
      color: rgba(27,24,19,0.75);
      margin-top: 0.6mm;
    }
    .mid {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
      min-height: 0;
    }
    .qr svg {
      width: 26mm !important;
      height: 26mm !important;
      display: block;
      border-radius: 1.2mm;
      background: #fff;
      padding: 1mm;
      box-shadow: 0 0.4mm 1.2mm rgba(0,0,0,0.12);
    }
    .qr-fallback {
      width: 26mm;
      height: 26mm;
      object-fit: contain;
      border-radius: 1.2mm;
      background: #fff;
      padding: 1mm;
      box-shadow: 0 0.4mm 1.2mm rgba(0,0,0,0.12);
    }
    .bar {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 2mm;
      padding: 2mm 2.4mm 0.2mm;
      margin: 0 -1mm -0.5mm;
      border-radius: 2mm;
      background: rgba(255,255,255,0.42);
      border: 0.2mm solid rgba(255,255,255,0.55);
    }
    .field-label {
      font-size: 1.8mm;
      font-weight: 600;
      letter-spacing: 0.06em;
      color: rgba(27,24,19,0.65);
      text-transform: uppercase;
    }
    .field-value {
      font-size: 3mm;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      margin-top: 0.4mm;
      letter-spacing: 0.02em;
    }
    @media print {
      html, body { background: #fff; }
      .card { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="top">
      <img class="logo" src="${logoSrc}" alt="OD Member" />
      <div class="brand">
        <div class="brand-script">OneDream</div>
        <div class="brand-sub">MEMBER</div>
      </div>
    </div>
    <div class="mid">
      ${qrBlock}
    </div>
    <div class="bar">
      <div>
        <div class="field-label">Member no.</div>
        <div class="field-value">${escapeHtml(payload.memberCode)}</div>
      </div>
      <div style="text-align:right">
        <div class="field-label">Valid till</div>
        <div class="field-value">${escapeHtml(payload.validUntilLabel)}</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function printOdMemberCard(payload: OdMemberCardExportPayload): void {
  if (typeof document === "undefined") return;

  const logoSrc = `${window.location.origin}/od-member-logo.svg`;
  const html = buildPrintHtml(payload, logoSrc);

  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "Print OD member card");
  iframe.setAttribute("aria-hidden", "true");
  Object.assign(iframe.style, {
    position: "fixed",
    left: "-9999px",
    top: "0",
    width: "400px",
    height: "280px",
    border: "0",
    pointerEvents: "none",
  });

  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    iframe.remove();
  };

  void waitForImages(doc).then(() => {
    requestAnimationFrame(() => {
      window.setTimeout(() => {
        try {
          win.focus();
          win.print();
        } catch {
          cleanup();
          return;
        }
        win.addEventListener("afterprint", cleanup, { once: true });
        window.setTimeout(cleanup, 15_000);
      }, 150);
    });
  });
}

function svgToImage(svgEl: SVGElement): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const serialized = new XMLSerializer().serializeToString(svgEl);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("QR image load failed"));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;
  });
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = src;
  });
}

/**
 * Rasterizes the same layout as print for a PNG file (exact pixel aspect ratio).
 */
export async function downloadOdMemberCardPng(payload: OdMemberCardExportPayload): Promise<void> {
  if (typeof document === "undefined") return;

  const W = OD_MEMBER_CARD_PX_W;
  const H = OD_MEMBER_CARD_PX_H;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const r = 18;
  ctx.beginPath();
  roundRectPath(ctx, 0, 0, W, H, r);
  const grd = ctx.createLinearGradient(0, 0, W, H);
  grd.addColorStop(0, "#c9a227");
  grd.addColorStop(0.28, "#f3e7b8");
  grd.addColorStop(0.52, "#e8c547");
  grd.addColorStop(1, "#a67c1a");
  ctx.fillStyle = grd;
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  roundRectPath(ctx, 0, 0, W, H, r);
  ctx.clip();
  const gloss = ctx.createLinearGradient(0, 0, W * 0.6, H * 0.5);
  gloss.addColorStop(0, "rgba(255,255,255,0.28)");
  gloss.addColorStop(0.45, "rgba(255,255,255,0)");
  ctx.fillStyle = gloss;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  roundRectPath(ctx, 0.5, 0.5, W - 1, H - 1, r - 1);
  ctx.stroke();

  const padX = Math.round(W * 0.042);
  const padY = Math.round(H * 0.055);

  const logoSrc = `${window.location.origin}/od-member-logo.svg`;
  try {
    const logo = await loadHtmlImage(logoSrc);
    const lh = Math.round(H * 0.2);
    const lw = Math.round((logo.naturalWidth / logo.naturalHeight) * lh);
    ctx.drawImage(logo, padX, padY, lw, lh);
  } catch {
    // skip logo
  }

  ctx.fillStyle = "#1b1813";
  ctx.font = `700 ${Math.round(H * 0.1)}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textAlign = "right";
  ctx.fillText("OneDream", W - padX, padY + Math.round(H * 0.07));
  ctx.font = `600 ${Math.round(H * 0.045)}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillStyle = "rgba(27,24,19,0.78)";
  ctx.fillText("MEMBER", W - padX, padY + Math.round(H * 0.115));

  const qrSize = Math.round(Math.min(W, H) * 0.38);
  const qx = Math.round((W - qrSize) / 2);
  const qy = Math.round(H * 0.22);

  try {
    let qrImg: HTMLImageElement;
    if (payload.qrSvgOuterHTML) {
      const parser = new DOMParser();
      const docSvg = parser.parseFromString(payload.qrSvgOuterHTML, "image/svg+xml");
      const svgEl = docSvg.querySelector("svg");
      if (svgEl) {
        qrImg = await svgToImage(svgEl);
      } else {
        throw new Error("no svg");
      }
    } else {
      qrImg = await loadHtmlImage(
        `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize * 2}x${qrSize * 2}&margin=1&data=${encodeURIComponent(
          payload.qrUrl
        )}`
      );
    }
    const pad = Math.round(qrSize * 0.04);
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    roundRect(ctx, qx - pad, qy - pad, qrSize + pad * 2, qrSize + pad * 2, 10);
    ctx.fill();
    ctx.drawImage(qrImg, qx, qy, qrSize, qrSize);
  } catch {
    // ignore QR failure
  }

  const barY = Math.round(H * 0.78);
  const barH = H - barY;
  ctx.fillStyle = "rgba(255,255,255,0.42)";
  roundRect(ctx, padX - 6, barY, W - (padX - 6) * 2, barH - 8, 12);
  ctx.fill();

  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(27,24,19,0.65)";
  ctx.font = `600 ${Math.round(H * 0.038)}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillText("MEMBER NO.", padX + 8, barY + Math.round(barH * 0.38));
  ctx.fillStyle = "#1b1813";
  ctx.font = `700 ${Math.round(H * 0.055)}px ui-mono, ui-monospace, monospace`;
  ctx.fillText(payload.memberCode, padX + 8, barY + Math.round(barH * 0.72));

  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(27,24,19,0.65)";
  ctx.font = `600 ${Math.round(H * 0.038)}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillText("VALID TILL", W - padX - 8, barY + Math.round(barH * 0.38));
  ctx.fillStyle = "#1b1813";
  ctx.font = `700 ${Math.round(H * 0.048)}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillText(payload.validUntilLabel, W - padX - 8, barY + Math.round(barH * 0.72));

  await new Promise<void>((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `od-member-card-${payload.memberCode.replace(/[^a-zA-Z0-9-]/g, "")}.png`;
          a.click();
          URL.revokeObjectURL(url);
        }
        resolve();
      },
      "image/png"
    );
  });
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  rad: number
) {
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  rad: number
) {
  ctx.beginPath();
  roundRectPath(ctx, x, y, w, h, rad);
}
