import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { Typography, Button, Surface, Icon } from '../../components/common';
import type { RootStackScreenProps } from '../../navigation/types';

export const DownloadManagerPlaceholderScreen: React.FC<
  RootStackScreenProps<'DownloadManager'>
> = ({ navigation }) => {
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
        <Button
          variant="text"
          icon="arrow_back"
          accessibilityLabel="Kembali ke layar sebelumnya"
          onPress={() => navigation.goBack()}
        />
        <Typography variant="headline" color="primary">
          Download Manager
        </Typography>
      </View>

      <Surface variant="card" style={styles.card}>
        <Typography variant="title" color="primary">
          Manajer Unduhan
        </Typography>
        <Typography variant="body" color="secondary">
          Placeholder antrean download untuk pengujian navigasi stack.
        </Typography>

        <View style={styles.actionColumn}>
          <Button
            variant="filled"
            title="Kembali ke Layar Utama"
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
  actionColumn: {
    marginTop: 8,
  },
});
