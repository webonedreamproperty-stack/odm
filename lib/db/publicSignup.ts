import { supabase } from '../supabase';

export interface PublicCampaignSignupContext {
  owner: {
    id: string;
    slug: string;
    businessName: string;
  };
  campaign: {
    id: string;
    name: string;
    isEnabled: boolean;
  };
}

export type PublicCampaignSignupOutcome =
  | { outcome: 'issued'; uniqueId: string }
  | { outcome: 'redirect_existing'; uniqueId: string }
  | { outcome: 'campaign_disabled_no_existing' }
  | { outcome: 'error'; error: string };

export async function fetchPublicCampaignSignupContext(
  slug: string,
  campaignId: string
): Promise<PublicCampaignSignupContext | null> {
  const { data, error } = await supabase.rpc('get_public_campaign_signup_context', {
    slug_input: slug,
    campaign_id_input: campaignId,
  });
  if (error || !data || typeof data !== 'object') {
    return null;
  }

  const payload = data as {
    owner?: { id?: string; slug?: string; businessName?: string };
    campaign?: { id?: string; name?: string; isEnabled?: boolean };
  };

  if (!payload.owner?.id || !payload.owner.slug || !payload.campaign?.id || !payload.campaign.name) {
    return null;
  }

  return {
    owner: {
      id: payload.owner.id,
      slug: payload.owner.slug,
      businessName: payload.owner.businessName ?? '',
    },
    campaign: {
      id: payload.campaign.id,
      name: payload.campaign.name,
      isEnabled: payload.campaign.isEnabled !== false,
    },
  };
}

export async function registerPublicCampaignSignup(input: {
  slug: string;
  campaignId: string;
  name: string;
  email?: string;
  mobile?: string;
}): Promise<PublicCampaignSignupOutcome> {
  const { data, error } = await supabase.rpc('register_public_campaign_signup', {
    slug_input: input.slug,
    campaign_id_input: input.campaignId,
    customer_name_input: input.name,
    customer_email_input: input.email ?? '',
    customer_mobile_input: input.mobile ?? '',
  });

  if (error || !data || typeof data !== 'object') {
    return { outcome: 'error', error: 'Unable to complete signup right now. Please try again.' };
  }

  const payload = data as { outcome?: string; uniqueId?: string; error?: string };
  if ((payload.outcome === 'issued' || payload.outcome === 'redirect_existing') && payload.uniqueId) {
    return {
      outcome: payload.outcome,
      uniqueId: payload.uniqueId,
    };
  }
  if (payload.outcome === 'campaign_disabled_no_existing') {
    return { outcome: 'campaign_disabled_no_existing' };
  }
  if (payload.error) {
    return { outcome: 'error', error: payload.error };
  }

  return { outcome: 'error', error: 'Unable to complete signup right now. Please try again.' };
}
