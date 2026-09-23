import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ScrollView } from 'react-native';
import { initStorage } from './src/services/storage';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { Typography, Button, Surface, Icon } from './src/components/common';

function MainApp() {
  const [initError, setInitError] = useState<string | null>(null);
  const { colors, theme, setTheme } = useTheme();

  useEffect(() => {
    let isMounted = true;
    initStorage().catch((err: unknown) => {
      if (isMounted) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('Storage startup initialization failed:', message);
        setInitError(message);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.surfaceBackground }]}
      contentContainerStyle={styles.container}
    >
      <View className="items-center" style={styles.headerRow}>
        <Icon name="palette" size={28} color={colors.accentPrimary} accessibilityLabel="Theme icon" />
        <Typography variant="headline" color="primary">
          Yomou Design System
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

      {/* Card Surface Preview */}
      <Surface variant="card" style={styles.card}>
        <Typography variant="title" color="primary">
          Komponen Primitif
        </Typography>
        <Typography variant="body" color="secondary">
          Fondasi desain tri-tema mematuhi token semantik dan checklist anti-pattern UI.
        </Typography>

        <View style={styles.buttonRow}>
          <Button variant="filled" title="Filled" icon="check" />
          <Button variant="outlined" title="Outlined" />
          <Button variant="text" title="Text" />
          <Button variant="outlined" icon="search" accessibilityLabel="Search" />
        </View>
      </Surface>

      {initError && (
        <Typography variant="caption" color="error" style={styles.error}>
          Storage Init Error: {initError}
        </Typography>
      )}

      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
    </ScrollView>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  container: {
    padding: 24,
    paddingTop: 64,
    alignItems: 'center',
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  subtitle: {
    marginBottom: 8,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  card: {
    width: '100%',
    padding: 16,
    gap: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  error: {
    marginTop: 16,
  },
});

