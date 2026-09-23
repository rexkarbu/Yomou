import React from 'react';
import {
  Pressable,
  PressableProps,
  ViewStyle,
  StyleProp,
  ActivityIndicator,
  AccessibilityState,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from './Typography';
import { Icon, MaterialSymbolName } from './Icon';
import { RADIUS } from '../../styles/theme';

export type ButtonVariant = 'filled' | 'outlined' | 'text';

interface BaseButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  variant?: ButtonVariant;
  icon?: MaterialSymbolName;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
}

/**
 * ButtonProps uses a strict discriminated union:
 * - If title is provided, accessibilityLabel is optional (falls back to title).
 * - If title is omitted/undefined (icon-only button), accessibilityLabel is MANDATORY.
 */
export type ButtonProps =
  | (BaseButtonProps & {
      title: string;
      accessibilityLabel?: string;
    })
  | (BaseButtonProps & {
      title?: undefined;
      accessibilityLabel: string;
    });

import {
  resolveButtonLayoutAndStyle,
  mergeButtonAccessibilityState,
} from './button-layout';

export {
  resolveButtonLayoutAndStyle,
  mergeButtonAccessibilityState,
};

export const Button: React.FC<ButtonProps> = ({
  title,
  accessibilityLabel,
  variant = 'filled',
  icon,
  disabled = false,
  loading = false,
  style,
  ...pressableProps
}) => {
  const { colors } = useTheme();

  const getVariantStyle = (pressed: boolean): ViewStyle => {
    switch (variant) {
      case 'filled':
        return {
          backgroundColor: disabled
            ? colors.surfaceRaised
            : pressed
            ? colors.accentPressed
            : colors.accentPrimary,
          borderWidth: 0,
          borderRadius: RADIUS.medium,
          paddingHorizontal: title ? 16 : 12,
          paddingVertical: 12,
        };
      case 'outlined':
        return {
          backgroundColor: pressed ? colors.surfaceRaised : 'transparent',
          borderWidth: 1,
          borderColor: disabled ? colors.borderSubtle : colors.borderStrong,
          borderRadius: RADIUS.medium,
          paddingHorizontal: title ? 16 : 12,
          paddingVertical: 12,
        };
      case 'text':
        return {
          backgroundColor: pressed ? colors.surfaceRaised : 'transparent',
          borderWidth: 0,
          borderRadius: RADIUS.medium,
          paddingHorizontal: title ? 12 : 8,
          paddingVertical: 12,
        };
    }
  };

  const getTextColor = (): 'primary' | 'secondary' | 'accent' | 'onAccent' => {
    if (disabled) return 'secondary';
    if (variant === 'filled') return 'onAccent';
    if (variant === 'text') return 'accent';
    return 'primary';
  };

  const resolvedAccessibilityLabel = accessibilityLabel ?? title;
  const { accessibilityState: customAccessibilityState, ...restPressableProps } = pressableProps;
  const mergedAccessibilityState = mergeButtonAccessibilityState(customAccessibilityState, disabled, loading);
  const isAuthoritativeDisabled = Boolean(disabled || loading);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={resolvedAccessibilityLabel}
      accessibilityState={mergedAccessibilityState}
      disabled={isAuthoritativeDisabled}
      style={({ pressed }) => resolveButtonLayoutAndStyle(getVariantStyle(pressed), style, pressed)}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      {...restPressableProps}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'filled' ? colors.accentOnPrimary : colors.accentPrimary}
        />
      ) : (
        <>
          {icon && (
            <Icon
              name={icon}
              size={24}
              color={
                disabled
                  ? colors.textSecondary
                  : variant === 'filled'
                  ? colors.accentOnPrimary
                  : variant === 'text'
                  ? colors.accentPrimary
                  : colors.textPrimary
              }
            />
          )}
          {title && (
            <Typography variant="label" color={getTextColor()}>
              {title}
            </Typography>
          )}
        </>
      )}
    </Pressable>
  );
};
