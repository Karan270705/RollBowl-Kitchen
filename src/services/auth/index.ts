import { supabase } from '@/src/lib/supabase';
import { LoginRequest } from '@/src/types/api';
import { User } from '@/src/types/models';

export const signIn = async ({ email, password }: LoginRequest) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const fetchUserProfile = async (userId: string): Promise<User | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  // Map Supabase snake_case columns to camelCase User model
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    phone: data.phone,
    role: data.role,
    avatarUrl: data.avatar_url,
    collegeId: data.college_id,
    cityId: data.city_id,
    createdAt: data.created_at,
  };
};
