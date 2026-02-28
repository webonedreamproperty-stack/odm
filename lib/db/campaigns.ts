import { supabase } from '../supabase';
import type { StoredTemplate } from '../../types';

interface CampaignRow {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  reward_name: string;
  tagline: string | null;
  background_image: string | null;
  background_opacity: number;
  logo_image: string | null;
  show_logo: boolean;
  title_size: string | null;
  icon_key: string;
  colors: Record<string, string>;
  total_stamps: number;
  social: Record<string, string> | null;
}

export function rowToStoredTemplate(row: CampaignRow): StoredTemplate {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    rewardName: row.reward_name,
    tagline: row.tagline ?? undefined,
    backgroundImage: row.background_image ?? undefined,
    backgroundOpacity: row.background_opacity,
    logoImage: row.logo_image ?? undefined,
    showLogo: row.show_logo,
    titleSize: row.title_size ?? undefined,
    iconKey: row.icon_key,
    colors: row.colors as StoredTemplate['colors'],
    totalStamps: row.total_stamps,
    social: row.social as StoredTemplate['social'],
  };
}

function templateToRow(t: StoredTemplate, ownerId: string) {
  return {
    id: t.id,
    owner_id: ownerId,
    name: t.name,
    description: t.description,
    reward_name: t.rewardName,
    tagline: t.tagline ?? null,
    background_image: t.backgroundImage ?? null,
    background_opacity: t.backgroundOpacity ?? 100,
    logo_image: t.logoImage ?? null,
    show_logo: t.showLogo ?? true,
    title_size: t.titleSize ?? null,
    icon_key: t.iconKey,
    colors: t.colors,
    total_stamps: t.totalStamps,
    social: t.social ?? null,
  };
}

export async function fetchCampaigns(ownerId: string): Promise<StoredTemplate[]> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return data.map((row: CampaignRow) => rowToStoredTemplate(row));
}

export async function upsertCampaign(template: StoredTemplate, ownerId: string): Promise<{ ok: boolean; error?: string }> {
  const row = templateToRow(template, ownerId);
  const { error } = await supabase
    .from('campaigns')
    .upsert(row, { onConflict: 'id' });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteCampaign(campaignId: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('campaigns')
    .delete()
    .eq('id', campaignId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function countCampaigns(ownerId: string): Promise<number> {
  const { count, error } = await supabase
    .from('campaigns')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', ownerId);
  if (error) return 0;
  return count ?? 0;
}
