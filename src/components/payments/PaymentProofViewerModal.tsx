import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii, Shadows } from '@/src/constants/theme';
import {
  usePaymentProofForOrder,
  usePaymentProofForSubscriptionRequest,
  useCreatePaymentProofSignedUrl,
  useVerifyOrderPayment,
  useRejectOrderPayment,
  useApproveSubscriptionPurchase,
  useRejectSubscriptionPurchase,
} from '@/src/hooks/usePayments';

interface PaymentProofViewerModalProps {
  visible: boolean;
  onClose: () => void;
  orderId?: string;
  subscriptionRequestId?: string;
}

export const PaymentProofViewerModal: React.FC<PaymentProofViewerModalProps> = ({
  visible,
  onClose,
  orderId,
  subscriptionRequestId,
}) => {
  const [imageError, setImageError] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // 1. Fetch Proof Data
  const {
    data: orderProof,
    isLoading: isLoadingOrderProof,
    error: orderProofError,
    refetch: refetchOrderProof,
  } = usePaymentProofForOrder(orderId || '');

  const {
    data: subProof,
    isLoading: isLoadingSubProof,
    error: subProofError,
    refetch: refetchSubProof,
  } = usePaymentProofForSubscriptionRequest(subscriptionRequestId || '');

  const proof = orderId ? orderProof : subProof;
  const isLoadingProof = orderId ? isLoadingOrderProof : isLoadingSubProof;
  const proofError = orderId ? orderProofError : subProofError;

  // 2. Fetch Signed URL
  const {
    data: signedUrlData,
    isLoading: isLoadingSignedUrl,
    error: signedUrlError,
    refetch: refetchSignedUrl,
  } = useCreatePaymentProofSignedUrl(proof?.screenshotPath);

  // Mutations
  const verifyOrderMutation = useVerifyOrderPayment();
  const rejectOrderMutation = useRejectOrderPayment();
  const approveSubMutation = useApproveSubscriptionPurchase();
  const rejectSubMutation = useRejectSubscriptionPurchase();

  const isMutationPending =
    verifyOrderMutation.isPending ||
    rejectOrderMutation.isPending ||
    approveSubMutation.isPending ||
    rejectSubMutation.isPending;

  const handleVerify = async () => {
    if (!proof) return;
    try {
      if (proof.paymentContext === 'order' && orderId) {
        await verifyOrderMutation.mutateAsync({ proofId: proof.id, orderId });
      } else if (proof.paymentContext === 'subscription' && subscriptionRequestId) {
        await approveSubMutation.mutateAsync({ requestId: subscriptionRequestId });
      }
      onClose();
    } catch (err: any) {
      alert(err.message || 'Verification failed');
    }
  };

  const handleReject = async () => {
    if (!proof || !rejectionReason.trim()) {
      alert('Rejection reason is required');
      return;
    }
    try {
      if (proof.paymentContext === 'order' && orderId) {
        await rejectOrderMutation.mutateAsync({
          proofId: proof.id,
          reason: rejectionReason,
          orderId,
        });
      } else if (proof.paymentContext === 'subscription' && subscriptionRequestId) {
        await rejectSubMutation.mutateAsync({
          requestId: subscriptionRequestId,
          reason: rejectionReason,
        });
      }
      setIsRejecting(false);
      setRejectionReason('');
      onClose();
    } catch (err: any) {
      alert(err.message || 'Rejection failed');
    }
  };

  const handleRetry = () => {
    setImageError(false);
    if (orderId) refetchOrderProof();
    else refetchSubProof();
    refetchSignedUrl();
  };

  const renderContent = () => {
    if (isLoadingProof || isLoadingSignedUrl) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Fetching payment proof safely...</Text>
        </View>
      );
    }

    if (proofError || signedUrlError || !proof) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={Colors.textTertiary} />
          <Text style={styles.errorText}>Payment screenshot is no longer available.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const formattedDate = new Date(proof.submittedAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const isPending = proof.status === 'pending';

    return (
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Metadata Details */}
        <View style={styles.metadataCard}>
          <Text style={styles.metadataTitle}>Payment Details</Text>
          
          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>Expected Amount:</Text>
            <Text style={[styles.metadataValue, { color: Colors.primary, fontFamily: Typography.family.bold }]}>
              ₹{proof.expectedAmount.toFixed(2)}
            </Text>
          </View>
          
          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>Recipient UPI ID:</Text>
            <Text style={styles.metadataValue}>{proof.upiIdSnapshot}</Text>
          </View>

          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>Recipient Name:</Text>
            <Text style={styles.metadataValue}>{proof.recipientNameSnapshot}</Text>
          </View>

          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>Submitted At:</Text>
            <Text style={styles.metadataValue}>{formattedDate}</Text>
          </View>

          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>Status:</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(proof.status) + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(proof.status) }]}>
                {proof.status.toUpperCase()}
              </Text>
            </View>
          </View>

          {proof.rejectionReason && (
            <View style={styles.rejectionReasonBox}>
              <Text style={styles.rejectionLabel}>Rejection Reason:</Text>
              <Text style={styles.rejectionText}>{proof.rejectionReason}</Text>
            </View>
          )}
        </View>

        {/* Screenshot Image Frame */}
        <View style={styles.imageCard}>
          <Text style={styles.imageTitle}>Submitted Receipt Screenshot</Text>
          
          <View style={styles.imageContainer}>
            {imageError ? (
              <View style={styles.imageErrorContainer}>
                <Ionicons name="alert-circle-outline" size={40} color={Colors.error} />
                <Text style={styles.imageErrorText}>Failed to load receipt image</Text>
                <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                  <Text style={styles.retryButtonText}>Reload Image</Text>
                </TouchableOpacity>
              </View>
            ) : signedUrlData?.signedUrl ? (
              <Image
                source={{ uri: signedUrlData.signedUrl }}
                style={styles.screenshot}
                resizeMode="contain"
                onError={() => setImageError(true)}
              />
            ) : (
              <View style={styles.imageErrorContainer}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.imageErrorText}>Validating URL...</Text>
              </View>
            )}
          </View>
        </View>

        {/* Rejection Prompt Form */}
        {isRejecting && (
          <View style={styles.rejectForm}>
            <Text style={styles.rejectFormTitle}>Reason for Rejection</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Transaction Reference Mismatch / Insufficient Amount"
              placeholderTextColor={Colors.textTertiary}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
            />
            <View style={styles.rejectFormButtons}>
              <TouchableOpacity
                style={[styles.smallButton, { borderColor: Colors.border }]}
                onPress={() => setIsRejecting(false)}
              >
                <Text style={styles.smallButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.smallButton, { backgroundColor: Colors.error }]}
                onPress={handleReject}
                disabled={isMutationPending}
              >
                {isMutationPending ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.smallButtonTextConfirm}>Reject Payment</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Primary Verification Actions */}
        {isPending && !isRejecting && (
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectBtn]}
              onPress={() => setIsRejecting(true)}
              disabled={isMutationPending}
            >
              <Text style={styles.actionButtonText}>Reject Payment</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.verifyBtn]}
              onPress={handleVerify}
              disabled={isMutationPending}
            >
              {isMutationPending ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <Text style={styles.actionButtonText}>Verify & Confirm</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Verify UPI Payment Proof</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {renderContent()}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return Colors.warning;
    case 'verified':
      return Colors.success;
    case 'rejected':
      return Colors.error;
    default:
      return Colors.textSecondary;
  }
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '90%',
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radii.lg,
    borderTopRightRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalHeaderTitle: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.lg,
    color: Colors.textPrimary,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  errorText: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  retryButton: {
    marginTop: Spacing.base,
    backgroundColor: Colors.surfaceHighlight,
    borderColor: Colors.border,
    borderWidth: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.base,
  },
  retryButtonText: {
    fontFamily: Typography.family.bold,
    color: Colors.primary,
    fontSize: Typography.size.sm,
  },
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: Spacing['4xl'],
  },
  metadataCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  metadataTitle: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  metadataLabel: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
  },
  metadataValue: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.sm,
    color: Colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  statusText: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.xs,
  },
  rejectionReasonBox: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  rejectionLabel: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.xs,
    color: Colors.error,
    marginBottom: 2,
  },
  rejectionText: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
  },
  imageCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  imageTitle: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  imageContainer: {
    height: 380,
    backgroundColor: Colors.background,
    borderRadius: Radii.base,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  screenshot: {
    width: '100%',
    height: '100%',
  },
  imageErrorContainer: {
    padding: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageErrorText: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  rejectForm: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  rejectFormTitle: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.base,
    color: Colors.error,
    marginBottom: Spacing.sm,
  },
  textInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.base,
    padding: Spacing.sm,
    color: Colors.textPrimary,
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.sm,
    height: 60,
    textAlignVertical: 'top',
    marginBottom: Spacing.base,
  },
  rejectFormButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  smallButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    borderRadius: Radii.base,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallButtonTextCancel: {
    fontFamily: Typography.family.medium,
    color: Colors.textSecondary,
    fontSize: Typography.size.sm,
  },
  smallButtonTextConfirm: {
    fontFamily: Typography.family.bold,
    color: Colors.white,
    fontSize: Typography.size.sm,
  },
  actionContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    paddingVertical: Spacing.base,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyBtn: {
    backgroundColor: Colors.success,
  },
  rejectBtn: {
    backgroundColor: Colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionButtonText: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.base,
    color: Colors.white,
  },
});
