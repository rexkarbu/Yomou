import React, { useState } from 'react';
import { View, Image, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../common/Typography';
import { Icon } from '../common/Icon';
import { RADIUS, SPACING } from '../../styles/theme';
import type { NovelSummary } from '../../types/novel';

export interface LatestFeedItemProps {
  readonly novel: NovelSummary;
  readonly onPress: (novelId: string) => void;
}

export const LatestFeedItem: React.FC<LatestFeedItemProps> = ({ novel, onPress }) => {
  const { colors } = useTheme();
  const [imageError, setImageError] = useState(false);

  const latestChapterText = novel.latestChapter?.title;
  const releaseDateText = novel.latestChapter?.releaseDate;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.surfaceBackground,
          borderBottomColor: colors.borderSubtle,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
      onPress={() => onPress(novel.id)}
      accessibilityRole="button"
      accessibilityLabel={`Novel: ${novel.title}${
        latestChapterText ? `, Bab terbaru: ${latestChapterText}` : ''
      }`}
    >
      <View
        style={[
          styles.coverContainer,
          {
            backgroundColor: colors.surfaceRaised,
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
              size={24}
              color={colors.textSecondary}
              accessibilityLabel="Sampul tidak tersedia"
            />
          </View>
        )}
      </View>

      <View style={styles.infoColumn}>
        <Typography
          variant="title"
          color="primary"
          numberOfLines={2}
          style={styles.title}
        >
          {novel.title}
        </Typography>

        {latestChapterText && (
          <Typography
            variant="body"
            color="secondary"
            numberOfLines={1}
            style={styles.chapterText}
          >
            {latestChapterText}
          </Typography>
        )}

        {releaseDateText && (
          <Typography
            variant="caption"
            color="secondary"
            numberOfLines={1}
            style={styles.dateText}
          >
            {releaseDateText}
          </Typography>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.space3,
    paddingHorizontal: SPACING.space4,
    borderBottomWidth: 1,
    minHeight: 114, // Cover 90dp + padding vertikal 12dp atas + 12dp bawah = 114dp minimum adaptif
  },
  coverContainer: {
    width: 60,
    height: 90, // Rasio 2:3 (lebar 60, tinggi 90)
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
  infoColumn: {
    flex: 1,
    marginLeft: SPACING.space3,
    justifyContent: 'center',
    gap: SPACING.space1,
  },
  title: {
    textAlign: 'left',
  },
  chapterText: {
    textAlign: 'left',
  },
  dateText: {
    textAlign: 'left',
  },
});
