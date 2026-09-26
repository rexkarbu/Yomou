import React, { useState } from 'react';
import { View, Image, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../common/Typography';
import { Icon } from '../common/Icon';
import { RADIUS, SPACING } from '../../styles/theme';
import type { NovelSummary } from '../../types/novel';

export interface NovelCardProps {
  readonly novel: NovelSummary;
  readonly onPress: (novelId: string) => void;
}

export const NovelCard: React.FC<NovelCardProps> = ({ novel, onPress }) => {
  const { colors } = useTheme();
  const [imageError, setImageError] = useState(false);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surfaceRaised,
          borderColor: colors.borderSubtle,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
      onPress={() => onPress(novel.id)}
      accessibilityRole="button"
      accessibilityLabel={`Novel populer: ${novel.title}`}
    >
      <View
        style={[
          styles.coverContainer,
          {
            backgroundColor: colors.surfaceBackground,
            borderColor: colors.borderSubtle,
          },
        ]}
      >
        {!imageError && novel.coverUrl ? (
          <Image
            source={{ uri: novel.coverUrl }}
            style={styles.coverImage}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={styles.fallbackContainer}>
            <Icon
              name="menu_book"
              size={28}
              color={colors.textSecondary}
              accessibilityLabel="Sampul tidak tersedia"
            />
          </View>
        )}
      </View>

      <Typography
        variant="label"
        color="primary"
        numberOfLines={2}
        style={styles.title}
      >
        {novel.title}
      </Typography>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 110,
    borderRadius: RADIUS.medium,
    borderWidth: 1,
    padding: SPACING.space1,
    marginRight: SPACING.space3,
  },
  coverContainer: {
    width: 100,
    height: 150, // Rasio 2:3 (lebar 100, tinggi 150)
    borderRadius: RADIUS.small,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    marginTop: SPACING.space1,
    lineHeight: 18,
    textAlign: 'left',
  },
});
