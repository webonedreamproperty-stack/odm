import React from "react";
import { CheckCircle2, MailOpen } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { Button } from "./ui/button";

export const VerifyBanner: React.FC = () => {
  const { currentOwner, isVerified, verifyAccount } = useAuth();

  if (!currentOwner || isVerified) return null;

  return (
    <div className="mx-6 mt-6 rounded-3xl border border-amber-100 bg-gradient-to-r from-amber-50 via-lime-50 to-cyan-50 p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-2xl bg-white shadow flex items-center justify-center text-amber-600">
            <MailOpen size={22} />
          </div>
          <div>
            <div className="text-sm uppercase tracking-[0.2em] text-amber-700 font-semibold">
              Verify to issue cards
            </div>
            <div className="text-base font-semibold text-slate-900 mt-1">
              Your Stampverse is ready. Confirm your email to start issuing cards.
            </div>
          </div>
        </div>
        <Button
          onClick={verifyAccount}
          className="rounded-full h-11 px-6 text-base shadow-md"
        >
          <CheckCircle2 className="mr-2" size={18} />
          Verify email
        </Button>
      </div>
    </div>
  );
};
