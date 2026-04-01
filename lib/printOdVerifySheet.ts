/**
 * Prints a minimal sheet: OD Member logo + QR only (paper or Save as PDF).
 * Uses a hidden iframe (no popup) so browsers don't block the action.
 */

type PrintOdVerifySheetOptions = {
  verifyUrl: string;
  /** Serialized <svg> from react-qr-code (same origin, no network for QR). */
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

function buildPrintHtml(verifyUrl: string, qrSvgOuterHTML: string | undefined, logoSrc: string): string {
  const qrBlock = qrSvgOuterHTML
    ? `<div class="qr">${qrSvgOuterHTML}</div>`
    : `<img class="qr-img" src="https://api.qrserver.com/v1/create-qr-code/?size=320x320&amp;margin=2&amp;data=${encodeURIComponent(
        verifyUrl
      )}" alt="" width="280" height="280" />`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>OD — scan to verify</title>
  <style>
    @page { margin: 18mm; size: A4 portrait; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; }
    .sheet {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 32px 24px;
    }
    .logo {
      width: min(200px, 70vw);
      height: auto;
      margin-bottom: 28px;
      flex-shrink: 0;
    }
    .qr svg {
      width: 280px !important;
      height: 280px !important;
      max-width: 72vw;
      max-height: 72vw;
      display: block;
    }
    .qr-img {
      width: 280px;
      height: 280px;
      max-width: 72vw;
      max-height: 72vw;
      object-fit: contain;
    }
    @media print {
      .sheet { min-height: auto; padding: 0; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <img class="logo" src="${logoSrc}" alt="OD Member" />
    ${qrBlock}
  </div>
</body>
</html>`;
}

export function printOdVerifySheet({ verifyUrl, qrSvgOuterHTML }: PrintOdVerifySheetOptions): void {
  if (typeof document === "undefined") return;

  const logoSrc = `${window.location.origin}/od-member-logo.svg`;
  const html = buildPrintHtml(verifyUrl, qrSvgOuterHTML, logoSrc);

  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "Print OD verify");
  iframe.setAttribute("aria-hidden", "true");
  // Off-screen but real dimensions — 0×0 or opacity:0 iframes often print blank.
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
