import { supabase } from '@/src/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export interface SubscriberListItem {
  id: string; // Subscription ID
  userId: string;
  customerName: string;
  planName: string;
  status: 'active' | 'paused' | 'expired' | 'cancelled';
  remainingMeals: number;
  startDate: string;
  endDate: string;
  email?: string;
  phone?: string;
}

export interface SubscriberDetails extends SubscriberListItem {
  totalMeals: number;
  consumedMeals: number;
  mealsPerDay: number;
  usageHistory: {
    id: string;
    mealName: string;
    date: string;
    createdAt: string;
  }[];
}

export const fetchSubscribersList = async (): Promise<SubscriberListItem[]> => {
  const { data, error } = await supabase
    .from('subscriptions')
    .select(`
      id,
      user_id,
      plan_name,
      status,
      remaining_meals,
      start_date,
      end_date,
      users (
        name,
        email,
        phone
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((sub: any) => {
    const rawName = sub.users?.name?.trim();
    return {
      id: sub.id,
      userId: sub.user_id,
      customerName: rawName ? rawName : 'No Profile Name',
      planName: sub.plan_name,
      status: sub.status,
      remainingMeals: sub.remaining_meals,
      startDate: sub.start_date,
      endDate: sub.end_date,
      email: sub.users?.email,
      phone: sub.users?.phone,
    };
  });
};

export const fetchSubscriberDetails = async (subscriptionId: string): Promise<SubscriberDetails> => {
  // 1. Fetch Subscription + User
  const { data: subData, error: subError } = await supabase
    .from('subscriptions')
    .select(`
      *,
      users (
        name,
        email,
        phone
      )
    `)
    .eq('id', subscriptionId)
    .single();

  if (subError) throw subError;

  // 2. Fetch Usage History
  // Usage is tracked in order_items via subscription_id
  const { data: historyData, error: historyError } = await supabase
    .from('order_items')
    .select(`
      id,
      meal_name,
      created_at,
      orders (
        pickup_date
      )
    `)
    .eq('subscription_id', subscriptionId)
    .order('created_at', { ascending: false });

  if (historyError) throw historyError;

  const rawName = subData.users?.name?.trim();
  const customerName = rawName ? rawName : 'No Profile Name';

  return {
    id: subData.id,
    userId: subData.user_id,
    customerName,
    planName: subData.plan_name,
    status: subData.status,
    remainingMeals: subData.remaining_meals,
    startDate: subData.start_date,
    endDate: subData.end_date,
    email: subData.users?.email,
    phone: subData.users?.phone,
    totalMeals: subData.total_meals,
    consumedMeals: subData.consumed_meals,
    mealsPerDay: subData.meals_per_day,
    usageHistory: (historyData || []).map((item: any) => ({
      id: item.id,
      mealName: item.meal_name,
      date: item.orders?.pickup_date || 'Unknown',
      createdAt: item.created_at,
    }))
  };
};

export const useSubscribersList = () => {
  return useQuery({
    queryKey: ['subscribers_list'],
    queryFn: fetchSubscribersList,
  });
};

export const useSubscriberDetails = (subscriptionId: string) => {
  return useQuery({
    queryKey: ['subscriber_details', subscriptionId],
    queryFn: () => fetchSubscriberDetails(subscriptionId),
    enabled: !!subscriptionId,
  });
};
