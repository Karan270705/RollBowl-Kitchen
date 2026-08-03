import React, { useEffect } from 'react';
import { ViewStyle, Pressable, PressableProps } from 'react-native';
import Animated, {
  useReducedMotion,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  FadeIn as ReanimatedFadeIn,
  FadeInDown,
  FadeInUp,
  ZoomIn,
  Easing,
} from 'react-native-reanimated';
import { Motion } from '@/src/constants/theme';

export interface MotionWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  duration?: number;
  delay?: number;
}

/**
 * FadeIn — opacity transition for general containers
 */
export const FadeIn: React.FC<MotionWrapperProps> = ({
  children,
  style,
  duration = Motion.normal,
  delay = 0,
}) => {
  const reducedMotion = useReducedMotion();
  const entering = reducedMotion
    ? undefined
    : ReanimatedFadeIn.duration(duration).delay(delay);

  return (
    <Animated.View entering={entering} style={style}>
      {children}
    </Animated.View>
  );
};

/**
 * FadeUp — subtle upward translation with opacity fade
 */
export const FadeUp: React.FC<MotionWrapperProps> = ({
  children,
  style,
  duration = Motion.normal,
  delay = 0,
}) => {
  const reducedMotion = useReducedMotion();
  const entering = reducedMotion
    ? undefined
    : FadeInDown.duration(duration)
        .delay(delay)
        .easing(Easing.out(Easing.cubic));

  return (
    <Animated.View entering={entering} style={style}>
      {children}
    </Animated.View>
  );
};

/**
 * ScaleIn — subtle scale entrance from 0.96 to 1
 */
export const ScaleIn: React.FC<MotionWrapperProps> = ({
  children,
  style,
  duration = Motion.normal,
  delay = 0,
}) => {
  const reducedMotion = useReducedMotion();
  const entering = reducedMotion
    ? undefined
    : ZoomIn.duration(duration).delay(delay);

  return (
    <Animated.View entering={entering} style={style}>
      {children}
    </Animated.View>
  );
};

/**
 * PressableScale — tactile button/card press feedback
 */
export interface PressableScaleProps extends PressableProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  activeScale?: number;
}

export const PressableScale: React.FC<PressableScaleProps> = ({
  children,
  style,
  activeScale = 0.97,
  disabled,
  ...rest
}) => {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (disabled || reducedMotion) return;
    scale.value = withTiming(activeScale, { duration: Motion.fast });
  };

  const handlePressOut = () => {
    if (disabled || reducedMotion) return;
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 250,
    });
  };

  return (
    <Pressable
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      {...rest}
    >
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
};

/**
 * Preset entering animations for operational screens
 */
export const cardEntrance = (delay = 0) => {
  const reducedMotion = useReducedMotion();
  return reducedMotion
    ? undefined
    : ReanimatedFadeIn.duration(Motion.normal).delay(delay);
};

export const modalEntrance = () => {
  const reducedMotion = useReducedMotion();
  return reducedMotion
    ? undefined
    : FadeInUp.duration(Motion.normal).easing(Easing.out(Easing.cubic));
};

export const successCheckEntrance = () => {
  const reducedMotion = useReducedMotion();
  return reducedMotion ? undefined : ZoomIn.duration(Motion.normal);
};

/**
 * NumericTransition — smoothly crossfades when value changes without becoming unreadable
 */
export interface NumericTransitionProps {
  value: string | number;
  style?: ViewStyle | ViewStyle[];
  children?: React.ReactNode;
}

export const NumericTransition: React.FC<NumericTransitionProps> = ({
  value,
  style,
  children,
}) => {
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) return;
    opacity.value = 0.4;
    opacity.value = withTiming(1, { duration: Motion.fast });
  }, [value, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
};
