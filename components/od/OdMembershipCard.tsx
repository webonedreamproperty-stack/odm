import React, { useCallback, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { Download } from "lucide-react";
import { Button } from "../ui/button";
import { downloadOdMemberCardPng, printOdMemberCard } from "../../lib/odMemberCardExport";
import { cn } from "../../lib/utils";

const CARD_ASPECT = "85.6 / 53.98";

type OdMembershipCardProps = {
  memberCode: string;
  validUntilLabel: string;
  qrUrl: string;
  className?: string;
};

export const OdMembershipCard: React.FC<OdMembershipCardProps> = ({ memberCode, validUntilLabel, qrUrl, className }) => {
  const qrRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const handleDownloadAndPrint = useCallback(async () => {
    const svg = qrRef.current?.querySelector("svg");
    const payload = {
      memberCode,
      validUntilLabel,
      qrUrl,
      qrSvgOuterHTML: svg?.outerHTML,
    };
    setBusy(true);
    try {
      await downloadOdMemberCardPng(payload);
      printOdMemberCard(payload);
    } finally {
      setBusy(false);
    }
  }, [memberCode, validUntilLabel, qrUrl]);

  return (
    <div className={cn("mt-5", className)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a8276]">Membership card</p>
      <p className="mt-1 text-xs text-[#6d6658]">
        Wallet-sized card with your member ID and QR. Print uses exact credit-card dimensions (85.6 × 54 mm).
      </p>

      <div className="mt-4 flex justify-center md:justify-start">
        <div
          className="relative w-full max-w-[min(100%,342px)] overflow-hidden rounded-2xl border border-white/50 shadow-[0_12px_40px_rgba(0,0,0,0.12)] md:w-[342px] md:max-w-none md:flex-none"
          style={{ aspectRatio: CARD_ASPECT }}
        >
          <div
            className="absolute inset-0 rounded-2xl border border-white/45"
            style={{
              background:
                "linear-gradient(145deg, rgba(255,255,255,0.22) 0%, transparent 42%), linear-gradient(135deg, #c9a227 0%, #f3e7b8 28%, #e8c547 52%, #a67c1a 100%)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)",
            }}
          />
          <div className="relative flex h-full flex-col justify-between p-3 sm:p-4">
            <div className="flex items-start justify-between gap-2">
              <img
                src="/od-member-logo.svg"
                alt=""
                className="h-10 w-auto shrink-0 drop-shadow-sm sm:h-12"
                width={200}
                height={64}
              />
              <div className="text-right leading-tight">
                <div className="text-lg font-bold tracking-tight text-[#1b1813] sm:text-xl">OneDream</div>
                <div className="mt-0.5 text-[10px] font-semibold tracking-[0.22em] text-[#1b1813]/75 sm:text-[11px]">
                  MEMBER
                </div>
              </div>
            </div>

            <div className="flex flex-1 items-center justify-center py-1">
              <div
                ref={qrRef}
                className="rounded-xl bg-white p-1.5 shadow-[0_4px_14px_rgba(0,0,0,0.1)] [&_svg]:!h-[clamp(79px,23.4vw,108px)] [&_svg]:!w-[clamp(79px,23.4vw,108px)]"
              >
                <QRCode value={qrUrl} size={230} level="M" fgColor="#111827" bgColor="#ffffff" />
              </div>
            </div>

            <div className="flex items-end justify-between gap-2 rounded-xl border border-white/55 bg-white/40 px-2.5 py-2 sm:px-3">
              <div>
                <div className="text-[9px] font-semibold uppercase tracking-wide text-[#1b1813]/65 sm:text-[10px]">
                  Member no.
                </div>
                <div className="font-mono text-sm font-bold tabular-nums text-[#1b1813] sm:text-base">{memberCode}</div>
              </div>
              <div className="text-right">
                <div className="text-[9px] font-semibold uppercase tracking-wide text-[#1b1813]/65 sm:text-[10px]">
                  Valid till
                </div>
                <div className="text-xs font-bold text-[#1b1813] sm:text-sm">{validUntilLabel}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Button
        type="button"
        className="mt-4 w-full rounded-full bg-[#1b1813] hover:bg-[#11100d] sm:w-auto"
        disabled={busy}
        onClick={() => void handleDownloadAndPrint()}
      >
        <Download className="mr-2 h-4 w-4" aria-hidden />
        {busy ? "Preparing…" : "Download and Print"}
      </Button>
      <p className="mt-2 text-[11px] text-[#8a8276]">
        Saves a PNG, then opens print — choose your printer or &quot;Save as PDF&quot; for a file copy.
      </p>
    </div>
  );
};
