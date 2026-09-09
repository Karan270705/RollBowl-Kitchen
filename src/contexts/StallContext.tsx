import React, { createContext, useContext, useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import { Colors, Typography, Spacing } from '@/src/constants/theme';
import * as SecureStore from 'expo-secure-store';

export interface Stall {
  id: string;
  name: string;
  is_active: boolean;
}

export interface StaffAssignment {
  id: string;
  user_id: string;
  stall_id: string;
  role: 'kitchen' | 'stall_operator' | 'manager';
  created_at: string;
  stalls?: Stall;
}

interface StallContextValue {
  currentStallId: string | null;
  currentStallName: string | null;
  assignments: StaffAssignment[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  switchStall: (stallId: string) => Promise<void>;
}

const StallContext = createContext<StallContextValue | undefined>(undefined);
const STORE_KEY = 'rollbowl_kitchen_stall_id';


export const StallContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentStallId, setCurrentStallId] = useState<string | null>(null);
  const [currentStallName, setCurrentStallName] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<StaffAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [authUserId, setAuthUserId] = useState<string | null>(null);

  const fetchStallContext = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        setAuthUserId(null);
        throw new Error('Not authenticated');
      }

      if (authUserId !== user.id) {
        setCurrentStallId(null);
        setCurrentStallName(null);
        setAssignments([]);
        setAuthUserId(user.id);
      }

      console.log('[StallContext] Fetching assignments for user:', user.id);

      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('staff_assignments')
        .select('*, stalls(id, name, is_active)')
        .eq('user_id', user.id);

      if (assignmentsError) {
        throw new Error(`Failed to fetch staff assignments: ${assignmentsError.message}`);
      }

      const validAssignments = (assignmentsData || [])
        .filter(a => a.stalls && a.stalls.is_active)
        .sort((a, b) => a.stalls!.name.localeCompare(b.stalls!.name));

      console.log('[StallContext] Found valid assignments:', validAssignments.length);

      if (validAssignments.length === 0) {
        throw new Error('You are not assigned to any active stall. Contact your administrator.');
      }

      setAssignments(validAssignments);

      const persistedId = await SecureStore.getItemAsync(STORE_KEY);
      let selectedAssignment = validAssignments.find(a => a.stall_id === persistedId);

      if (!selectedAssignment) {
        selectedAssignment = validAssignments[0];
      }

      const stallData = selectedAssignment.stalls!;

      setCurrentStallId(stallData.id);
      setCurrentStallName(stallData.name);
      await SecureStore.setItemAsync(STORE_KEY, stallData.id);

      console.log('[StallContext] Initialized:', {
        stallId: stallData.id,
        stallName: stallData.name,
        role: selectedAssignment.role,
        totalAssignments: validAssignments.length,
      });

    } catch (err: any) {
      console.error('[StallContext] Error:', err);
      setError(err.message || 'Failed to initialize stall context');
      setCurrentStallId(null);
      setCurrentStallName(null);
      setAssignments([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStallContext();
    
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setCurrentStallId(null);
        setCurrentStallName(null);
        setAssignments([]);
        setAuthUserId(null);
        SecureStore.deleteItemAsync(STORE_KEY).catch(() => {});
      } else if (event === 'SIGNED_IN') {
        fetchStallContext();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const switchStall = async (stallId: string) => {
    const assignment = assignments.find(a => a.stall_id === stallId);
    if (!assignment) {
      throw new Error('You are not authorized for this stall.');
    }
    if (!assignment.stalls?.is_active) {
      throw new Error('This stall is inactive.');
    }

    setIsLoading(true);
    try {
      await SecureStore.setItemAsync(STORE_KEY, stallId);
      setCurrentStallId(stallId);
      setCurrentStallName(assignment.stalls.name);
    } finally {
      setIsLoading(false);
    }
  };

  const value: StallContextValue = {
    currentStallId,
    currentStallName,
    assignments,
    isLoading,
    error,
    refetch: fetchStallContext,
    switchStall,
  };

  if (isLoading && !currentStallId) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Stall Error: {error}</Text>
      </View>
    );
  }

  return <StallContext.Provider value={value}>{children}</StallContext.Provider>;
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.xl,
  },
  errorText: {
    fontFamily: Typography.family.medium,
    fontSize: 16,
    color: Colors.error,
    textAlign: 'center',
  },
});

export const useStallContext = (): StallContextValue => {
  const context = useContext(StallContext);
  if (context === undefined) {
    throw new Error('useStallContext must be used within StallContextProvider');
  }
  return context;
};

// Hook to get current stall ID with error handling
export const useCurrentStallId = (): string => {
  const { currentStallId, isLoading, error } = useStallContext();

  if (error) {
    throw new Error(error);
  }

  if (isLoading && !currentStallId) {
    throw new Error('Stall context is still loading');
  }

  if (!currentStallId) {
    throw new Error('No stall context available');
  }

  return currentStallId;
};
