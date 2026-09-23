import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { Typography, Button, Surface, Icon } from '../../components/common';
import type { RootStackScreenProps } from '../../navigation/types';

export const ReaderPlaceholderScreen: React.FC<
  RootStackScreenProps<'Reader'>
> = ({ route, navigation }) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { novelId, chapterId } = route.params;

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.surfaceBackground }]}
      contentContainerStyle={[
        styles.container,
        { paddingTop: Math.max(insets.top, 16) + 16, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <View style={styles.headerRow}>
        <Button
          variant="text"
          icon="arrow_back"
          accessibilityLabel="Kembali ke detail novel"
          onPress={() => navigation.goBack()}
        />
        <Typography variant="headline" color="primary">
          Reader
        </Typography>
      </View>

      <Surface variant="card" style={styles.card}>
        <Typography variant="title" color="primary">
          Parameter Navigasi Bab
        </Typography>
        <Typography variant="body" color="secondary">
          Novel ID: {novelId}
        </Typography>
        <Typography variant="body" color="secondary">
          Chapter ID: {chapterId}
        </Typography>

        <View style={styles.infoBanner}>
          <Icon name="info" size={20} color={colors.accentPrimary} />
          <Typography variant="caption" color="secondary" style={styles.infoText}>
            Layar Reader berada di RootStack di luar MainTabs. Bottom bar tersembunyi otomatis dan tetap tersembunyi saat kembali ke Detail; bar hanya muncul kembali saat kembali ke MainTabs.
          </Typography>
        </View>

        <View style={styles.actionColumn}>
          <Button
            variant="filled"
            title="Kembali ke Detail Novel"
            icon="arrow_back"
            onPress={() => navigation.goBack()}
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
    gap: 8,
  },
  card: {
    width: '100%',
    padding: 16,
    gap: 12,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: 8,
  },
  infoText: {
    flex: 1,
  },
  actionColumn: {
    gap: 10,
    marginTop: 8,
  },
});
