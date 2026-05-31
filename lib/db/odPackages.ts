import { supabase } from "../supabase";
import {
  OD_RENEWAL_PACKAGES,
  type OdRenewalPackage,
} from "../odPricing";

type PackageRow = {
  plan?: unknown;
  title?: unknown;
  price_rm?: unknown;
  blurb?: unknown;
  sort_order?: unknown;
  one_time_per_member?: unknown;
};

function rowToPackage(row: PackageRow): OdRenewalPackage | null {
  const plan = typeof row.plan === "string" ? row.plan.trim() : "";
  if (!plan) return null;
  const title = typeof row.title === "string" ? row.title : plan;
  const priceRaw = row.price_rm;
  const priceRm =
    typeof priceRaw === "number"
      ? priceRaw
      : typeof priceRaw === "string"
        ? Number.parseFloat(priceRaw)
        : 0;
  return {
    plan,
    title,
    priceRm: Number.isFinite(priceRm) ? priceRm : 0,
    blurb: typeof row.blurb === "string" ? row.blurb : "",
    sortOrder: typeof row.sort_order === "number" ? row.sort_order : 0,
    oneTimePerMember: row.one_time_per_member === true,
  };
}

export function mapOdRenewalPackageRows(value: unknown): OdRenewalPackage[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => rowToPackage(row as PackageRow))
    .filter((pkg): pkg is OdRenewalPackage => pkg != null)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export async function fetchOdRenewalPackages(): Promise<OdRenewalPackage[]> {
  const { data, error } = await supabase.rpc("list_od_renewal_packages");
  if (error) return [...OD_RENEWAL_PACKAGES];
  const mapped = mapOdRenewalPackageRows(data);
  return mapped.length > 0 ? mapped : [...OD_RENEWAL_PACKAGES];
}

export function filterOdPackagesForMember(
  packages: readonly OdRenewalPackage[],
  opts: { usedOneTimePlans: readonly string[] }
): OdRenewalPackage[] {
  const used = new Set(opts.usedOneTimePlans);
  return packages.filter((pkg) => !pkg.oneTimePerMember || !used.has(pkg.plan));
}
