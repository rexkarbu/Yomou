import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { initStorage } from './src/services/storage';

export default function App() {
  const [initError, setInitError] = useState<string | null>(null);

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
    <View style={styles.container}>
      <Text>{initError ? `Storage Init Error: ${initError}` : 'Yomou'}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
