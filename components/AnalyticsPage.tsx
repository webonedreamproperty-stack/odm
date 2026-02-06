import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { cn } from "../lib/utils";
import { Customer, Template, Transaction } from "../types";
import { resolveCardTemplate } from "../lib/templateSerialization";
import {
  Activity,
  BadgeCheck,
  CreditCard,
  Sparkles,
  Users,
  TrendingUp
} from "lucide-react";

interface AnalyticsPageProps {
  customers: Customer[];
  campaigns: Template[];
}

type ActivityBucket = {
  label: string;
  stampAdds: number;
  redemptions: number;
  total: number;
};

const DAY_COUNT = 14;

const formatNumber = (value: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);

const formatPercent = (value: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);

const getDateKey = (date: Date) =>
  `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ customers, campaigns }) => {
  const allCards = useMemo(() => customers.flatMap((c) => c.cards), [customers]);

  const totals = useMemo(() => {
    const issued = allCards.length;
    const active = allCards.filter((card) => card.status === "Active");
    const redeemed = allCards.filter((card) => card.status === "Redeemed");
    const redemptionRate = issued > 0 ? (redeemed.length / issued) * 100 : 0;

    const avgStamps =
      active.length > 0
        ? active.reduce((sum, card) => sum + (card.stamps || 0), 0) / active.length
        : 0;

    const readyToRedeem = active.filter((card) => {
      const template = resolveCardTemplate(card, campaigns);
      if (!template) return false;
      return card.stamps >= template.totalStamps;
    }).length;

    return {
      issued,
      active: active.length,
      redeemed: redeemed.length,
      redemptionRate,
      avgStamps,
      readyToRedeem
    };
  }, [allCards, campaigns]);

  const activityBuckets = useMemo(() => {
    const now = new Date();
    const days: ActivityBucket[] = [];

    for (let i = DAY_COUNT - 1; i >= 0; i -= 1) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      days.push({
        label: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        stampAdds: 0,
        redemptions: 0,
        total: 0
      });
    }

    const bucketByKey = new Map<string, ActivityBucket>();
    days.forEach((bucket, index) => {
      const date = new Date(now);
      date.setDate(now.getDate() - (DAY_COUNT - 1 - index));
      bucketByKey.set(getDateKey(date), bucket);
    });

    allCards.forEach((card) => {
      (card.history || []).forEach((tx: Transaction) => {
        if (!tx.timestamp) return;
        const txDate = new Date(tx.timestamp);
        const key = getDateKey(txDate);
        const bucket = bucketByKey.get(key);
        if (!bucket) return;
        if (tx.type === "stamp_add") bucket.stampAdds += tx.amount || 1;
        if (tx.type === "redeem") bucket.redemptions += 1;
        bucket.total += 1;
      });
    });

    return days;
  }, [allCards]);

  const progressDistribution = useMemo(() => {
    const buckets = {
      zero: 0,
      low: 0,
      mid: 0,
      full: 0
    };

    allCards
      .filter((card) => card.status === "Active")
      .forEach((card) => {
        const template = resolveCardTemplate(card, campaigns);
        if (!template || template.totalStamps === 0) return;
        const ratio = card.stamps / template.totalStamps;
        if (ratio <= 0) buckets.zero += 1;
        else if (ratio < 0.5) buckets.low += 1;
        else if (ratio < 1) buckets.mid += 1;
        else buckets.full += 1;
      });

    return buckets;
  }, [allCards, campaigns]);

  const campaignStats = useMemo(() => {
    return campaigns.map((campaign) => {
      const cards = allCards.filter((card) => card.campaignId === campaign.id);
      const active = cards.filter((card) => card.status === "Active");
      const redeemed = cards.filter((card) => card.status === "Redeemed");
      const avgStamps =
        active.length > 0
          ? active.reduce((sum, card) => sum + card.stamps, 0) / active.length
          : 0;
      const completionRate = cards.length > 0 ? (redeemed.length / cards.length) * 100 : 0;
      const readyToRedeem = active.filter((card) => card.stamps >= campaign.totalStamps).length;

      return {
        id: campaign.id,
        name: campaign.name,
        totalStamps: campaign.totalStamps,
        issued: cards.length,
        active: active.length,
        redeemed: redeemed.length,
        avgStamps,
        completionRate,
        readyToRedeem
      };
    });
  }, [campaigns, allCards]);

  const maxActivity = Math.max(
    1,
    ...activityBuckets.map((bucket) => bucket.stampAdds + bucket.redemptions)
  );

  const distributionTotal =
    progressDistribution.zero +
    progressDistribution.low +
    progressDistribution.mid +
    progressDistribution.full;

  const distributionWidth = (value: number) =>
    distributionTotal === 0 ? 0 : (value / distributionTotal) * 100;

  return (
    <div className="p-8 space-y-8 animate-fade-in h-full flex flex-col bg-gradient-to-br from-amber-50 via-white to-rose-50">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Analytics</h1>
          <p className="text-muted-foreground">
            A quick pulse check on loyalty performance and customer activity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-white/80 text-foreground border border-amber-200 shadow-sm">
            Last {DAY_COUNT} days
          </Badge>
          <Badge className="bg-amber-100 text-amber-900 border border-amber-200">
            Auto-updating
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <Card className="relative overflow-hidden border-amber-100 shadow-md bg-white/80">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-orange-400" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{formatNumber(customers.length)}</div>
            <p className="text-xs text-muted-foreground mt-1">Active plus inactive profiles</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-orange-100 shadow-md bg-white/80">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-500 to-rose-400" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Issued Cards</CardTitle>
            <CreditCard className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{formatNumber(totals.issued)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatNumber(totals.active)} active · {formatNumber(totals.redeemed)} redeemed
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-rose-100 shadow-md bg-white/80">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-500 to-pink-400" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Redemption Rate</CardTitle>
            <BadgeCheck className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{formatPercent(totals.redemptionRate)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Completed loyalty cycles
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-amber-100 shadow-md bg-white/80">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 to-yellow-400" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Stamps (Active)</CardTitle>
            <Sparkles className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{formatPercent(totals.avgStamps)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Momentum across active cards
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-emerald-100 shadow-md bg-white/80">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ready To Redeem</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{formatNumber(totals.readyToRedeem)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Cards that hit the reward threshold
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-slate-100 shadow-md bg-white/80">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-slate-500 to-slate-300" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Cards</CardTitle>
            <Activity className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{formatNumber(totals.active)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently collecting stamps
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2 border border-amber-100 shadow-md bg-white/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Activity Over Time</CardTitle>
            <p className="text-sm text-muted-foreground">Stamp adds and redemptions combined.</p>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex items-end gap-2 h-48">
              {activityBuckets.map((bucket, index) => {
                const height = Math.round(((bucket.stampAdds + bucket.redemptions) / maxActivity) * 100);
                const isLast = index === activityBuckets.length - 1;
                return (
                  <div key={`${bucket.label}-${index}`} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full h-full flex items-end">
                      <div
                        className={cn(
                          "w-full rounded-xl bg-gradient-to-t from-amber-400 via-orange-400 to-rose-400",
                          isLast && "from-emerald-400 via-teal-400 to-sky-400"
                        )}
                        style={{ height: `${Math.max(10, height)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{bucket.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-amber-400" />
                Stamp activity
              </span>
              <span className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-rose-400" />
                Redemptions included
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-rose-100 shadow-md bg-white/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Progress Distribution</CardTitle>
            <p className="text-sm text-muted-foreground">Active cards by completion.</p>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="w-full h-3 rounded-full overflow-hidden bg-slate-100 flex">
              <div
                className="h-full bg-slate-300"
                style={{ width: `${distributionWidth(progressDistribution.zero)}%` }}
              />
              <div
                className="h-full bg-amber-300"
                style={{ width: `${distributionWidth(progressDistribution.low)}%` }}
              />
              <div
                className="h-full bg-orange-400"
                style={{ width: `${distributionWidth(progressDistribution.mid)}%` }}
              />
              <div
                className="h-full bg-emerald-400"
                style={{ width: `${distributionWidth(progressDistribution.full)}%` }}
              />
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">0%</span>
                <span className="font-medium">{formatNumber(progressDistribution.zero)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">1–49%</span>
                <span className="font-medium">{formatNumber(progressDistribution.low)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">50–99%</span>
                <span className="font-medium">{formatNumber(progressDistribution.mid)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Completed</span>
                <span className="font-medium">{formatNumber(progressDistribution.full)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-amber-100 shadow-md bg-white/90">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Campaign Performance</CardTitle>
          <p className="text-sm text-muted-foreground">
            Snapshot of active momentum by campaign.
          </p>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {campaignStats.length === 0 ? (
            <div className="text-sm text-muted-foreground">No campaigns found.</div>
          ) : (
            campaignStats.map((campaign) => (
              <div key={campaign.id} className="rounded-xl border border-amber-100/60 bg-white px-4 py-3 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">{campaign.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {campaign.issued} issued · {campaign.active} active · {campaign.redeemed} redeemed
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-900">
                      Avg stamps {formatPercent(campaign.avgStamps)}
                    </span>
                    <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-900">
                      {formatPercent(campaign.completionRate)}% redeemed
                    </span>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                    <span>Ready to redeem: {campaign.readyToRedeem}</span>
                    <span>{campaign.totalStamps} stamps to reward</span>
                  </div>
                  <div className="h-2 rounded-full bg-amber-50 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-orange-400"
                      style={{ width: `${Math.min(100, campaign.completionRate)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};
