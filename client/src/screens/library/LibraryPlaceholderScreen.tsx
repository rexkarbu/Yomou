import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { Typography, Button, Surface, Icon } from '../../components/common';
import type { MainTabScreenProps } from '../../navigation/types';

export const LibraryPlaceholderScreen: React.FC<MainTabScreenProps<'Library'>> = ({
  navigation,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.surfaceBackground }]}
      contentContainerStyle={[
        styles.container,
        { paddingTop: Math.max(insets.top, 16) + 16, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <View style={styles.headerRow}>
        <Icon name="library_books" size={28} color={colors.accentPrimary} accessibilityLabel="Library icon" />
        <Typography variant="headline" color="primary">
          Library
        </Typography>
      </View>

      <Surface variant="card" style={styles.card}>
        <Typography variant="title" color="primary">
          Pustaka Novel
        </Typography>
        <Typography variant="body" color="secondary">
          Placeholder layar Library untuk pengujian navigasi tab dan pergantian tema.
        </Typography>

        <View style={styles.actionColumn}>
          <Button
            variant="filled"
            title="Kembali ke Tab Discover"
            onPress={() => navigation.navigate('Discover')}
          />
        </View>
      </Surface>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 20,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  card: {
    width: '100%',
    padding: 16,
    gap: 12,
  },
  actionColumn: {
    marginTop: 8,
  },
});
