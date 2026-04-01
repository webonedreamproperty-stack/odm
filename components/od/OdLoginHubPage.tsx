import React from "react";
import { Link } from "react-router-dom";
import { Building2, UserRound } from "lucide-react";

export const OdLoginHubPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f5f3ef] px-6 py-12">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a8276]">OD</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#1b1813]">Sign in</h1>
          <p className="mt-2 text-sm text-[#6d6658]">Choose how you use OD.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            to="/od/member/login"
            className="group flex flex-col rounded-[1.5rem] border border-black/[0.08] bg-white p-6 shadow-sm transition hover:border-black/15 hover:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4f1ea] text-[#1b1813]">
              <UserRound className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-[#1b1813]">Member</h2>
            <p className="mt-1 text-sm text-[#6d6658]">Discounts, directory, verify at shops.</p>
            <span className="mt-4 text-sm font-medium text-[#1b1813] group-hover:underline">Member sign in →</span>
          </Link>

          <Link
            to="/od/vendor/login"
            className="group flex flex-col rounded-[1.5rem] border border-black/[0.08] bg-white p-6 shadow-sm transition hover:border-black/15 hover:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4f1ea] text-[#1b1813]">
              <Building2 className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-[#1b1813]">Vendor</h2>
            <p className="mt-1 text-sm text-[#6d6658]">Shop dashboard, QR for members, listings.</p>
            <span className="mt-4 text-sm font-medium text-[#1b1813] group-hover:underline">Business sign in →</span>
          </Link>
        </div>

        <div className="rounded-2xl border border-dashed border-black/10 bg-white/60 px-4 py-4 text-center text-sm text-[#6d6658]">
          <span className="font-medium text-[#1b1813]">New?</span>{" "}
          <Link className="underline-offset-2 hover:underline" to="/od/member/signup">
            Member signup
          </Link>
          {" · "}
          <Link className="underline-offset-2 hover:underline" to="/od/signup">
            Vendor signup
          </Link>
        </div>

        <p className="text-center text-sm text-[#8a8276]">
          <Link className="font-medium text-[#1b1813] underline-offset-2 hover:underline" to="/login">
            Stampee business login (full URL)
          </Link>
        </p>
      </div>
    </div>
  );
};
