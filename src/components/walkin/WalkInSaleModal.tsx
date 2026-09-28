import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radii, Shadows } from '@/src/constants/theme';
import { Button } from '@/src/components/ui';
import { useAvailableWalkInItems, useCreateWalkInOrder } from '@/src/hooks/useWalkInOrders';
import type { AvailableWalkInItem } from '@/src/types/walkIn';

// ─── Helpers ──────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

// ─── Types ────────────────────────────────────────────────────

interface CartItem {
  meal_id: string;
  meal_name: string;
  quantity: number;
  unit_price: number;
  available: number;
}

type PaymentMethod = 'cash' | 'upi' | 'card' | 'other';

export interface WalkInSaleModalProps {
  visible: boolean;
  onClose: () => void;
  stallId: string;
  batchId: string | null;
  operationalDate: string;
}

// ─── Component ───────────────────────────────────────────────

export function WalkInSaleModal({
  visible,
  onClose,
  stallId,
  batchId,
  operationalDate,
}: WalkInSaleModalProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: availableItems = [], isLoading } = useAvailableWalkInItems(
    stallId,
    operationalDate,
    batchId,
  );

  const createOrderMutation = useCreateWalkInOrder();

  // ── Filtered + grouped items ──────────────────────────────

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return availableItems;
    const q = searchQuery.toLowerCase();
    return availableItems.filter(item => item.meal_name.toLowerCase().includes(q));
  }, [availableItems, searchQuery]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, AvailableWalkInItem[]> = {};
    filteredItems.forEach(item => {
      const category = item.category || 'other';
      if (!groups[category]) groups[category] = [];
      groups[category].push(item);
    });
    return groups;
  }, [filteredItems]);

  // ── Cart totals ──────────────────────────────────────────

  const cartItemCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0),
    [cart],
  );

  // ── Cart operations ───────────────────────────────────────

  const addToCart = (item: AvailableWalkInItem) => {
    const existing = cart.find(c => c.meal_id === item.meal_id);
    if (existing) {
      if (item.available !== 999 && existing.quantity >= item.available) {
        Alert.alert('Stock Limit', `Only ${item.available} available`);
        return;
      }
      setCart(prev =>
        prev.map(c => c.meal_id === item.meal_id ? { ...c, quantity: c.quantity + 1 } : c),
      );
    } else {
      setCart(prev => [
        ...prev,
        {
          meal_id: item.meal_id,
          meal_name: item.meal_name,
          quantity: 1,
          unit_price: item.unit_price,
          available: item.available,
        },
      ]);
    }
  };

  const updateQuantity = (mealId: string, delta: number) => {
    const item = cart.find(c => c.meal_id === mealId);
    if (!item) return;
    const next = item.quantity + delta;
    if (next <= 0) {
      setCart(prev => prev.filter(c => c.meal_id !== mealId));
      return;
    }
    if (item.available !== 999 && next > item.available) {
      Alert.alert('Stock Limit', `Only ${item.available} available`);
      return;
    }
    setCart(prev => prev.map(c => c.meal_id === mealId ? { ...c, quantity: next } : c));
  };

  const removeFromCart = (mealId: string) =>
    setCart(prev => prev.filter(c => c.meal_id !== mealId));

  // ── Submit ────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (cart.length === 0) {
      Alert.alert('Empty Order', 'Please add at least one item');
      return;
    }
    try {
      const result = await createOrderMutation.mutateAsync({
        stallId,
        serviceDate: operationalDate,
        batchId,
        items: cart.map(item => ({
          meal_id: item.meal_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
        paymentMethod,
        notes: notes.trim() || undefined,
      });

      Alert.alert(
        'Order Created ✓',
        `Order ${result.order_number}\nTotal: ${formatCurrency(result.total)}`,
        [{
          text: 'Done',
          onPress: () => {
            setCart([]);
            setNotes('');
            setSearchQuery('');
            setPaymentMethod('cash');
            onClose();
          },
        }],
      );
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to create order');
    }
  };

  // ── Close guard ───────────────────────────────────────────

  const handleClose = () => {
    if (cart.length > 0) {
      Alert.alert('Discard Order?', 'You have items in the cart. Close anyway?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            setCart([]);
            setNotes('');
            setSearchQuery('');
            onClose();
          },
        },
      ]);
    } else {
      onClose();
    }
  };

  // ── Payment options config ────────────────────────────────

  const PAYMENT_METHODS: { key: PaymentMethod; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'cash',  label: 'Cash',  icon: 'cash-outline' },
    { key: 'upi',   label: 'UPI',   icon: 'phone-portrait-outline' },
    { key: 'card',  label: 'Card',  icon: 'card-outline' },
    { key: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
  ];

  // ── Render ────────────────────────────────────────────────

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* ── Header ─────────────────────────────────────── */}
        <LinearGradient
          colors={[Colors.surfaceElevated, Colors.surface]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View>
            <Text style={styles.title}>Walk-In Sale</Text>
            <Text style={styles.subtitle}>
              {batchId ? 'Tracked inventory mode' : 'Untracked mode'}
            </Text>
          </View>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
        </LinearGradient>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Search ─────────────────────────────────── */}
          <View style={styles.searchRow}>
            <Ionicons name="search-outline" size={18} color={Colors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search items…"
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={Colors.textTertiary}
              clearButtonMode="while-editing"
            />
          </View>

          {/* ── Cart summary ───────────────────────────── */}
          {cart.length > 0 && (
            <View style={styles.cartCard}>
              <View style={styles.cartHeader}>
                <Ionicons name="cart-outline" size={18} color={Colors.primary} />
                <Text style={styles.cartTitle}>
                  Cart — {cartItemCount} {cartItemCount === 1 ? 'item' : 'items'}
                </Text>
              </View>

              {cart.map(item => (
                <View key={item.meal_id} style={styles.cartRow}>
                  <View style={styles.cartRowLeft}>
                    <Text style={styles.cartItemName} numberOfLines={1}>{item.meal_name}</Text>
                    <Text style={styles.cartItemMeta}>
                      {formatCurrency(item.unit_price)} each
                    </Text>
                  </View>

                  <View style={styles.qtyControls}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateQuantity(item.meal_id, -1)}
                    >
                      <Ionicons name="remove" size={16} color={Colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.qtyValue}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateQuantity(item.meal_id, +1)}
                    >
                      <Ionicons name="add" size={16} color={Colors.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.qtyBtn, { marginLeft: Spacing.xs }]}
                      onPress={() => removeFromCart(item.meal_id)}
                    >
                      <Ionicons name="trash-outline" size={16} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <View style={styles.cartTotalRow}>
                <Text style={styles.cartTotalLabel}>Total</Text>
                <Text style={styles.cartTotalValue}>{formatCurrency(total)}</Text>
              </View>
            </View>
          )}

          {/* ── Available items ────────────────────────── */}
          {isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.helperText}>Loading items…</Text>
            </View>
          ) : availableItems.length === 0 ? (
            <View style={styles.centered}>
              <Ionicons name="basket-outline" size={52} color={Colors.textTertiary} />
              <Text style={styles.helperText}>No items available for walk-in sale</Text>
            </View>
          ) : (
            <View style={styles.itemsSection}>
              <Text style={styles.sectionLabel}>AVAILABLE ITEMS</Text>

              {Object.entries(groupedItems).map(([category, items]) => (
                <View key={category} style={styles.categoryBlock}>
                  <Text style={styles.categoryLabel}>{category.toUpperCase()}</Text>
                  {items.map(item => {
                    const cartEntry = cart.find(c => c.meal_id === item.meal_id);
                    return (
                      <TouchableOpacity
                        key={item.meal_id}
                        style={[styles.itemCard, cartEntry && styles.itemCardSelected]}
                        onPress={() => addToCart(item)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.itemLeft}>
                          <Text style={styles.itemName}>{item.meal_name}</Text>
                          <Text style={styles.itemAvailable}>
                            {item.available === 999 ? 'Available' : `${item.available} left`}
                          </Text>
                        </View>
                        <View style={styles.itemRight}>
                          <Text style={styles.itemPrice}>{formatCurrency(item.unit_price)}</Text>
                          <Ionicons
                            name={cartEntry ? 'checkmark-circle' : 'add-circle-outline'}
                            size={26}
                            color={cartEntry ? Colors.success : Colors.primary}
                          />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          )}

          {/* ── Payment method ─────────────────────────── */}
          {cart.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>PAYMENT METHOD</Text>
              <View style={styles.paymentRow}>
                {PAYMENT_METHODS.map(method => (
                  <TouchableOpacity
                    key={method.key}
                    style={[
                      styles.paymentChip,
                      paymentMethod === method.key && styles.paymentChipActive,
                    ]}
                    onPress={() => setPaymentMethod(method.key)}
                  >
                    <Ionicons
                      name={method.icon}
                      size={18}
                      color={paymentMethod === method.key ? Colors.primary : Colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.paymentChipText,
                        paymentMethod === method.key && styles.paymentChipTextActive,
                      ]}
                    >
                      {method.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* ── Notes ─────────────────────────────── */}
              <Text style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>NOTES (OPTIONAL)</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Add a note about this order…"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                placeholderTextColor={Colors.textTertiary}
                textAlignVertical="top"
              />
            </>
          )}

          {/* Bottom padding for footer */}
          <View style={{ height: Spacing['2xl'] }} />
        </ScrollView>

        {/* ── Footer submit ─────────────────────────────── */}
        {cart.length > 0 && (
          <View style={styles.footer}>
            <Button
              title={`Place Order · ${formatCurrency(total)}`}
              onPress={handleSubmit}
              loading={createOrderMutation.isPending}
              disabled={cart.length === 0 || createOrderMutation.isPending}
              fullWidth
              variant="primary"
            />
          </View>
        )}
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.xl,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  closeButton: {
    padding: Spacing.sm,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceRaised,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.base },

  // Search
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },

  // Cart card
  cartCard: {
    backgroundColor: Colors.surfaceRaised,
    borderRadius: Radii.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    ...Shadows.sm,
  },
  cartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  cartTitle: {
    fontFamily: Typography.family.semiBold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
    marginLeft: Spacing.xs,
  },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  cartRowLeft: { flex: 1, marginRight: Spacing.sm },
  cartItemName: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.sm,
    color: Colors.textPrimary,
  },
  cartItemMeta: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: Radii.sm,
    backgroundColor: Colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  qtyValue: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
    minWidth: 24,
    textAlign: 'center',
  },
  cartTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.primary + '60',
  },
  cartTotalLabel: {
    fontFamily: Typography.family.semiBold,
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
  },
  cartTotalValue: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.lg,
    color: Colors.primary,
  },

  // Empty / loading
  centered: {
    alignItems: 'center',
    paddingVertical: Spacing['4xl'],
  },
  helperText: {
    marginTop: Spacing.md,
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  // Items list
  itemsSection: { marginBottom: Spacing.base },
  sectionLabel: {
    fontFamily: Typography.family.semiBold,
    fontSize: Typography.size.xs,
    color: Colors.textTertiary,
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  categoryBlock: { marginBottom: Spacing.base },
  categoryLabel: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
    letterSpacing: 0.6,
    marginBottom: Spacing.sm,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  itemCardSelected: {
    backgroundColor: Colors.successMuted,
    borderColor: Colors.success + '80',
  },
  itemLeft: { flex: 1 },
  itemName: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  itemAvailable: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  itemPrice: {
    fontFamily: Typography.family.semiBold,
    fontSize: Typography.size.base,
    color: Colors.primary,
  },

  // Payment
  paymentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  paymentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  paymentChipActive: {
    backgroundColor: Colors.primaryMuted,
    borderColor: Colors.primary,
  },
  paymentChipText: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
  },
  paymentChipTextActive: {
    color: Colors.primary,
    fontFamily: Typography.family.semiBold,
  },

  // Notes
  notesInput: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    padding: Spacing.md,
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 80,
  },

  // Footer
  footer: {
    padding: Spacing.base,
    paddingBottom: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
    ...Shadows.md,
  },
});
