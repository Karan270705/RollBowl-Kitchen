import { supabase } from '@/src/lib/supabase';

export interface Stall {
  id: string;
  name: string;
  location?: string;
  address?: string;
  phone?: string;
  description?: string;
  is_active: boolean;
  operator_id?: string;
  created_at: string;
}

export interface CreateStallParams {
  name: string;
  location?: string;
  address?: string;
  phone?: string;
  description?: string;
}

export const fetchAllStalls = async (): Promise<Stall[]> => {
  const { data, error } = await supabase
    .from('stalls')
    .select('*')
    .order('name');

  if (error) throw error;
  return data || [];
};

export const createStall = async (params: CreateStallParams): Promise<Stall> => {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;

  if (!userId) throw new Error('Not authenticated');

  // Fetch the operator's college_id from their profile (required by stalls table)
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('college_id')
    .eq('id', userId)
    .single();

  if (profileError) throw profileError;
  if (!userProfile?.college_id) {
    throw new Error('Your account has no college assigned. Please contact an administrator to set your college before creating a stall.');
  }

  const { data, error } = await supabase
    .from('stalls')
    .insert({
      name: params.name,
      location: params.location,
      address: params.address,
      phone: params.phone,
      description: params.description || '',
      college_id: userProfile.college_id,
      operator_id: userId,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateStall = async (id: string, params: Partial<CreateStallParams>): Promise<Stall> => {
  const { data, error } = await supabase
    .from('stalls')
    .update(params)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deactivateStall = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('stalls')
    .update({ is_active: false })
    .eq('id', id);

  if (error) throw error;
};

export const activateStall = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('stalls')
    .update({ is_active: true })
    .eq('id', id);

  if (error) throw error;
};
