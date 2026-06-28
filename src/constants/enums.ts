/**
 * RollBowl Kitchen — Enums
 * Shared enums from the RollBowl platform.
 * DO NOT modify these — they match the existing database enums.
 */

export enum UserRole {
  CUSTOMER = 'customer',
  KITCHEN = 'kitchen',
  STALL_OPERATOR = 'stall_operator',
}

export enum MealCategory {
  BREAKFAST = 'breakfast',
  BOWL = 'bowl',
  DINNER = 'dinner',
  ROLL = 'roll',
  BEVERAGES = 'beverages',
  COMBO = 'combo',
}

export enum MealType {
  VEG = 'veg',
  NON_VEG = 'non_veg',
  VEGAN = 'vegan',
}
