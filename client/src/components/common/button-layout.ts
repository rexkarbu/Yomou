import type { ViewStyle, StyleProp, AccessibilityState } from 'react-native';

/**
 * Utility to flatten React Native style objects or arrays without importing Flow runtime.
 */
export function flattenStyle(style: unknown): Record<string, any> | undefined {
  if (!style) return undefined;
  if (!Array.isArray(style)) return typeof style === 'object' ? (style as Record<string, any>) : undefined;
  const result: Record<string, any> = {};
  for (let i = 0; i < style.length; i++) {
    const sub = flattenStyle(style[i]);
    if (sub) {
      Object.assign(result, sub);
    }
  }
  return result;
}

/**
 * Resolves button layout ensuring user styles cannot lower the 48x48dp minimum touch target.
 */
export function resolveButtonLayoutAndStyle(
  variantStyle: ViewStyle,
  userStyle?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>),
  pressed: boolean = false
): ViewStyle {
  const resolvedUser = typeof userStyle === 'function' ? userStyle({ pressed }) : userStyle;
  const flattenedUser = flattenStyle(resolvedUser) || {};
  const userMinHeight = typeof flattenedUser.minHeight === 'number' ? flattenedUser.minHeight : 0;
  const userMinWidth = typeof flattenedUser.minWidth === 'number' ? flattenedUser.minWidth : 0;

  return {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
    ...variantStyle,
    ...flattenedUser,
    // Strictly enforce minimum 48x48dp touch target regardless of user style overrides
    minHeight: Math.max(48, userMinHeight),
    minWidth: Math.max(48, userMinWidth),
  };
}

/**
 * Merges custom accessibilityState with internal authoritative disabled and busy states.
 */
export function mergeButtonAccessibilityState(
  customState?: AccessibilityState,
  disabled: boolean = false,
  loading: boolean = false
): AccessibilityState {
  const isAuthoritativeDisabled = Boolean(disabled || loading);
  const isAuthoritativeBusy = Boolean(loading);

  return {
    ...customState,
    disabled: isAuthoritativeDisabled,
    busy: isAuthoritativeBusy,
  };
}
