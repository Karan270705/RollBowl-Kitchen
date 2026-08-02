import { supabase } from '@/src/lib/supabase';
import { getPrimaryStallId } from '@/src/services/orders';

export interface PaymentProof {
  id: string;
  userId: string;
  stallId: string;
  orderId?: string;
  subscriptionRequestId?: string;
  paymentContext: 'order' | 'subscription';
  expectedAmount: number;
  upiIdSnapshot: string;
  recipientNameSnapshot: string;
  screenshotPath: string;
  screenshotMimeType?: string;
  screenshotSizeBytes?: number;
  status: 'pending' | 'verified' | 'rejected' | 'superseded';
  submittedAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

export interface SubscriptionPurchaseRequest {
  id: string;
  userId: string;
  stallId: string;
  planId: string;
  expectedAmount: number;
  status: 'awaiting_proof' | 'verification_pending' | 'approved' | 'rejected' | 'cancelled';
  currentPaymentProofId?: string;
  requestedAt: string;
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  createdSubscriptionId?: string;
  planNameSnapshot?: string;
  durationDaysSnapshot?: number;
  totalMealsSnapshot?: number;
  mealsPerDaySnapshot?: number;
  baseAmountSnapshot?: number;
  convenienceFeePercentSnapshot?: number;
  convenienceFeeSnapshot?: number;
  currencySnapshot?: string;
  categoryCreditCostsSnapshot?: Record<string, number>;
  featuresSnapshot?: string[];
  
  // Flattened customer identity
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}

export const fetchPaymentProofForOrder = async (orderId: string): Promise<PaymentProof | null> => {
  const { data, error } = await supabase
    .from('payment_proofs')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    stallId: data.stall_id,
    orderId: data.order_id,
    subscriptionRequestId: data.subscription_request_id,
    paymentContext: data.payment_context,
    expectedAmount: Number(data.expected_amount),
    upiIdSnapshot: data.upi_id_snapshot,
    recipientNameSnapshot: data.recipient_name_snapshot,
    screenshotPath: data.screenshot_path,
    screenshotMimeType: data.screenshot_mime_type,
    screenshotSizeBytes: Number(data.screenshot_size_bytes),
    status: data.status,
    submittedAt: data.submitted_at,
    verifiedAt: data.verified_at,
    verifiedBy: data.verified_by,
    rejectedAt: data.rejected_at,
    rejectionReason: data.rejection_reason,
  };
};

export const fetchPaymentProofForSubscriptionRequest = async (requestId: string): Promise<PaymentProof | null> => {
  const { data, error } = await supabase
    .from('payment_proofs')
    .select('*')
    .eq('subscription_request_id', requestId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    stallId: data.stall_id,
    orderId: data.order_id,
    subscriptionRequestId: data.subscription_request_id,
    paymentContext: data.payment_context,
    expectedAmount: Number(data.expected_amount),
    upiIdSnapshot: data.upi_id_snapshot,
    recipientNameSnapshot: data.recipient_name_snapshot,
    screenshotPath: data.screenshot_path,
    screenshotMimeType: data.screenshot_mime_type,
    screenshotSizeBytes: Number(data.screenshot_size_bytes),
    status: data.status,
    submittedAt: data.submitted_at,
    verifiedAt: data.verified_at,
    verifiedBy: data.verified_by,
    rejectedAt: data.rejected_at,
    rejectionReason: data.rejection_reason,
  };
};

const signedUrlCache = new Map<string, { url: string; expiresAt: number; promise?: Promise<{ signedUrl: string; expiresIn: number }> }>();

export const createPaymentProofSignedUrl = async (screenshotPath: string): Promise<{ signedUrl: string; expiresIn: number }> => {
  const now = Date.now();
  const cached = signedUrlCache.get(screenshotPath);

  if (cached) {
    if (cached.expiresAt > now) {
      return { signedUrl: cached.url, expiresIn: Math.floor((cached.expiresAt - now) / 1000) };
    }
    if (cached.promise) {
      return cached.promise;
    }
  }

  const fetchPromise = (async () => {
    const { data, error } = await supabase.storage
      .from('payment-proofs')
      .createSignedUrl(screenshotPath, 120); // 120 seconds expiry

    if (error) throw error;
    if (!data || !data.signedUrl) throw new Error('SIGNED_URL_FAILED');

    signedUrlCache.set(screenshotPath, {
      url: data.signedUrl,
      expiresAt: now + (120 - 10) * 1000,
    });

    return {
      signedUrl: data.signedUrl,
      expiresIn: 120,
    };
  })();

  signedUrlCache.set(screenshotPath, { url: '', expiresAt: 0, promise: fetchPromise });

  try {
    return await fetchPromise;
  } catch (err) {
    signedUrlCache.delete(screenshotPath);
    throw err;
  }
};

export const verifyOrderPayment = async (proofId: string): Promise<void> => {
  const { error } = await supabase.rpc('verify_order_payment', {
    p_proof_id: proofId,
  });

  if (error) throw error;
};

export const rejectOrderPayment = async (proofId: string, reason: string): Promise<void> => {
  const { error } = await supabase.rpc('reject_order_payment', {
    p_proof_id: proofId,
    p_reason: reason,
  });

  if (error) throw error;
};

export const fetchSubscriptionPurchaseRequests = async (stallId?: string): Promise<SubscriptionPurchaseRequest[]> => {
  const actualStallId = stallId || await getPrimaryStallId();
  
  const explicitSelect = `
    id,
    user_id,
    stall_id,
    plan_id,
    status,
    current_payment_proof_id,
    plan_name_snapshot,
    base_amount_snapshot,
    convenience_fee_percent_snapshot,
    convenience_fee_snapshot,
    expected_amount,
    currency_snapshot,
    total_meals_snapshot,
    duration_days_snapshot,
    meals_per_day_snapshot,
    category_credit_costs_snapshot,
    features_snapshot,
    approved_at,
    approved_by,
    rejected_at,
    rejection_reason,
    created_subscription_id,
    requested_at,
    created_at,
    users!subscription_purchase_requests_user_id_fkey (
      name,
      email,
      phone,
      college_id
    )
  `.trim();

  const { data, error } = await supabase
    .from('subscription_purchase_requests')
    .select(explicitSelect)
    .eq('stall_id', actualStallId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!data) return [];

  return data.map((row: any) => {
    // Log raw relation shape in development
    if (__DEV__) {
      console.log('[SUBSCRIPTION REQUEST USER RELATION]', JSON.stringify(row.users, null, 2));
    }

    // Support both possible PostgREST relation shapes (object or array)
    const userRelation = Array.isArray(row.users)
      ? row.users[0]
      : row.users;

    return {
      id: row.id,
      userId: row.user_id,
      stallId: row.stall_id,
      planId: row.plan_id,
      expectedAmount: Number(row.expected_amount),
      status: row.status,
      currentPaymentProofId: row.current_payment_proof_id,
      requestedAt: row.requested_at ?? row.created_at,
      createdAt: row.created_at,
      approvedAt: row.approved_at,
      approvedBy: row.approved_by,
      rejectedAt: row.rejected_at,
      rejectionReason: row.rejection_reason,
      createdSubscriptionId: row.created_subscription_id,
      planNameSnapshot: row.plan_name_snapshot,
      durationDaysSnapshot: row.duration_days_snapshot,
      totalMealsSnapshot: row.total_meals_snapshot,
      mealsPerDaySnapshot: row.meals_per_day_snapshot,
      baseAmountSnapshot: row.base_amount_snapshot ? Number(row.base_amount_snapshot) : undefined,
      convenienceFeePercentSnapshot: row.convenience_fee_percent_snapshot ? Number(row.convenience_fee_percent_snapshot) : undefined,
      convenienceFeeSnapshot: row.convenience_fee_snapshot ? Number(row.convenience_fee_snapshot) : undefined,
      currencySnapshot: row.currency_snapshot || 'INR',
      categoryCreditCostsSnapshot: row.category_credit_costs_snapshot,
      featuresSnapshot: row.features_snapshot,
      customerName: userRelation?.name ?? 'Customer',
      customerEmail: userRelation?.email ?? 'Email not provided',
      customerPhone: userRelation?.phone ?? 'Phone not provided',
    };
  });
};

export const approveSubscriptionPurchase = async (requestId: string): Promise<string> => {
  const { data, error } = await supabase.rpc('approve_subscription_purchase', {
    p_request_id: requestId,
  });

  if (error) throw error;
  return data;
};

export const rejectSubscriptionPurchase = async (requestId: string, reason: string): Promise<void> => {
  const { error } = await supabase.rpc('reject_subscription_purchase', {
    p_request_id: requestId,
    p_reason: reason,
  });

  if (error) throw error;
};
