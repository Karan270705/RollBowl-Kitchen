import { supabase } from '@/src/lib/supabase';
// @ts-ignore - module resolves at runtime; IDE language server cache issue
import { useQuery } from '@tanstack/react-query';
import { getTodayISTDateString } from '@/src/utils/operationalDate';

export interface SubscriberListItem {
  id: string; // Subscription ID
  userId: string;
  customerName: string;
  planName: string;
  status: 'active' | 'paused' | 'expired' | 'cancelled';
  remainingMeals: number;
  totalMeals: number;
  consumedMeals: number;
  mealsPerDay: number;
  startDate: string;
  endDate: string;
  email?: string;
  phone?: string;
  stallId?: string;
  stallName?: string;
  stallLocation?: string;
}

export interface SubscriberDetails extends SubscriberListItem {
  extendedDays: number;
  usageHistory: {
    id: string;
    mealName: string;
    date: string;
    createdAt: string;
  }[];
}

export const fetchSubscribersList = async (stallId: string): Promise<SubscriberListItem[]> => {
  const { data, error } = await supabase
    .from('subscriptions')
    .select(`
      id,
      user_id,
      stall_id,
      plan_name,
      status,
      remaining_meals,
      total_meals,
      consumed_meals,
      meals_per_day,
      start_date,
      end_date,
      users (
        name,
        email,
        phone
      ),
      stalls (
        id,
        name,
        location
      )
    `)
    .eq('stall_id', stallId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const todayIST = getTodayISTDateString();

  return (data || []).map((sub: any) => {
    const rawName = sub.users?.name?.trim();
    
    let computedStatus = sub.status;
    if (computedStatus === 'active' && sub.end_date < todayIST) {
      computedStatus = 'expired';
    }

    return {
      id: sub.id,
      userId: sub.user_id,
      customerName: rawName ? rawName : 'No Profile Name',
      planName: sub.plan_name,
      status: computedStatus,
      remainingMeals: sub.remaining_meals ?? 0,
      totalMeals: sub.total_meals ?? 20,
      consumedMeals: sub.consumed_meals ?? 0,
      mealsPerDay: sub.meals_per_day ?? 1,
      startDate: sub.start_date,
      endDate: sub.end_date,
      email: sub.users?.email,
      phone: sub.users?.phone,
      stallId: sub.stalls?.id,
      stallName: sub.stalls?.name,
      stallLocation: sub.stalls?.location,
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
  const todayIST = getTodayISTDateString();

  let computedStatus = subData.status;
  if (computedStatus === 'active' && subData.end_date < todayIST) {
    computedStatus = 'expired';
  }

  return {
    id: subData.id,
    userId: subData.user_id,
    customerName,
    planName: subData.plan_name,
    status: computedStatus,
    remainingMeals: subData.remaining_meals ?? 0,
    startDate: subData.start_date,
    endDate: subData.end_date,
    email: subData.users?.email,
    phone: subData.users?.phone,
    totalMeals: subData.total_meals ?? 20,
    consumedMeals: subData.consumed_meals ?? 0,
    mealsPerDay: subData.meals_per_day ?? 1,
    extendedDays: subData.extended_days ?? 0,
    usageHistory: (historyData || []).map((item: any) => ({
      id: item.id,
      mealName: item.meal_name,
      date: item.orders?.pickup_date || 'Unknown',
      createdAt: item.created_at,
    }))
  };
};

export const useSubscribersList = (stallId: string) => {
  return useQuery({
    queryKey: ['subscribers_list', stallId],
    queryFn: () => fetchSubscribersList(stallId),
    enabled: !!stallId,
  });
};

export const useSubscriberDetails = (subscriptionId: string) => {
  return useQuery({
    queryKey: ['subscriber_details', subscriptionId],
    queryFn: () => fetchSubscriberDetails(subscriptionId),
    enabled: !!subscriptionId,
  });
};
