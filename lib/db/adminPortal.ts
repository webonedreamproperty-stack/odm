import { supabase } from "../supabase";

export type AdminMemberRow = {
  id: string;
  email: string;
  display_name: string;
  member_code: string;
  public_username?: string | null;
  country: string;
  created_at: string;
  membership_status: string | null;
  membership_plan: string | null;
  valid_from: string | null;
  valid_until: string | null;
};

export type AdminPartnerRow = {
  id: string;
  business_name: string;
  email: string;
  slug: string | null;
  role: string;
  account_status: string;
  access_status: string;
  tier: string;
  tier_expires_at: string | null;
  created_at: string;
  staff_count: number;
};

export type AdminSubscriptionRow = {
  member_id: string;
  member_code: string;
  email: string;
  display_name: string;
  status: string;
  plan: string;
  valid_from: string;
  valid_until: string;
  created_at: string;
  updated_at: string;
};

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export async function adminListMembers(): Promise<{ ok: true; data: AdminMemberRow[] } | { ok: false; error: string }> {
  const { data, error } = await supabase.rpc("admin_list_od_members");
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data: asArray<AdminMemberRow>(data) };
}

export async function adminListPartners(): Promise<{ ok: true; data: AdminPartnerRow[] } | { ok: false; error: string }> {
  const { data, error } = await supabase.rpc("admin_list_vendor_accounts");
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data: asArray<AdminPartnerRow>(data) };
}

export async function adminCreateMember(input: {
  email: string;
  password: string;
  displayName: string;
  country: string;
}) {
  const { data, error } = await supabase.rpc("admin_create_member_account", {
    p_email: input.email,
    p_password: input.password,
    p_display_name: input.displayName,
    p_country: input.country,
  });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data };
}

export async function adminUpdateMember(input: {
  memberId: string;
  displayName: string;
  country: string;
  publicUsername: string | null;
}) {
  const { data, error } = await supabase.rpc("admin_update_member_account", {
    p_member_id: input.memberId,
    p_display_name: input.displayName,
    p_country: input.country,
    p_public_username: input.publicUsername,
  });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data };
}

export async function adminDeleteMember(memberId: string) {
  const { data, error } = await supabase.rpc("admin_delete_member_account", {
    p_member_id: memberId,
  });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data };
}

export async function adminCreatePartner(input: {
  email: string;
  password: string;
  businessName: string;
  slug: string | null;
}) {
  const { data, error } = await supabase.rpc("admin_create_partner_account", {
    p_email: input.email,
    p_password: input.password,
    p_business_name: input.businessName,
    p_slug: input.slug,
  });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data };
}

export async function adminUpdatePartner(input: {
  partnerId: string;
  businessName: string;
  slug: string | null;
  accountStatus: string;
  accessStatus: string;
  tier: string;
}) {
  const { data, error } = await supabase.rpc("admin_update_partner_account", {
    p_partner_id: input.partnerId,
    p_business_name: input.businessName,
    p_slug: input.slug,
    p_account_status: input.accountStatus,
    p_access_status: input.accessStatus,
    p_tier: input.tier,
  });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data };
}

export async function adminDeletePartner(partnerId: string) {
  const { data, error } = await supabase.rpc("admin_delete_partner_account", {
    p_partner_id: partnerId,
  });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data };
}

export async function adminListSubscriptions(): Promise<{ ok: true; data: AdminSubscriptionRow[] } | { ok: false; error: string }> {
  const { data, error } = await supabase.rpc("admin_list_od_memberships");
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data: asArray<AdminSubscriptionRow>(data) };
}

export async function adminCreateSubscription(input: {
  memberId: string;
  status: string;
  plan: string;
  validFrom: string;
  validUntil: string;
}) {
  const { data, error } = await supabase.rpc("admin_create_od_membership", {
    p_member_id: input.memberId,
    p_status: input.status,
    p_plan: input.plan,
    p_valid_from: input.validFrom,
    p_valid_until: input.validUntil,
  });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data };
}

export async function adminUpdateSubscription(input: {
  memberId: string;
  status: string;
  plan: string;
  validFrom: string;
  validUntil: string;
}) {
  const { data, error } = await supabase.rpc("admin_update_od_membership", {
    p_member_id: input.memberId,
    p_status: input.status,
    p_plan: input.plan,
    p_valid_from: input.validFrom,
    p_valid_until: input.validUntil,
  });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data };
}

export async function adminDeleteSubscription(memberId: string) {
  const { data, error } = await supabase.rpc("admin_delete_od_membership", {
    p_member_id: memberId,
  });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data };
}

