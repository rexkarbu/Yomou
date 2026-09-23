import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
  SafeAreaInsetsContext,
} from 'react-native-safe-area-context';
import { NavigationContainer, Theme } from '@react-navigation/native';
import { initStorage } from './src/services/storage';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { Typography, Icon } from './src/components/common';

function NavigationRoot() {
  const [initError, setInitError] = useState<string | null>(null);
  const { colors, theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

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

  // Map active Yomou tri-theme to React Navigation Theme object
  const navTheme = useMemo<Theme>(
    () => ({
      dark: isDark,
      colors: {
        primary: colors.accentPrimary,
        background: colors.surfaceBackground,
        card: colors.surfaceRaised,
        text: colors.textPrimary,
        border: colors.borderSubtle,
        notification: colors.accentPrimary,
      },
      fonts: {
        regular: { fontFamily: 'sans-serif', fontWeight: '400' },
        medium: { fontFamily: 'sans-serif-medium', fontWeight: '500' },
        bold: { fontFamily: 'sans-serif', fontWeight: '700' },
        heavy: { fontFamily: 'sans-serif', fontWeight: '900' },
      },
    }),
    [colors, isDark]
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.surfaceBackground }]}>
      {initError && (
        <View
          className="items-center"
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[
            styles.errorBanner,
            {
              backgroundColor: colors.surfaceRaised,
              borderBottomColor: colors.statusError,
              paddingTop: insets.top + 8,
            },
          ]}
        >
          <Icon name="error" size={20} color={colors.statusError} accessibilityLabel="Peringatan galat" />
          <Typography variant="caption" color="error" style={styles.errorText}>
            Gagal menginisialisasi penyimpanan lokal. Fitur luring mungkin tidak tersedia.
          </Typography>
        </View>
      )}

      {/* When banner occupies top safe area, set top inset to 0 for navigator content to avoid double inset */}
      <SafeAreaInsetsContext.Provider
        value={initError ? { ...insets, top: 0 } : insets}
      >
        <NavigationContainer theme={navTheme}>
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaInsetsContext.Provider>

      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <NavigationRoot />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  errorText: {
    flex: 1,
  },
});
