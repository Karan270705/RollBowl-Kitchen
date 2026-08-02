import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii, Shadows } from '@/src/constants/theme';
import { useSubscribersList } from '@/src/services/subscriptions';
import { useSubscriptionRequests, useApproveSubscriptionPurchase, useRejectSubscriptionPurchase } from '@/src/hooks/usePayments';
import { PaymentProofViewerModal } from '@/src/components/payments/PaymentProofViewerModal';
import { EmptyState, Input } from '@/src/components/ui';
import { useRouter } from 'expo-router';
import { formatDisplayDate, isExpiringSoon } from '@/src/utils/helpers';

const getFriendlyRequestStatus = (status: string): string => {
  switch (status) {
    case 'awaiting_proof':
    case 'verification_pending':
      return 'Awaiting Verification';
    case 'payment_verified':
      return 'Payment Verified';
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    default:
      return 'Awaiting Verification';
  }
};

export default function SubscriptionsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: subscribers = [], isLoading, error } = useSubscribersList();
  const { data: requests = [], isLoading: isLoadingRequests, error: requestsError, refetch: refetchRequests } = useSubscriptionRequests();

  const approveSubMutation = useApproveSubscriptionPurchase();
  const rejectSubMutation = useRejectSubscriptionPurchase();

  const [viewMode, setViewMode] = useState<'subscribers' | 'requests'>('requests');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [isProofModalVisible, setIsProofModalVisible] = useState(false);

  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

  const activeCount = subscribers.filter(s => s.status === 'active').length;
  const expiredCount = subscribers.filter(s => s.status === 'expired').length;
  const totalCredits = subscribers
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + s.remainingMeals, 0);

  const expiringSoonCount = subscribers.filter(s => isExpiringSoon(s.endDate) && s.status === 'active').length;
  const pendingRequestsCount = requests.filter(r => r.status === 'verification_pending' || r.status === 'awaiting_proof').length;

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [activeRequestTab, setActiveRequestTab] = useState<'Pending Verification' | 'Approved' | 'Rejected' | 'All'>('Pending Verification');
  const [sortBy, setSortBy] = useState<'expiry' | 'credits' | 'name'>('expiry');

  const filteredRequests = useMemo(() => {
    let res = [...requests];
    
    if (activeRequestTab === 'Pending Verification') {
      res = res.filter(r => r.status === 'verification_pending' || r.status === 'awaiting_proof');
    } else if (activeRequestTab === 'Approved') {
      res = res.filter(r => r.status === 'approved');
    } else if (activeRequestTab === 'Rejected') {
      res = res.filter(r => r.status === 'rejected');
    }

    if (searchQuery.trim()) {
      const lowerQ = searchQuery.toLowerCase();
      res = res.filter(r => 
        (r.customerName && r.customerName.toLowerCase().includes(lowerQ)) ||
        (r.customerEmail && r.customerEmail.toLowerCase().includes(lowerQ)) ||
        (r.customerPhone && r.customerPhone.toLowerCase().includes(lowerQ)) ||
        (r.planNameSnapshot && r.planNameSnapshot.toLowerCase().includes(lowerQ))
      );
    }
    return res;
  }, [requests, searchQuery, activeRequestTab]);

  const filteredAndSortedSubscribers = useMemo(() => {
    let result = [...subscribers];

    if (searchQuery.trim()) {
      const lowerQ = searchQuery.toLowerCase();
      result = result.filter(s => 
        s.customerName.toLowerCase().includes(lowerQ) ||
        (s.email && s.email.toLowerCase().includes(lowerQ)) ||
        (s.phone && s.phone.toLowerCase().includes(lowerQ))
      );
    }

    if (activeTab === 'Expiring Soon') {
      result = result.filter(s => isExpiringSoon(s.endDate) && s.status === 'active');
    } else if (activeTab !== 'All') {
      result = result.filter(s => s.status === activeTab.toLowerCase());
    }

    result.sort((a, b) => {
      if (sortBy === 'expiry') {
        return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
      } else if (sortBy === 'credits') {
        return a.remainingMeals - b.remainingMeals;
      } else {
        return a.customerName.localeCompare(b.customerName);
      }
    });

    return result;
  }, [subscribers, searchQuery, activeTab, sortBy]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return Colors.success;
      case 'paused': return Colors.warning;
      case 'expired': return Colors.textTertiary;
      case 'cancelled': return Colors.error;
      default: return Colors.textSecondary;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Subscriptions</Text>
        <View style={styles.modeToggleContainer}>
          <TouchableOpacity
            style={[styles.modeButton, viewMode === 'requests' && styles.modeButtonActive]}
            onPress={() => setViewMode('requests')}
          >
            <Text style={[styles.modeText, viewMode === 'requests' && styles.modeTextActive]}>
              Requests ({pendingRequestsCount > 0 ? `${pendingRequestsCount} Pending` : requests.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, viewMode === 'subscribers' && styles.modeButtonActive]}
            onPress={() => setViewMode('subscribers')}
          >
            <Text style={[styles.modeText, viewMode === 'subscribers' && styles.modeTextActive]}>
              Subscribers ({subscribers.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {viewMode === 'subscribers' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.metricsContainer}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Active</Text>
              <Text style={[styles.metricValue, { color: Colors.success }]}>{activeCount}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Expiring Soon</Text>
              <Text style={[styles.metricValue, { color: Colors.warning }]}>{expiringSoonCount}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Pending Approval</Text>
              <Text style={[styles.metricValue, { color: Colors.primary }]}>{pendingRequestsCount}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Expired</Text>
              <Text style={[styles.metricValue, { color: Colors.textTertiary }]}>{expiredCount}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Total Outstanding</Text>
              <Text style={[styles.metricValue, { color: Colors.primary }]}>{totalCredits} <Text style={{fontSize: 14, color: Colors.textSecondary}}>Credits</Text></Text>
            </View>
          </ScrollView>
        )}

        <View style={styles.searchContainer}>
          <Input 
            label="Search"
            placeholder="Search by name, email, or phone..." 
            value={searchQuery} 
            onChangeText={setSearchQuery} 
          />
        </View>

        {viewMode === 'requests' ? (
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
              {(['Pending Verification', 'Approved', 'Rejected', 'All'] as const).map(tab => (
                <TouchableOpacity 
                  key={tab} 
                  style={[styles.tabChip, activeRequestTab === tab && styles.tabChipActive]}
                  onPress={() => setActiveRequestTab(tab)}
                >
                  <Text style={[styles.tabText, activeRequestTab === tab && styles.tabTextActive]}>{tab}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : (
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
              {['All', 'Active', 'Expiring Soon', 'Paused', 'Expired', 'Cancelled'].map(tab => (
                <TouchableOpacity 
                  key={tab} 
                  style={[styles.tabChip, activeTab === tab && styles.tabChipActive]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.sortContainer}>
              <Text style={styles.sortLabel}>Sort by:</Text>
              {['expiry', 'credits', 'name'].map((sortKey) => (
                <TouchableOpacity key={sortKey} onPress={() => setSortBy(sortKey as any)}>
                  <Text style={[styles.sortOption, sortBy === sortKey && styles.sortOptionActive]}>
                    {sortKey.charAt(0).toUpperCase() + sortKey.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>
            {viewMode === 'requests' ? `${activeRequestTab} Requests (${filteredRequests.length})` : `${activeTab} Subscribers (${filteredAndSortedSubscribers.length})`}
          </Text>
        </View>

        {viewMode === 'requests' ? (
          isLoadingRequests ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: Spacing['2xl'] }} />
          ) : requestsError ? (
            <EmptyState
              icon="alert-circle-outline"
              title="Unable to Load Requests"
              subtitle="Failed to load subscription purchase requests. Please check your connection and try again."
              actionLabel="Retry"
              onAction={() => refetchRequests()}
            />
          ) : filteredRequests.length === 0 ? (
            <EmptyState
              icon="receipt-outline"
              title="No Requests Found"
              subtitle={
                activeRequestTab === 'Pending Verification'
                  ? 'No pending verification requests.'
                  : 'No subscription purchase requests match this filter.'
              }
            />
          ) : (
            <View style={styles.listContainer}>
              {filteredRequests.map((req) => {
                const totalPaidAmount = req.expectedAmount;
                const baseAmount = req.baseAmountSnapshot ?? Number((totalPaidAmount / 1.02).toFixed(2));
                const convenienceFee = req.convenienceFeeSnapshot ?? Number((totalPaidAmount - baseAmount).toFixed(2));
                const feePercent = req.convenienceFeePercentSnapshot ?? 2;
                const currency = req.currencySnapshot || 'INR';
                const isPending = req.status === 'verification_pending' || req.status === 'awaiting_proof';

                return (
                  <View key={req.id} style={styles.subscriberCard}>
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.customerName}>{req.customerName}</Text>
                        <Text style={styles.detailText}>{req.planNameSnapshot || 'Subscription Plan'}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: getRequestStatusColor(req.status) + '15', borderColor: getRequestStatusColor(req.status) + '40' }]}>
                        <Text style={[styles.statusText, { color: getRequestStatusColor(req.status) }]}>{getFriendlyRequestStatus(req.status)}</Text>
                      </View>
                    </View>

                    <View style={styles.contactInfo}>
                      <View style={styles.detailItem}>
                        <Ionicons name="mail-outline" size={14} color={Colors.textTertiary} />
                        <Text style={styles.detailText}>{req.customerEmail}</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Ionicons name="call-outline" size={14} color={Colors.textTertiary} />
                        <Text style={styles.detailText}>{req.customerPhone}</Text>
                      </View>
                    </View>

                    <View style={styles.cardDetails}>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailText}>Validity:</Text>
                        <Text style={styles.amountValue}>{req.durationDaysSnapshot ?? 'N/A'} Days (Inclusive)</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailText}>Credits:</Text>
                        <Text style={styles.amountValue}>{req.totalMealsSnapshot ?? 'N/A'} Total • {req.mealsPerDaySnapshot ?? 'N/A'} / Day</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailText}>Base Amount:</Text>
                        <Text style={styles.amountValue}>₹{baseAmount.toFixed(2)} {currency}</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailText}>Fee Percentage:</Text>
                        <Text style={styles.amountValue}>{feePercent}%</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailText}>{feePercent}% Convenience Fee:</Text>
                        <Text style={styles.amountValue}>₹{convenienceFee.toFixed(2)} {currency}</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={[styles.detailText, { fontFamily: Typography.family.bold, color: Colors.textPrimary }]}>Total Amount:</Text>
                        <Text style={[styles.amountValue, { fontFamily: Typography.family.bold, color: Colors.primary }]}>₹{totalPaidAmount.toFixed(2)} {currency}</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailText}>Currency:</Text>
                        <Text style={styles.amountValue}>{currency}</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailText}>Proof Status:</Text>
                        <Text style={[styles.amountValue, { color: req.currentPaymentProofId ? Colors.primary : Colors.warning }]}>
                          {req.currentPaymentProofId ? 'Proof Attached' : 'Awaiting Proof'}
                        </Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailText}>Submitted:</Text>
                        <Text style={styles.detailText}>{formatDisplayDate(new Date(req.requestedAt))}</Text>
                      </View>
                      {req.rejectionReason ? (
                        <View style={[styles.detailItem, { marginTop: Spacing.xs }]}>
                          <Text style={[styles.detailText, { color: Colors.error }]}>Rejection Reason: {req.rejectionReason}</Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.requestActionsRow}>
                      <TouchableOpacity 
                        style={styles.actionBtnSecondary}
                        onPress={() => {
                          setSelectedRequestId(req.id);
                          setIsProofModalVisible(true);
                        }}
                      >
                        <Ionicons name="eye-outline" size={16} color={Colors.primary} />
                        <Text style={styles.actionBtnSecondaryText}>View Payment Proof</Text>
                      </TouchableOpacity>

                      {isPending && (
                        <>
                          <TouchableOpacity 
                            style={styles.actionBtnPrimary}
                            disabled={approveSubMutation.isPending}
                            onPress={async () => {
                              try {
                                await approveSubMutation.mutateAsync({ requestId: req.id });
                                Alert.alert('Success', 'Subscription approved and activated.');
                              } catch (err: any) {
                                Alert.alert('Approval Failed', err.message || 'Verification failed');
                              }
                            }}
                          >
                            <Ionicons name="checkmark-circle-outline" size={16} color={Colors.white} />
                            <Text style={styles.actionBtnPrimaryText}>Verify & Approve</Text>
                          </TouchableOpacity>

                          <TouchableOpacity 
                            style={styles.actionBtnDanger}
                            disabled={rejectSubMutation.isPending}
                            onPress={() => {
                              setRejectingRequestId(req.id);
                              setRejectionReasonInput('');
                            }}
                          >
                            <Ionicons name="close-circle-outline" size={16} color={Colors.error} />
                            <Text style={styles.actionBtnDangerText}>Reject</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )
        ) : (
          isLoading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: Spacing['2xl'] }} />
          ) : error ? (
            <EmptyState icon="alert-circle-outline" title="Error Loading Data" subtitle="Failed to load subscribers." />
          ) : filteredAndSortedSubscribers.length === 0 ? (
            <EmptyState icon="people-outline" title="No Subscribers Found" subtitle="Try adjusting your search or filters." />
          ) : (
            <View style={styles.listContainer}>
              {filteredAndSortedSubscribers.map((sub) => (
                <TouchableOpacity 
                  key={sub.id} 
                  style={styles.subscriberCard}
                  activeOpacity={0.7}
                  onPress={() => router.push(`/(app)/(subscriptions)/${sub.id}` as any)}
                >
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.customerName}>{sub.customerName}</Text>
                      {sub.customerName === 'No Profile Name' && (
                        <Text style={styles.userIdText}>ID: {sub.userId}</Text>
                      )}
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(sub.status) + '15', borderColor: getStatusColor(sub.status) + '40' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(sub.status) }]}>{sub.status.toUpperCase()}</Text>
                    </View>
                  </View>

                  <View style={styles.contactInfo}>
                    <View style={styles.detailItem}>
                      <Ionicons name="mail-outline" size={14} color={Colors.textTertiary} />
                      <Text style={styles.detailText}>{sub.email || 'Not Provided'}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name="call-outline" size={14} color={Colors.textTertiary} />
                      <Text style={styles.detailText}>{sub.phone || 'Not Provided'}</Text>
                    </View>
                  </View>

                  <View style={styles.cardDetails}>
                    <View style={styles.detailItem}>
                      <Ionicons name="card-outline" size={14} color={Colors.textTertiary} />
                      <Text style={styles.detailText}>{sub.planName}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name="calendar-outline" size={14} color={Colors.textTertiary} />
                      <Text style={styles.detailText}>Expires: {formatDisplayDate(new Date(sub.endDate))}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name="nutrition-outline" size={14} color={Colors.textTertiary} />
                      <Text style={[styles.detailText, { fontFamily: Typography.family.semiBold, color: Colors.textPrimary }]}>
                        {sub.remainingMeals} / {sub.totalMeals} Credits Remaining ({sub.consumedMeals} Consumed)
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )
        )}
      </ScrollView>

      <PaymentProofViewerModal
        visible={isProofModalVisible}
        onClose={() => setIsProofModalVisible(false)}
        subscriptionRequestId={selectedRequestId || undefined}
      />

      <Modal
        visible={!!rejectingRequestId}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectingRequestId(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.rejectModalCard}>
            <Text style={styles.rejectModalTitle}>Reject Subscription Payment</Text>
            <Text style={styles.rejectModalSubtitle}>
              Please provide a reason for rejecting this payment proof. The customer will see this reason and can submit a replacement proof.
            </Text>

            <Input
              label="Rejection Reason"
              placeholder="e.g. Screenshot blurry, Amount mismatch, Invalid UTR"
              value={rejectionReasonInput}
              onChangeText={setRejectionReasonInput}
            />

            <View style={styles.rejectModalButtons}>
              <TouchableOpacity
                style={styles.rejectModalCancelBtn}
                onPress={() => {
                  setRejectingRequestId(null);
                  setRejectionReasonInput('');
                }}
              >
                <Text style={styles.rejectModalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.rejectModalSubmitBtn}
                disabled={!rejectionReasonInput.trim() || rejectSubMutation.isPending}
                onPress={async () => {
                  if (!rejectingRequestId || !rejectionReasonInput.trim()) return;
                  try {
                    await rejectSubMutation.mutateAsync({
                      requestId: rejectingRequestId,
                      reason: rejectionReasonInput.trim(),
                    });
                    setRejectingRequestId(null);
                    setRejectionReasonInput('');
                    Alert.alert('Rejected', 'The subscription request was rejected.');
                  } catch (err: any) {
                    Alert.alert('Rejection Failed', err.message || 'Rejection failed');
                  }
                }}
              >
                <Text style={styles.rejectModalSubmitText}>
                  {rejectSubMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  title: {
    fontSize: Typography.size['2xl'],
    fontFamily: Typography.family.bold,
    color: Colors.textPrimary,
  },
  modeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceHighlight,
    borderRadius: Radii.full,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  modeButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.full,
  },
  modeButtonActive: {
    backgroundColor: Colors.primary,
  },
  modeText: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.medium,
    color: Colors.textSecondary,
  },
  modeTextActive: {
    color: Colors.white,
    fontFamily: Typography.family.bold,
  },
  content: {
    paddingBottom: Spacing['3xl'],
  },
  metricsContainer: {
    padding: Spacing.base,
    gap: Spacing.sm,
  },
  metricCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 130,
    justifyContent: 'space-between',
  },
  metricLabel: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: Typography.size['2xl'],
    fontFamily: Typography.family.bold,
  },
  searchContainer: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
  },
  tabsContainer: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  tabChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  tabChipActive: {
    backgroundColor: Colors.primary + '15',
    borderColor: Colors.primary,
  },
  tabText: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.medium,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
    fontFamily: Typography.family.bold,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  sortLabel: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.medium,
    color: Colors.textTertiary,
  },
  sortOption: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.medium,
    color: Colors.textSecondary,
  },
  sortOptionActive: {
    color: Colors.primary,
    fontFamily: Typography.family.bold,
    textDecorationLine: 'underline',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.semiBold,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  listContainer: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
  },
  subscriberCard: {
    backgroundColor: Colors.surfaceHighlight,
    padding: Spacing.base,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  customerName: {
    fontSize: Typography.size.base,
    fontFamily: Typography.family.bold,
    color: Colors.textPrimary,
  },
  userIdText: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.regular,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  statusText: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.bold,
  },
  contactInfo: {
    marginBottom: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: 4,
  },
  cardDetails: {
    gap: Spacing.xs,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  detailText: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.medium,
    color: Colors.textSecondary,
  },
  amountValue: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.semiBold,
    color: Colors.textPrimary,
  },
  requestActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.sm,
    backgroundColor: Colors.primary + '15',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  actionBtnSecondaryText: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.semiBold,
    color: Colors.primary,
  },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.sm,
    backgroundColor: Colors.primary,
  },
  actionBtnPrimaryText: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.bold,
    color: Colors.white,
  },
  actionBtnDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.sm,
    backgroundColor: Colors.error + '15',
    borderWidth: 1,
    borderColor: Colors.error + '30',
  },
  actionBtnDangerText: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.semiBold,
    color: Colors.error,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.base,
  },
  rejectModalCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rejectModalTitle: {
    fontSize: Typography.size.lg,
    fontFamily: Typography.family.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  rejectModalSubtitle: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.regular,
    color: Colors.textSecondary,
    marginBottom: Spacing.base,
  },
  rejectModalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.base,
  },
  rejectModalCancelBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.sm,
  },
  rejectModalCancelText: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.medium,
    color: Colors.textSecondary,
  },
  rejectModalSubmitBtn: {
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.sm,
  },
  rejectModalSubmitText: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.bold,
    color: Colors.white,
  },
});

const getRequestStatusColor = (status: string) => {
  switch (status) {
    case 'verification_pending': return Colors.primary;
    case 'awaiting_proof': return Colors.warning;
    case 'approved': return Colors.success;
    case 'rejected': return Colors.error;
    case 'cancelled': return Colors.textTertiary;
    default: return Colors.textSecondary;
  }
};
