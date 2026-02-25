import React from "react";
import { CheckCircle2, MailOpen } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { Button } from "./ui/button";

export const VerifyBanner: React.FC = () => {
  const { currentOwner, isVerified, verifyAccount } = useAuth();

  if (!currentOwner || isVerified) return null;

  return (
    <div className="mx-6 mt-6 rounded-lg border border-border/80 bg-card p-5 shadow-subtle">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-border/80 bg-background text-foreground shadow-subtle">
            <MailOpen size={22} />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Verify to issue cards
            </div>
            <div className="mt-1 text-base font-semibold text-foreground">
              Your Stampee is ready. Confirm your email to start issuing cards.
            </div>
          </div>
        </div>
        <Button
          onClick={verifyAccount}
          className="h-11 px-6 text-base"
        >
          <CheckCircle2 className="mr-2" size={18} />
          Verify email
        </Button>
      </div>
    </div>
  );
};
