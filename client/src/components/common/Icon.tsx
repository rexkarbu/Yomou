import React from 'react';
import { StyleProp, TextStyle } from 'react-native';
import createIconSet from '@expo/vector-icons/createIconSet';
import { useTheme } from '../../context/ThemeContext';
import {
  MATERIAL_SYMBOLS_GLYPH_MAP,
  MaterialSymbolName,
  isMaterialSymbolName,
} from './material-symbols-glyphmap';

export { MATERIAL_SYMBOLS_GLYPH_MAP, MaterialSymbolName, isMaterialSymbolName };

/**
 * Creates the official Material Symbols Rounded icon component with real offline font asset.
 * Font Asset: client/assets/fonts/MaterialSymbolsRounded_400Regular.ttf
 * License: Apache 2.0 (see client/assets/fonts/LICENSE_MATERIAL_SYMBOLS.txt)
 */
export const MaterialSymbolsRounded = createIconSet(
  MATERIAL_SYMBOLS_GLYPH_MAP,
  'MaterialSymbolsRounded',
  require('../../../assets/fonts/MaterialSymbolsRounded_400Regular.ttf')
);

export interface IconProps {
  /** Material Symbols Rounded glyph name strictly restricted to available glyphs */
  name: MaterialSymbolName;
  /** Icon size in dp, defaults to standard 24dp */
  size?: number;
  /** Semantic icon color, defaults to colors.textPrimary */
  color?: string;
  accessibilityLabel?: string;
  style?: StyleProp<TextStyle>;
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  color,
  accessibilityLabel,
  style,
}) => {
  const { colors } = useTheme();
  const iconColor = color ?? colors.textPrimary;

  return (
    <MaterialSymbolsRounded
      name={name}
      size={size}
      color={iconColor}
      accessibilityLabel={accessibilityLabel}
      accessible={Boolean(accessibilityLabel)}
      style={style}
    />
  );
};
