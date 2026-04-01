import { supabase } from '../supabase';
import type { MemberAccount } from '../../types';

type MemberRow = {
  id: string;
  email: string;
  display_name: string;
  member_code: string;
  country: string;
  created_at: string;
};

type MembershipRow = {
  member_id: string;
  status: 'active' | 'suspended';
  plan: 'month' | 'year' | null;
  valid_from: string | null;
  valid_until: string | null;
};

export function rowToMemberAccount(
  profile: MemberRow,
  membership: MembershipRow | null
): MemberAccount {
  return {
    id: profile.id,
    email: profile.email,
    displayName: profile.display_name,
    memberCode: profile.member_code,
    country: profile.country,
    createdAt: profile.created_at,
    membership: membership
      ? {
          status: membership.status,
          plan: membership.plan,
          validFrom: membership.valid_from,
          validUntil: membership.valid_until,
        }
      : null,
  };
}

export async function fetchMemberProfile(userId: string): Promise<MemberAccount | null> {
  const { data: profile, error: pErr } = await supabase
    .from('member_profiles')
    .select('id, email, display_name, member_code, country, created_at')
    .eq('id', userId)
    .maybeSingle();

  if (pErr || !profile) return null;

  const { data: om } = await supabase
    .from('od_memberships')
    .select('member_id, status, plan, valid_from, valid_until')
    .eq('member_id', userId)
    .maybeSingle();

  return rowToMemberAccount(profile as MemberRow, om as MembershipRow | null);
}

export async function fetchIsOdAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('od_admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return false;
  return true;
}

export type OdShopVerification = {
  qualified: boolean;
  memberCode: string;
  validUntil: string | null;
  validFrom: string | null;
  membershipStatus: string;
  shopName: string;
  shopSlug: string;
};

export type OdVerificationRpcError = 'not_authenticated' | 'not_member' | 'shop_not_found';

export async function getOdMemberShopVerification(
  shopSlug: string
): Promise<{ ok: true; data: OdShopVerification } | { ok: false; error: OdVerificationRpcError | string }> {
  const { data, error } = await supabase.rpc('get_od_member_shop_verification', {
    shop_slug: shopSlug.trim(),
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const payload = data as Record<string, unknown> | null;
  if (!payload) return { ok: false, error: 'empty' };

  const err = payload.error;
  if (typeof err === 'string') {
    return { ok: false, error: err as OdVerificationRpcError };
  }

  return {
    ok: true,
    data: {
      qualified: Boolean(payload.qualified),
      memberCode: String(payload.member_code ?? ''),
      validUntil: payload.valid_until ? String(payload.valid_until) : null,
      validFrom: payload.valid_from ? String(payload.valid_from) : null,
      membershipStatus: String(payload.membership_status ?? 'none'),
      shopName: String(payload.shop_name ?? ''),
      shopSlug: String(payload.shop_slug ?? ''),
    },
  };
}

export type OdRenewPlan = 'month' | 'year';

export async function memberSelfRenewOdMembership(
  plan: OdRenewPlan
): Promise<{ ok: true; validFrom: string; validUntil: string } | { ok: false; error: string }> {
  const { data, error } = await supabase.rpc('member_self_renew_od_membership', {
    p_plan: plan,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const payload = data as Record<string, unknown> | null;
  if (!payload || payload.success !== true) {
    return { ok: false, error: 'Renewal failed.' };
  }

  const vf = payload.valid_from ?? payload.validFrom;
  const vt = payload.valid_until ?? payload.validUntil;

  return {
    ok: true,
    validFrom: vf != null ? String(vf) : '',
    validUntil: vt != null ? String(vt) : '',
  };
}
