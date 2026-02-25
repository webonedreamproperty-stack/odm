import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
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
    <div className="h-full flex flex-col space-y-8 bg-background p-6 md:p-8 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground md:text-base">
            A quick pulse check on loyalty performance and customer activity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-border/80 bg-card text-muted-foreground shadow-subtle">
            Last {DAY_COUNT} days
          </Badge>
          <Badge variant="secondary" className="text-muted-foreground">
            Auto-updating
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card className="border-border/80 bg-card shadow-subtle">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight">{formatNumber(customers.length)}</div>
            <p className="mt-1 text-xs text-muted-foreground">Active plus inactive profiles</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card shadow-subtle">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Issued Cards</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight">{formatNumber(totals.issued)}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatNumber(totals.active)} active | {formatNumber(totals.redeemed)} redeemed
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card shadow-subtle">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Redemption Rate</CardTitle>
            <BadgeCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight">{formatPercent(totals.redemptionRate)}%</div>
            <p className="mt-1 text-xs text-muted-foreground">Completed loyalty cycles</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card shadow-subtle">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Stamps (Active)</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight">{formatPercent(totals.avgStamps)}</div>
            <p className="mt-1 text-xs text-muted-foreground">Momentum across active cards</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card shadow-subtle">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ready To Redeem</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight">{formatNumber(totals.readyToRedeem)}</div>
            <p className="mt-1 text-xs text-muted-foreground">Cards that hit the reward threshold</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card shadow-subtle">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Cards</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight">{formatNumber(totals.active)}</div>
            <p className="mt-1 text-xs text-muted-foreground">Currently collecting stamps</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2 border-border/80 bg-card shadow-subtle">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Activity Over Time</CardTitle>
            <p className="text-sm text-muted-foreground">Stamp adds and redemptions combined.</p>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-56 rounded-lg border border-border/70 bg-muted/30 px-3 pb-3 pt-5">
              <div className="flex h-full items-end gap-2">
                {activityBuckets.map((bucket, index) => {
                  const height = Math.round(((bucket.stampAdds + bucket.redemptions) / maxActivity) * 100);
                  const isLast = index === activityBuckets.length - 1;
                  return (
                    <div key={`${bucket.label}-${index}`} className="flex flex-1 flex-col items-center gap-2">
                      <div className="flex h-full w-full items-end">
                        <div
                          className={`w-full rounded-md transition-all duration-200 ${
                            isLast ? "bg-foreground/80" : "bg-foreground/25"
                          }`}
                          style={{ height: `${Math.max(10, height)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{bucket.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-foreground/25" />
                Activity
              </span>
              <span className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-foreground/80" />
                Most recent day
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card shadow-subtle">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Progress Distribution</CardTitle>
            <p className="text-sm text-muted-foreground">Active cards by completion.</p>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted/70">
              <div
                className="h-full bg-foreground/15"
                style={{ width: `${distributionWidth(progressDistribution.zero)}%` }}
              />
              <div
                className="h-full bg-foreground/28"
                style={{ width: `${distributionWidth(progressDistribution.low)}%` }}
              />
              <div
                className="h-full bg-foreground/45"
                style={{ width: `${distributionWidth(progressDistribution.mid)}%` }}
              />
              <div
                className="h-full bg-foreground/70"
                style={{ width: `${distributionWidth(progressDistribution.full)}%` }}
              />
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">0%</span>
                <span className="font-medium">{formatNumber(progressDistribution.zero)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">1-49%</span>
                <span className="font-medium">{formatNumber(progressDistribution.low)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">50-99%</span>
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

      <Card className="border-border/80 bg-card shadow-subtle">
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
              <div key={campaign.id} className="rounded-lg border border-border/80 bg-background px-4 py-4 shadow-subtle">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-foreground">{campaign.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {campaign.issued} issued | {campaign.active} active | {campaign.redeemed} redeemed
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-md border border-border/80 bg-card px-2 py-1">
                      Avg stamps {formatPercent(campaign.avgStamps)}
                    </span>
                    <span className="rounded-md border border-border/80 bg-card px-2 py-1">
                      {formatPercent(campaign.completionRate)}% redeemed
                    </span>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Ready to redeem: {campaign.readyToRedeem}</span>
                    <span>{campaign.totalStamps} stamps to reward</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted/70">
                    <div
                      className="h-full bg-foreground/70"
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
