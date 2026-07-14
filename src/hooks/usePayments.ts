import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchPaymentProofForOrder,
  fetchPaymentProofForSubscriptionRequest,
  createPaymentProofSignedUrl,
  verifyOrderPayment,
  rejectOrderPayment,
  fetchSubscriptionPurchaseRequests,
  approveSubscriptionPurchase,
  rejectSubscriptionPurchase,
  PaymentProof,
  SubscriptionPurchaseRequest
} from '../services/payments';

export const PAYMENT_KEYS = {
  all: ['payments'] as const,
  proofForOrder: (orderId: string) => [...PAYMENT_KEYS.all, 'proof', 'order', orderId] as const,
  proofForSubRequest: (requestId: string) => [...PAYMENT_KEYS.all, 'proof', 'sub_request', requestId] as const,
  signedUrl: (path: string) => [...PAYMENT_KEYS.all, 'signed_url', path] as const,
  subRequests: (stallId?: string) => [...PAYMENT_KEYS.all, 'sub_requests', stallId || 'default'] as const,
};

export const usePaymentProofForOrder = (orderId: string) => {
  return useQuery({
    queryKey: PAYMENT_KEYS.proofForOrder(orderId),
    queryFn: () => fetchPaymentProofForOrder(orderId),
    enabled: !!orderId,
  });
};

export const usePaymentProofForSubscriptionRequest = (requestId: string) => {
  return useQuery({
    queryKey: PAYMENT_KEYS.proofForSubRequest(requestId),
    queryFn: () => fetchPaymentProofForSubscriptionRequest(requestId),
    enabled: !!requestId,
  });
};

export const useCreatePaymentProofSignedUrl = (screenshotPath: string | undefined) => {
  return useQuery({
    queryKey: PAYMENT_KEYS.signedUrl(screenshotPath || ''),
    queryFn: () => createPaymentProofSignedUrl(screenshotPath!),
    enabled: !!screenshotPath,
    staleTime: 1000 * 50, // 50 seconds stale time (less than the 120s expiry)
    gcTime: 1000 * 50, // garbage collect after 50 seconds to force fresh signed URLs
  });
};

export const useVerifyOrderPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ proofId }: { proofId: string; orderId: string }) => verifyOrderPayment(proofId),
    onSuccess: (_, variables) => {
      // Invalidate the payment proof query
      queryClient.invalidateQueries({ queryKey: PAYMENT_KEYS.proofForOrder(variables.orderId) });
      // Invalidate all orders
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
};

export const useRejectOrderPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ proofId, reason }: { proofId: string; reason: string; orderId: string }) => 
      rejectOrderPayment(proofId, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_KEYS.proofForOrder(variables.orderId) });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
};

export const useSubscriptionRequests = (stallId?: string) => {
  return useQuery({
    queryKey: PAYMENT_KEYS.subRequests(stallId),
    queryFn: () => fetchSubscriptionPurchaseRequests(stallId),
    refetchInterval: 15000, // Poll every 15s for new pending payments
  });
};

export const useApproveSubscriptionPurchase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId }: { requestId: string }) => approveSubscriptionPurchase(requestId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_KEYS.subRequests() });
      queryClient.invalidateQueries({ queryKey: PAYMENT_KEYS.proofForSubRequest(variables.requestId) });
      // Also invalidate subscribers list to show the newly approved subscriber
      queryClient.invalidateQueries({ queryKey: ['subscribers_list'] });
    },
  });
};

export const useRejectSubscriptionPurchase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, reason }: { requestId: string; reason: string }) => 
      rejectSubscriptionPurchase(requestId, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_KEYS.subRequests() });
      queryClient.invalidateQueries({ queryKey: PAYMENT_KEYS.proofForSubRequest(variables.requestId) });
    },
  });
};
