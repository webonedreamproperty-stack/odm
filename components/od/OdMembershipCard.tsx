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
          className="relative w-full max-w-[342px] overflow-hidden rounded-[1.15rem] border border-[#d2b35f]/50 shadow-[0_14px_40px_rgba(68,52,18,0.24)]"
          style={{ aspectRatio: CARD_ASPECT }}
        >
          <div
            className="absolute inset-0 rounded-[1.15rem]"
            style={{
              background:
                "radial-gradient(circle at 14% 14%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 30%), linear-gradient(132deg, #8f6a1e 0%, #d7b34c 36%, #f3df9d 58%, #c1932f 100%)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(90,63,13,0.35)",
            }}
          />
          <div className="absolute inset-0 rounded-[1.15rem] border border-white/25" />
          <div className="relative flex h-full flex-col justify-between p-3 sm:p-4">
            <div className="flex items-start justify-between gap-2">
              <img
                src="/odmember.png"
                alt=""
                className="h-8 w-auto shrink-0 opacity-95 drop-shadow-[0_2px_8px_rgba(0,0,0,0.15)] sm:h-10"
                width={200}
                height={64}
              />
              <div className="text-right leading-tight text-[#2a1f0a]">
                <div className="text-base font-semibold tracking-tight sm:text-[1.1rem]">OneDream</div>
                <div className="mt-0.5 text-[9px] font-semibold tracking-[0.24em] text-[#2a1f0a]/70 sm:text-[10px]">
                  MEMBER
                </div>
              </div>
            </div>

            <div className="flex flex-1 items-center justify-center py-0.5">
              <div
                ref={qrRef}
                className="rounded-[0.85rem] border border-[#ebe3ca] bg-white p-1.5 shadow-[0_8px_18px_rgba(0,0,0,0.16)] [&_svg]:!h-[clamp(76px,22vw,98px)] [&_svg]:!w-[clamp(76px,22vw,98px)] sm:[&_svg]:!h-[78px] sm:[&_svg]:!w-[98px]"
              >
                <QRCode value={qrUrl} size={230} level="M" fgColor="#111827" bgColor="#ffffff" />
              </div>
            </div>

            <div className="flex items-end justify-between gap-2 rounded-[0.8rem] border border-white/50 bg-[#fff6dd]/60 px-2.5 py-2 backdrop-blur-[1px] sm:px-3">
              <div className="min-w-0">
                <div className="text-[9px] font-semibold uppercase tracking-[0.11em] text-[#2a1f0a]/65 sm:text-[10px]">
                  Member no.
                </div>
                <div className="truncate font-mono text-[13px] font-semibold tabular-nums text-[#1f180b] sm:text-[15px]">
                  {memberCode}
                </div>
              </div>
              <div className="min-w-0 text-right">
                <div className="text-[9px] font-semibold uppercase tracking-[0.11em] text-[#2a1f0a]/65 sm:text-[10px]">
                  Valid till
                </div>
                <div className="truncate text-[11px] font-semibold text-[#1f180b] sm:text-sm">{validUntilLabel}</div>
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
