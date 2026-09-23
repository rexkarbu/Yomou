import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { Typography, Button, Surface, Icon } from '../../components/common';
import type { MainTabScreenProps } from '../../navigation/types';

export const DiscoverPlaceholderScreen: React.FC<MainTabScreenProps<'Discover'>> = ({
  navigation,
}) => {
  const { colors, theme, setTheme } = useTheme();
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
        <Icon name="auto_stories" size={28} color={colors.accentPrimary} accessibilityLabel="Discover icon" />
        <Typography variant="headline" color="primary">
          Discover
        </Typography>
      </View>
      <Typography variant="body" color="secondary" style={styles.subtitle}>
        Mode Aktif: {theme.toUpperCase()}
      </Typography>

      {/* Theme Switcher */}
      <View style={styles.themeRow}>
        <Button
          variant={theme === 'light' ? 'filled' : 'outlined'}
          title="Light"
          onPress={() => setTheme('light')}
        />
        <Button
          variant={theme === 'dark' ? 'filled' : 'outlined'}
          title="Dark"
          onPress={() => setTheme('dark')}
        />
        <Button
          variant={theme === 'sepia' ? 'filled' : 'outlined'}
          title="Sepia"
          onPress={() => setTheme('sepia')}
        />
      </View>

      {/* Stack Navigation Test Card */}
      <Surface variant="card" style={styles.card}>
        <Typography variant="title" color="primary">
          Uji Navigasi Stack
        </Typography>
        <Typography variant="body" color="secondary">
          Pilih novel di bawah untuk menguji navigasi ke NovelDetail dan Reader (bottom bar akan tersembunyi pada keduanya):
        </Typography>

        <View style={styles.actionColumn}>
          <Button
            variant="filled"
            title="Detail: Kimi wa Boku no Koukai"
            onPress={() =>
              navigation.navigate('NovelDetail', {
                novelId: 'kimi-wa-boku-no-koukai-ln',
              })
            }
          />
          <Button
            variant="outlined"
            title="Detail: Battle Through the Heavens (BTTH)"
            onPress={() =>
              navigation.navigate('NovelDetail', {
                novelId: 'btth',
              })
            }
          />
          <Button
            variant="outlined"
            title="Buka Download Manager"
            icon="download"
            onPress={() => navigation.navigate('DownloadManager')}
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
  subtitle: {
    marginBottom: 4,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  card: {
    width: '100%',
    padding: 16,
    gap: 12,
  },
  actionColumn: {
    gap: 10,
    marginTop: 8,
  },
});
