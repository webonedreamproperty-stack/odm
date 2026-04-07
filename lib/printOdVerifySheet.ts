/**
 * Prints an OD member verification flyer (paper or Save as PDF).
 * Warm yellow background, official OD logo, centered QR, shop name.
 * Uses a hidden iframe (no popup) so browsers don't block the action.
 */

export type PrintOdVerifySheetOptions = {
  verifyUrl: string;
  /** Serialized <svg> from react-qr-code (same origin, no network for QR). */
  qrSvgOuterHTML?: string;
  /** Display name under the QR (e.g. business name). */
  shopName?: string;
  /** Short offer line for members (e.g. discount summary). */
  discountLine?: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

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

function buildPrintHtml(
  verifyUrl: string,
  qrSvgOuterHTML: string | undefined,
  logoSrc: string,
  opts: { shopName?: string; discountLine?: string }
): string {
  const shopName = opts.shopName?.trim();
  const discountLine = opts.discountLine?.trim();
  const safeUrl = escapeHtml(verifyUrl);
  const safeShop = shopName ? escapeHtml(shopName) : "";
  const safeDiscount = discountLine ? escapeHtml(discountLine) : "";

  const qrBlock = qrSvgOuterHTML
    ? `<div class="qr">${qrSvgOuterHTML}</div>`
    : `<img class="qr-img" src="https://api.qrserver.com/v1/create-qr-code/?size=360x360&amp;margin=2&amp;data=${encodeURIComponent(
        verifyUrl
      )}" alt="" width="300" height="300" />`;

  const shopLine = safeShop
    ? `<p class="vendor-name">${safeShop}</p>`
    : `<p class="vendor-name vendor-name--placeholder">Your shop name</p>`;

  const discountBlock = safeDiscount ? `<p class="discount">${safeDiscount}</p>` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>OD — scan to verify</title>
  <style>
    /* Default print/PDF: A5, no page margin (full-bleed area). */
    @page {
      size: A5 portrait;
      margin: 0;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      min-height: 100%;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    body {
      background: linear-gradient(165deg, #fffbeb 0%, #fef3c7 38%, #fde68a 100%);
      color: #0a0a0a;
    }
    .page {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px 24px 40px;
    }
    .main {
      width: 100%;
      max-width: 440px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .brand {
      width: 100%;
      display: flex;
      justify-content: center;
      margin-bottom: 20px;
    }
    .brand img {
      width: min(280px, 88vw);
      height: auto;
      max-height: 120px;
      object-fit: contain;
      display: block;
    }
    .hero {
      margin-bottom: 20px;
    }
    .hero-title {
      margin: 0;
      font-size: clamp(1.5rem, 4.5vw, 2rem);
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #0a0a0a;
      line-height: 1.15;
    }
    .hero-sub {
      margin: 10px 0 0;
      font-size: 0.95rem;
      font-weight: 500;
      color: #374151;
      letter-spacing: 0.01em;
    }
    .vendor-name {
      margin: 14px 0 0;
      font-size: 1.05rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      color: #111827;
      line-height: 1.35;
      word-wrap: break-word;
    }
    .vendor-name--placeholder {
      color: #6b7280;
      font-weight: 600;
    }
    .card {
      width: 100%;
      margin-top: 22px;
      background: #fff;
      border-radius: 24px;
      padding: 28px 20px 24px;
      box-shadow:
        0 2px 4px rgba(0,0,0,0.06),
        0 12px 28px rgba(180, 140, 40, 0.18);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .qr-wrap {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .qr svg {
      width: 280px !important;
      height: 280px !important;
      max-width: min(72vw, 280px);
      max-height: min(72vw, 280px);
      display: block;
      margin: 0 auto;
    }
    .qr-img {
      width: 280px;
      height: 280px;
      max-width: min(72vw, 280px);
      max-height: min(72vw, 280px);
      object-fit: contain;
      display: block;
      margin: 0 auto;
    }
    .discount {
      margin: 16px 0 0;
      font-size: 0.88rem;
      line-height: 1.45;
      color: #374151;
      font-weight: 500;
      word-wrap: break-word;
      max-width: 100%;
    }
    .footer {
      margin-top: 28px;
      width: 100%;
      max-width: 440px;
      text-align: center;
    }
    .footer-url {
      margin: 0;
      font-size: 0.65rem;
      line-height: 1.5;
      color: #52525b;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      word-break: break-all;
    }
    .footer-brand {
      margin: 12px 0 0;
      font-size: 0.68rem;
      letter-spacing: 0.03em;
      color: #71717a;
    }
    @media print {
      html, body {
        height: 100%;
        margin: 0;
        padding: 0;
      }
      .page {
        /* A5 portrait: 148mm × 210mm — fill sheet with yellow background */
        min-height: 210mm;
        min-height: 100vh;
        justify-content: center;
        padding: 0;
        box-sizing: border-box;
      }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="main">
      <div class="brand">
        <img src="${logoSrc}" alt="OD Member" />
      </div>
      <header class="hero">
        <h1 class="hero-title">Member verify</h1>
        <p class="hero-sub">Scan to confirm OD status at checkout</p>
        ${shopLine}
      </header>
      <div class="card">
        <div class="qr-wrap">
          ${qrBlock}
        </div>
        ${discountBlock}
      </div>
      <footer class="footer">
        <p class="footer-url">${safeUrl}</p>
        <p class="footer-brand">OD Member verification</p>
      </footer>
    </div>
  </div>
</body>
</html>`;
}

export function printOdVerifySheet({
  verifyUrl,
  qrSvgOuterHTML,
  shopName,
  discountLine,
}: PrintOdVerifySheetOptions): void {
  if (typeof document === "undefined") return;

  const logoSrc = `${window.location.origin}/odmember.svg`;
  const html = buildPrintHtml(verifyUrl, qrSvgOuterHTML, logoSrc, { shopName, discountLine });

  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "Print OD verify");
  iframe.setAttribute("aria-hidden", "true");
  Object.assign(iframe.style, {
    position: "fixed",
    left: "-9999px",
    top: "0",
    width: "800px",
    height: "1200px",
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
      setTimeout(() => {
        try {
          win.focus();
          win.print();
        } catch {
          cleanup();
          return;
        }
        win.addEventListener("afterprint", cleanup, { once: true });
        window.setTimeout(cleanup, 15_000);
      }, 100);
    });
  });
}
