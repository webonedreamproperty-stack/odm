import { supabase } from '../supabase';

interface ActivationResult {
  success: boolean;
  error?: string;
  expires_at?: string;
}

export async function activateLicenseKey(key: string): Promise<ActivationResult> {
  const { data, error } = await supabase
    .rpc('activate_license_key', { key_input: key });
  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: 'Unexpected response' };
  return data as ActivationResult;
}
