import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, RADIUS } from '../../styles/theme';

export const NovelDetailSkeleton: React.FC = () => {
  const { colors } = useTheme();
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  const skeletonColor = colors.surfaceRaised;

  return (
    <View style={styles.container} accessibilityRole="progressbar" accessibilityLabel="Memuat rincian novel...">
      {/* Header Skeleton */}
      <View style={styles.headerRow}>
        <Animated.View
          style={[
            styles.coverSkeleton,
            { backgroundColor: skeletonColor, opacity: pulseAnim },
          ]}
        />
        <View style={styles.metadataColumn}>
          <Animated.View
            style={[
              styles.titleSkeleton,
              { backgroundColor: skeletonColor, opacity: pulseAnim },
            ]}
          />
          <Animated.View
            style={[
              styles.authorSkeleton,
              { backgroundColor: skeletonColor, opacity: pulseAnim },
            ]}
          />
          <Animated.View
            style={[
              styles.chipSkeleton,
              { backgroundColor: skeletonColor, opacity: pulseAnim },
            ]}
          />
        </View>
      </View>

      {/* Synopsis Skeleton */}
      <View style={styles.synopsisContainer}>
        <Animated.View
          style={[
            styles.synopsisLine,
            { width: '100%', backgroundColor: skeletonColor, opacity: pulseAnim },
          ]}
        />
        <Animated.View
          style={[
            styles.synopsisLine,
            { width: '92%', backgroundColor: skeletonColor, opacity: pulseAnim },
          ]}
        />
        <Animated.View
          style={[
            styles.synopsisLine,
            { width: '70%', backgroundColor: skeletonColor, opacity: pulseAnim },
          ]}
        />
      </View>

      {/* Action Buttons Skeleton */}
      <View style={styles.buttonRow}>
        <Animated.View
          style={[
            styles.buttonSkeleton,
            { backgroundColor: skeletonColor, opacity: pulseAnim },
          ]}
        />
        <Animated.View
          style={[
            styles.buttonSkeleton,
            { backgroundColor: skeletonColor, opacity: pulseAnim },
          ]}
        />
        <Animated.View
          style={[
            styles.buttonSkeleton,
            { backgroundColor: skeletonColor, opacity: pulseAnim },
          ]}
        />
      </View>

      <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

      {/* Chapter Rows Skeleton */}
      {Array.from({ length: 6 }).map((_, index) => (
        <View key={index}>
          <View style={styles.chapterRow}>
            <Animated.View
              style={[
                styles.chapterTitleSkeleton,
                { width: index % 2 === 0 ? '65%' : '80%', backgroundColor: skeletonColor, opacity: pulseAnim },
              ]}
            />
            <Animated.View
              style={[
                styles.chapterMetaSkeleton,
                { backgroundColor: skeletonColor, opacity: pulseAnim },
              ]}
            />
          </View>
          <View style={[styles.rowDivider, { backgroundColor: colors.borderSubtle }]} />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.space4,
    paddingTop: SPACING.space3,
    gap: SPACING.space3,
  },
  headerRow: {
    flexDirection: 'row',
    gap: SPACING.space4,
  },
  coverSkeleton: {
    width: 93,
    height: 140,
    borderRadius: RADIUS.medium,
  },
  metadataColumn: {
    flex: 1,
    gap: SPACING.space2,
    justifyContent: 'center',
  },
  titleSkeleton: {
    width: '90%',
    height: 22,
    borderRadius: RADIUS.small,
  },
  authorSkeleton: {
    width: '60%',
    height: 16,
    borderRadius: RADIUS.small,
  },
  chipSkeleton: {
    width: 80,
    height: 24,
    borderRadius: RADIUS.small,
    marginTop: SPACING.space1,
  },
  synopsisContainer: {
    gap: SPACING.space2,
    paddingVertical: SPACING.space2,
  },
  synopsisLine: {
    height: 14,
    borderRadius: RADIUS.small,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.space2,
  },
  buttonSkeleton: {
    flex: 1,
    height: 48,
    borderRadius: RADIUS.medium,
  },
  divider: {
    height: 1,
    marginVertical: SPACING.space2,
  },
  chapterRow: {
    height: 52,
    justifyContent: 'center',
    gap: SPACING.space1,
  },
  chapterTitleSkeleton: {
    height: 16,
    borderRadius: RADIUS.small,
  },
  chapterMetaSkeleton: {
    width: 90,
    height: 12,
    borderRadius: RADIUS.small,
  },
  rowDivider: {
    height: 1,
  },
});
