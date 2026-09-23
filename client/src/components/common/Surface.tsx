import React from 'react';
import { View, ViewProps, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { RADIUS, ELEVATION } from '../../styles/theme';

export type SurfaceVariant = 'card' | 'sheet' | 'raised' | 'overlay';

export interface SurfaceProps extends ViewProps {
  variant?: SurfaceVariant;
  children?: React.ReactNode;
}

export const Surface: React.FC<SurfaceProps> = ({
  variant = 'card',
  style,
  children,
  ...rest
}) => {
  const { colors } = useTheme();

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'card':
      case 'raised':
        return {
          backgroundColor: colors.surfaceRaised,
          borderColor: colors.borderSubtle,
          borderWidth: 1,
          borderRadius: RADIUS.medium,
          elevation: ELEVATION.level1,
        };
      case 'sheet':
        return {
          backgroundColor: colors.surfaceOverlay,
          borderColor: colors.borderSubtle,
          borderTopWidth: 1,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderBottomWidth: 0,
          borderTopLeftRadius: RADIUS.sheet,
          borderTopRightRadius: RADIUS.sheet,
          elevation: ELEVATION.level3,
        };
      case 'overlay':
        return {
          backgroundColor: colors.surfaceOverlay,
          borderColor: colors.borderSubtle,
          borderWidth: 1,
          borderRadius: RADIUS.large,
          elevation: ELEVATION.level2,
        };
    }
  };

  return (
    <View style={[getVariantStyles(), style]} {...rest}>
      {children}
    </View>
  );
};
