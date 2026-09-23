import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { TYPOGRAPHY } from '../../styles/theme';

export type TypographyVariant = 'headline' | 'title' | 'body' | 'label' | 'caption';

export interface TypographyProps extends RNTextProps {
  variant?: TypographyVariant;
  color?: 'primary' | 'secondary' | 'accent' | 'error' | 'success' | 'onAccent';
  align?: 'left' | 'center' | 'right';
  children: React.ReactNode;
}

export const Typography: React.FC<TypographyProps> = ({
  variant = 'body',
  color = 'primary',
  align = 'left',
  style,
  children,
  ...rest
}) => {
  const { colors } = useTheme();

  const colorMap = {
    primary: colors.textPrimary,
    secondary: colors.textSecondary,
    accent: colors.accentPrimary,
    error: colors.statusError,
    success: colors.statusSuccess,
    onAccent: colors.accentOnPrimary,
  };

  const variantStyle = TYPOGRAPHY[variant];

  return (
    <RNText
      style={[
        {
          fontSize: variantStyle.fontSize,
          lineHeight: variantStyle.lineHeight,
          fontWeight: variantStyle.fontWeight,
          color: colorMap[color],
          textAlign: align,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </RNText>
  );
};
