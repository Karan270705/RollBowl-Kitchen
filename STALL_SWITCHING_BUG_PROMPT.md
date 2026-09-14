# Bug Report: Cannot Add Menu Items When Switched to Non-Primary Stall

## Problem Statement

In the RollBowl Kitchen app (React Native/Expo), when logged in as a kitchen operator:

- ✅ **On "RollBowl Main Kitchen" stall**: Can open catalog, select items, and successfully add them to the menu
- ❌ **On any other stall** (after switching via StallSelector): Can open catalog, see items, select them, but clicking "Add Items" button does **nothing**
  - No error messages displayed
  - No console logs
  - No visible state changes
  - Items don't get added to the menu
  - Modal doesn't close

## Environment

- **App**: RollBowl-Kitchen (F:/RollBowl-Kitchen/)
- **Database**: Supabase with PostgreSQL + Row Level Security (RLS)
- **Stack**: React Native, Expo, React Query (TanStack Query)
- **Multi-stall architecture**: Kitchen staff can switch between multiple assigned stalls

## Key Files Involved

### 1. **StallContext** (`src/contexts/StallContext.tsx`)
- **Lines 66-94**: Fetches ALL active stalls (no staff_assignments filtering)
- Query: `.from('stalls').select(...).eq('is_active', true)`
- Creates mock assignments for all stalls (lines 84-91)
- **Issue**: Not actually checking `staff_assignments` table

### 2. **Menu Screen** (`app/(app)/(menu)/index.tsx`)
- **Line 24**: Imports `StallSelector` component
- **Line 193**: Renders StallSelector in header
- **Line 14**: Uses `useMenuForDate(selectedDateStr)` hook
- **Line 15**: Uses `useMealsPool()` hook for catalog
- **Line 43**: Uses `useSaveMenuMeals()` mutation
- **Line 106**: `handleSaveMeals` function - called when user clicks "Add Items"
- **Line 132**: Calls `saveMeals()` mutation **WITHOUT error handling callbacks**

### 3. **Menu Hooks** (`src/hooks/useMenu.ts`)
- **Line 14-22**: `useMenuForDate` - includes `stallId` in queryKey ✓
- **Line 24-29**: `useMealsPool` - queryKey is just `['meals']` (no stallId) ⚠️
- **Line 42-60**: `useSaveMenuMeals` mutation
  - Line 43: Gets `stallId` from context
  - Lines 48-52: Creates schedule if needed
  - Line 53: Calls `saveMenuMeals(activeScheduleId, mealIds)`

### 4. **Menu Service** (`src/services/menu/index.ts`)
- **Line 188-212**: `getAllMeals()` function
  - Query: `.from('meals').select('*').order('name')`
  - **NO stall_id filtering** ⚠️
- **Line 148-175**: `saveMenuMeals()` function
  - Upserts to `menu_schedule_items` table
  - Logs result (line 168-174)

### 5. **MealSelectionModal** (`src/components/menu/MealSelectionModal.tsx`)
- **Line 42-45**: `handleSave` function
  - Calls `onSave(Array.from(selectedIds))`
  - Then calls `onClose()`

## Database Schema Context

From `scratch/kitchen_app_audit_report.md`:

### RLS Policies (Migration 053):
```sql
- orders_staff_all - Uses is_staff_of_stall(stall_id)
- subscriptions_staff_all - Uses is_staff_of_stall(stall_id)  
- menu_schedules_staff_all - Uses is_staff_of_stall(stall_id)
- meals_staff_insert/update/delete - Uses is_staff_of_stall(stall_id)
```

### Key Tables:
- `meals` - May or may not have `stall_id` column (UNCLEAR)
- `menu_schedules` - Has `stall_id` column (stall-specific)
- `menu_schedule_items` - Junction table (schedule_id, meal_id)
- `staff_assignments` - Maps users to stalls (BUT NOT CURRENTLY USED)

## Hypotheses

### 1. **RLS Policy Blocking Meal Access**
- `meals` table has RLS policy checking `is_staff_of_stall(stall_id)`
- `getAllMeals()` doesn't filter by stall_id
- When on non-primary stall, RLS blocks the upsert to `menu_schedule_items`
- Mutation fails silently because no error handling

### 2. **Meals Are Stall-Specific But Query Is Global**
- `meals` table has `stall_id` column
- `getAllMeals()` should filter: `.eq('stall_id', stallId)`
- Currently showing meals from ALL stalls
- Trying to add meals from other stalls fails RLS check

### 3. **StallContext Not Using staff_assignments**
- Lines 66-94 query all stalls, not just assigned ones
- RLS function `is_staff_of_stall()` checks `staff_assignments` table
- User isn't actually assigned to other stalls
- RLS blocks the insert

### 4. **Cached Query Not Refetching**
- `useMealsPool` has queryKey `['meals']` without stallId
- When switching stalls, meals pool doesn't refetch
- But this shouldn't cause the issue since meals might be global

### 5. **Silent Mutation Failure**
- Line 132 in menu/index.tsx calls mutation without `onError`
- React Query might be catching error but not displaying it
- Check React Query devtools or logs

## Investigation Steps

### Step 1: Check Meals Table Schema
```sql
-- Does meals have stall_id?
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'meals' AND column_name = 'stall_id';
```

### Step 2: Check RLS Policies on Meals
```sql
-- What RLS policies exist on meals?
SELECT * FROM pg_policies WHERE tablename = 'meals';

-- What does is_staff_of_stall function check?
\df+ is_staff_of_stall
```

### Step 3: Check menu_schedule_items RLS
```sql
-- What RLS policies exist on menu_schedule_items?
SELECT * FROM pg_policies WHERE tablename = 'menu_schedule_items';
```

### Step 4: Add Debug Logging
In `src/hooks/useMenu.ts`, add error handling:
```typescript
export const useSaveMenuMeals = (date: string) => {
  const stallId = useCurrentStallId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ scheduleId, mealIds, ... }) => {
      console.log('[DEBUG] saveMeals called', { stallId, scheduleId, mealIds });
      let activeScheduleId = scheduleId;
      if (!activeScheduleId) {
        console.log('[DEBUG] Creating new schedule');
        const newSchedule = await createMenuSchedule(stallId, date, ...);
        activeScheduleId = newSchedule.id;
        console.log('[DEBUG] Schedule created', newSchedule.id);
      }
      console.log('[DEBUG] Saving meals', { activeScheduleId, count: mealIds.length });
      await saveMenuMeals(activeScheduleId, mealIds);
      console.log('[DEBUG] Meals saved successfully');
    },
    onSuccess: () => {
      console.log('[DEBUG] Mutation onSuccess');
      queryClient.invalidateQueries({ queryKey: ['menu', stallId, date] });
    },
    onError: (error) => {
      console.error('[DEBUG] Mutation onError', error);
      Alert.alert('Error', error.message);
    },
  });
};
```

### Step 5: Check StallContext Behavior
Add logging to see if stallId is actually changing:
```typescript
// In src/contexts/StallContext.tsx
console.log('[StallContext] Current stall:', currentStallId, currentStallName);
```

### Step 6: Test getAllMeals with Stall Filter
Try modifying `getAllMeals()` to filter by stall (if column exists):
```typescript
export const getAllMeals = async (stallId?: string): Promise<Meal[]> => {
  let query = supabase.from('meals').select('*').order('name');
  
  if (stallId) {
    query = query.eq('stall_id', stallId);
  }
  
  const { data, error } = await query;
  if (error) {
    console.error('[getAllMeals] Error:', error);
    throw error;
  }
  
  console.log('[getAllMeals] Fetched meals:', data?.length, 'for stall:', stallId);
  return (data || []).map(...);
};
```

## Expected Fix

### If meals ARE stall-specific:
1. Add `stallId` parameter to `getAllMeals(stallId: string)`
2. Update query: `.eq('stall_id', stallId)`
3. Update `useMealsPool` to include stallId in queryKey and pass to function
4. Ensure RLS policies allow read/write for assigned stalls

### If meals are GLOBAL:
1. Fix StallContext to actually use `staff_assignments` table
2. Ensure user is properly assigned to stalls they're switching to
3. Add proper error handling to mutation calls
4. Check `menu_schedule_items` RLS policies

## Request to Antigravity

Please investigate this issue and:
1. Determine if `meals` table has `stall_id` column
2. Check all relevant RLS policies
3. Identify why the mutation fails silently on non-primary stalls
4. Provide the fix to make menu item addition work for all stalls
5. Ensure proper error messages are shown if something goes wrong

The fix should maintain multi-stall support and ensure kitchen staff can manage menus for any stall they're assigned to.
