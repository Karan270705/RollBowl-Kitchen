/**
 * RollBowl Kitchen — Density & Alignment Guardrails
 * Architectural rules for internal dark-mode operational screens.
 *
 * 1. Bounded Price/Value Column (`BoundedPriceColumn`):
 *    - Always use `flexShrink: 0`, `minWidth: 70`, `maxWidth: 110`.
 *    - Always right-align numeric amounts (`textAlign: 'right'`).
 *    - Use tabular numbers (`fontVariant: ['tabular-nums']`) so digits align cleanly.
 *    - Use `numberOfLines={1}` and `adjustsFontSizeToFit` so prices never escape card boundaries.
 *
 * 2. Flexible Name Column (`FlexibleNameColumn`):
 *    - Always use `flex: 1` and `flexShrink: 1` on text container columns.
 *    - Specify explicit `numberOfLines={1}` or `numberOfLines={2}` with `ellipsizeMode="tail"`.
 *    - Never allow long meal or customer names to push right-hand action buttons or price columns off-screen.
 *
 * 3. Button & Action Sizing (`AppButton`, `CompactActionButton`):
 *    - Enforce a minimum touch target of 44x44 points (`minHeight: 44, minWidth: 44`).
 *    - For full-width card actions, use `fullWidth={true}` with predictable horizontal padding.
 *    - For inline card buttons, use `CompactActionButton` with short action labels or icon-only variants.
 *
 * 4. Spacing & Card Density (`AppCard`, `CompactCard`):
 *    - Standard operational cards: `Spacing.base` (16px) padding with `Radii.lg` (12px).
 *    - Dense operational cards / list items: `CompactCard` with `Spacing.md` (12px) padding and `Radii.md` (8px).
 *    - Never add decorative padding > 24px on list items.
 *
 * 5. Aligned Label-Value Patterns (`AlignedLabelValue`):
 *    - Always uppercase labels (`textTransform: 'uppercase'`, `letterSpacing: 0.5`) in `Colors.textSecondary` or `Colors.textMuted`.
 *    - Always align horizontal label-value pairs with `justifyContent: 'space-between'`.
 */

export const DENSITY_GUARDRAILS = {
  minTouchTarget: 44,
  boundedPriceMinWidth: 70,
  boundedPriceMaxWidth: 110,
  standardCardPadding: 16,
  compactCardPadding: 12,
  defaultEllipsizeMode: 'tail' as const,
};
