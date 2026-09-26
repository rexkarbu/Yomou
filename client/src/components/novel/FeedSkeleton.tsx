import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { RADIUS, SPACING } from '../../styles/theme';

export const PopularCarouselSkeleton: React.FC = () => {
  const { colors } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.popularContainer}
    >
      {[1, 2, 3, 4].map((item) => (
        <View
          key={item}
          style={[
            styles.popularCard,
            {
              backgroundColor: colors.surfaceRaised,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <View
            style={[
              styles.popularCover,
              { backgroundColor: colors.borderSubtle },
            ]}
          />
          <View
            style={[
              styles.popularLine1,
              { backgroundColor: colors.borderSubtle },
            ]}
          />
          <View
            style={[
              styles.popularLine2,
              { backgroundColor: colors.borderSubtle },
            ]}
          />
        </View>
      ))}
    </ScrollView>
  );
};

export const LatestFeedSkeleton: React.FC = () => {
  const { colors } = useTheme();

  return (
    <View style={styles.latestContainer}>
      {[1, 2, 3, 4, 5].map((item) => (
        <View
          key={item}
          style={[
            styles.latestRow,
            {
              backgroundColor: colors.surfaceBackground,
              borderBottomColor: colors.borderSubtle,
            },
          ]}
        >
          <View
            style={[
              styles.latestCover,
              { backgroundColor: colors.surfaceRaised },
            ]}
          />
          <View style={styles.latestInfo}>
            <View
              style={[
                styles.latestLineTitle,
                { backgroundColor: colors.surfaceRaised },
              ]}
            />
            <View
              style={[
                styles.latestLineSub,
                { backgroundColor: colors.surfaceRaised },
              ]}
            />
            <View
              style={[
                styles.latestLineDate,
                { backgroundColor: colors.surfaceRaised },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  popularContainer: {
    paddingHorizontal: SPACING.space4,
    paddingVertical: SPACING.space2,
  },
  popularCard: {
    width: 110,
    borderRadius: RADIUS.medium,
    borderWidth: 1,
    padding: SPACING.space1,
    marginRight: SPACING.space3,
  },
  popularCover: {
    width: 100,
    height: 150,
    borderRadius: RADIUS.small,
  },
  popularLine1: {
    height: 14,
    borderRadius: RADIUS.small,
    marginTop: SPACING.space2,
    width: '90%',
  },
  popularLine2: {
    height: 12,
    borderRadius: RADIUS.small,
    marginTop: SPACING.space1,
    width: '60%',
  },
  latestContainer: {
    flex: 1,
  },
  latestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.space3,
    paddingHorizontal: SPACING.space4,
    borderBottomWidth: 1,
    minHeight: 114,
  },
  latestCover: {
    width: 60,
    height: 90,
    borderRadius: RADIUS.small,
  },
  latestInfo: {
    flex: 1,
    marginLeft: SPACING.space3,
    gap: SPACING.space2,
  },
  latestLineTitle: {
    height: 18,
    borderRadius: RADIUS.small,
    width: '80%',
  },
  latestLineSub: {
    height: 14,
    borderRadius: RADIUS.small,
    width: '50%',
  },
  latestLineDate: {
    height: 12,
    borderRadius: RADIUS.small,
    width: '35%',
  },
});
