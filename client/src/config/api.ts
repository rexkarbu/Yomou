export interface ApiConfigResult {
  readonly baseUrl: string | null;
  readonly error: string | null;
}

/**
 * Mendeteksi Platform.OS secara aman baik pada runtime React Native
 * maupun lingkungan pengujian Node.js tanpa memicu syntax error Flow.
 */
export function getPlatformOS(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const rn = require('react-native') as { Platform?: { OS?: string } };
    if (rn?.Platform?.OS) {
      return rn.Platform.OS;
    }
  } catch {
    // Lingkungan non-React Native (seperti runner pengujian Node)
  }
  return typeof process !== 'undefined' && process.platform === 'android' ? 'android' : 'other';
}

/**
 * Memvalidasi apakah string merupakan URL valid dengan protokol http: atau https:
 */
export function validateHttpUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Menyelesaikan konfigurasi base URL API backend.
 *
 * Kebijakan Resolusi:
 * 1. Jika env EXPO_PUBLIC_API_URL diisi:
 *    - Wajib berupa URL http:// atau https:// valid.
 *    - Jika format tidak valid, menghasilkan galat konfigurasi eksplisit (bukan crash).
 * 2. Pada lingkungan produksi (!__DEV__):
 *    - DILARANG fallback ke localhost. Ketiadaan EXPO_PUBLIC_API_URL menghasilkan galat konfigurasi.
 * 3. Pada lingkungan pengembangan (__DEV__):
 *    - Platform.OS === 'android' TIDAK membedakan emulator dari ponsel fisik.
 *      Nilai 'http://10.0.2.2:3000' adalah default khusus Android Emulator resmi (bridge router host).
 *    - Untuk pengujian pada perangkat Android fisik melalui Wi-Fi, tentukan LAN IP PC melalui
 *      environment Expo: EXPO_PUBLIC_API_URL=http://<LAN_IP>:3000
 *    - Untuk pengujian melalui kabel USB, gunakan port forwarding adb:
 *      `adb reverse tcp:3000 tcp:3000` dengan EXPO_PUBLIC_API_URL=http://localhost:3000
 *    - Kebutuhan Cleartext HTTP: Android 9+ (API level 28+) memblokir traffic HTTP tanpa enkripsi secara default.
 *      Pada development Expo Go / debug builds, cleartext diizinkan secara bawaan untuk loopback & LAN.
 */
export function resolveApiConfig(
  envUrl?: string,
  isDev: boolean = typeof __DEV__ !== 'undefined' ? __DEV__ : true,
  platform: string = getPlatformOS()
): ApiConfigResult {
  const trimmed = envUrl?.trim();
  if (trimmed) {
    if (!validateHttpUrl(trimmed)) {
      return {
        baseUrl: null,
        error: `EXPO_PUBLIC_API_URL tidak valid: "${trimmed}". URL harus menggunakan protokol http:// atau https://.`,
      };
    }
    // Hapus trailing slash agar format path seragam
    return { baseUrl: trimmed.replace(/\/+$/, ''), error: null };
  }

  // Jika envUrl tidak disediakan:
  if (!isDev) {
    return {
      baseUrl: null,
      error: 'EXPO_PUBLIC_API_URL belum dikonfigurasi untuk lingkungan produksi.',
    };
  }

  // Development default untuk Android Emulator
  if (platform === 'android') {
    return {
      baseUrl: 'http://10.0.2.2:3000',
      error: null,
    };
  }

  // Development default untuk iOS Simulator / Web
  return {
    baseUrl: 'http://localhost:3000',
    error: null,
  };
}

export const API_CONFIG = resolveApiConfig(process.env.EXPO_PUBLIC_API_URL);
