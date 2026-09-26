import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useTheme } from '../../context/ThemeContext';
import { Typography, Button, Icon, Surface } from '../../components/common';
import { NovelCard } from '../../components/novel/NovelCard';
import { LatestFeedItem } from '../../components/novel/LatestFeedItem';
import {
  PopularCarouselSkeleton,
  LatestFeedSkeleton,
} from '../../components/novel/FeedSkeleton';
import { getPopularNovels, getLatestNovels } from '../../services/api/novelApi';
import {
  deduplicateNovels,
  calculateNextPageParam,
  evaluateFeedEndReason,
  getFeedEndMessage,
} from '../../services/api/feedPagination';
import { AppError } from '../../services/api/apiClient';
import { SPACING, RADIUS } from '../../styles/theme';
import type { MainTabScreenProps } from '../../navigation/types';

export const DiscoverScreen: React.FC<MainTabScreenProps<'Discover'>> = ({
  navigation,
}) => {
  const { colors, theme, setTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  // 1. Query Novel Populer (Horizontal Carousel) - Retry dinonaktifkan
  const popularQuery = useQuery({
    queryKey: ['novels', 'popular'],
    queryFn: ({ signal }) => getPopularNovels({ signal }),
    retry: false,
    staleTime: 1000 * 60 * 15, // 15 menit
  });

  // 2. Query Pembaruan Terbaru (Infinite Scroll Vertikal) - Retry dinonaktifkan
  const latestQuery = useInfiniteQuery({
    queryKey: ['novels', 'latest'],
    queryFn: ({ pageParam = 1, signal }) => getLatestNovels(pageParam, { signal }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => calculateNextPageParam(lastPage, allPages),
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 menit
  });

  // 3. Deduplikasi data pembaruan terbaru berbasis novel.id menggunakan fungsi produksi bersama
  const latestNovels = useMemo(() => {
    if (!latestQuery.data?.pages) return [];
    return deduplicateNovels(latestQuery.data.pages);
  }, [latestQuery.data?.pages]);

  // Evaluasi alasan penghentian feed paginasi
  const feedEndReason = useMemo(() => {
    return evaluateFeedEndReason(latestQuery.data?.pages);
  }, [latestQuery.data?.pages]);

  const feedEndMessage = useMemo(() => {
    return getFeedEndMessage(feedEndReason);
  }, [feedEndReason]);

  const onNovelPress = useCallback(
    (novelId: string) => {
      navigation.navigate('NovelDetail', { novelId });
    },
    [navigation]
  );

  // 4. Pull-to-refresh dengan guard concurrency, pengecekan hasil, dan pelaporan spesifik
  const onRefresh = useCallback(async () => {
    // Cegah tabrakan: jangan refresh saat fetchNextPage sedang berjalan
    if (isRefreshing || latestQuery.isFetchingNextPage) {
      return;
    }

    setIsRefreshing(true);
    setRefreshError(null);

    try {
      const [popRes, latRes] = await Promise.all([
        popularQuery.refetch(),
        latestQuery.refetch(),
      ]);

      const isPopCancelled =
        popRes.error instanceof AppError && popRes.error.code === 'REQUEST_CANCELLED';
      const isLatCancelled =
        latRes.error instanceof AppError && latRes.error.code === 'REQUEST_CANCELLED';

      const popFailed = popRes.isError && !isPopCancelled;
      const latFailed = latRes.isError && !isLatCancelled;

      if (popFailed && latFailed) {
        setRefreshError('Gagal menyegarkan novel populer dan pembaruan terbaru.');
      } else if (popFailed) {
        setRefreshError('Gagal menyegarkan novel populer.');
      } else if (latFailed) {
        setRefreshError('Gagal menyegarkan pembaruan terbaru.');
      } else {
        setRefreshError(null);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, latestQuery, popularQuery]);

  // 5. Guard pemanggilan fetchNextPage saat request lain (termasuk refresh dan error page) berjalan
  const onEndReached = useCallback(() => {
    if (
      isRefreshing ||
      latestQuery.isFetching ||
      latestQuery.isFetchingNextPage ||
      latestQuery.isFetchNextPageError || // Hentikan pemicu otomatis setelah fetch gagal sampai Coba Lagi ditekan
      !latestQuery.hasNextPage
    ) {
      return;
    }
    latestQuery.fetchNextPage();
  }, [isRefreshing, latestQuery]);

  // Tombol retry pagination memakai guard fetch yang sama persis
  const onRetryNextPage = useCallback(() => {
    if (
      isRefreshing ||
      latestQuery.isFetching ||
      latestQuery.isFetchingNextPage
    ) {
      return;
    }
    latestQuery.fetchNextPage();
  }, [isRefreshing, latestQuery]);

  // Evaluasi kondisi offline total HANYA jika TIDAK ADA data sama sekali
  const hasPopularData = Boolean(popularQuery.data && popularQuery.data.length > 0);
  const hasLatestData = latestNovels.length > 0;
  const hasNoData = !hasPopularData && !hasLatestData;

  const isTotalError = popularQuery.isError && latestQuery.isError;
  const isNetworkFailure =
    (popularQuery.error instanceof AppError && popularQuery.error.code === 'NETWORK_FAILURE') ||
    (latestQuery.error instanceof AppError && latestQuery.error.code === 'NETWORK_FAILURE');

  // Elemen Header List (Memoized Element untuk mencegah remount carousel pada FlatList induk)
  const listHeaderElement = useMemo(() => {
    return (
      <View style={styles.headerContainer}>
        {/* Banner Galat Refresh Ringkas (Data lama tetap tampil di bawahnya) */}
        {refreshError && (
          <View
            style={[
              styles.smallBanner,
              { backgroundColor: colors.surfaceRaised, borderColor: colors.statusError },
            ]}
            accessibilityRole="alert"
          >
            <Icon name="info" size={16} color={colors.statusError} accessibilityLabel="Pemberitahuan galat" />
            <Typography variant="caption" color="secondary" style={styles.bannerText}>
              Gagal menyegarkan: {refreshError}. Menampilkan data sesi sebelumnya.
            </Typography>
          </View>
        )}

        {/* Seksi Horizontal: Novel Populer */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Typography variant="title" color="primary">
              Novel Populer
            </Typography>
          </View>

          {popularQuery.isLoading && !hasPopularData ? (
            <PopularCarouselSkeleton />
          ) : popularQuery.isError && !hasPopularData ? (
            <Surface variant="card" style={styles.inlineErrorCard}>
              <Icon name="error" size={20} color={colors.statusError} accessibilityLabel="Galat novel populer" />
              <Typography variant="caption" color="secondary" style={styles.errorText}>
                {popularQuery.error instanceof AppError
                  ? popularQuery.error.message
                  : 'Gagal memuat novel populer.'}
              </Typography>
              <Button
                variant="filled"
                title="Coba Lagi"
                onPress={() => popularQuery.refetch()}
                style={styles.retryButtonSmall}
              />
            </Surface>
          ) : !hasPopularData && !popularQuery.isLoading ? (
            <Typography variant="body" color="secondary" style={styles.emptyText}>
              Tidak ada novel populer saat ini.
            </Typography>
          ) : (
            <FlatList
              horizontal
              data={popularQuery.data}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <NovelCard novel={item} onPress={onNovelPress} />}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.popularCarouselContent}
            />
          )}
        </View>

        {/* Garis Pemisah Antar Seksi */}
        <View style={[styles.sectionDivider, { backgroundColor: colors.borderSubtle }]} />

        {/* Header Seksi Pembaruan Terbaru */}
        <View style={styles.sectionHeaderRow}>
          <Typography variant="title" color="primary">
            Pembaruan Terbaru
          </Typography>
        </View>

        {/* Skeleton saat awal memuat Pembaruan Terbaru */}
        {latestQuery.isLoading && !hasLatestData && <LatestFeedSkeleton />}

        {/* Inline Error saat awal memuat Pembaruan Terbaru gagal (tanpa data sebelumnya) */}
        {latestQuery.isError && !hasLatestData && (
          <Surface variant="card" style={styles.inlineErrorCard}>
            <Icon name="error" size={24} color={colors.statusError} accessibilityLabel="Galat pembaruan terbaru" />
            <Typography variant="body" color="secondary" style={styles.errorText}>
              {latestQuery.error instanceof AppError
                ? latestQuery.error.message
                : 'Gagal memuat pembaruan terbaru.'}
            </Typography>
            <Button
              variant="filled"
              title="Coba Lagi"
              onPress={() => latestQuery.refetch()}
              style={styles.retryButton}
            />
          </Surface>
        )}
      </View>
    );
  }, [
    colors,
    hasPopularData,
    hasLatestData,
    latestQuery.isLoading,
    latestQuery.isError,
    latestQuery.error,
    latestQuery.refetch,
    onNovelPress,
    popularQuery.data,
    popularQuery.error,
    popularQuery.isError,
    popularQuery.isLoading,
    popularQuery.refetch,
    refreshError,
  ]);

  // Elemen Footer List (Memoized Element)
  const listFooterElement = useMemo(() => {
    if (latestQuery.isFetchingNextPage) {
      return (
        <View style={styles.footerLoader} accessibilityRole="progressbar">
          <ActivityIndicator size="small" color={colors.accentPrimary} />
          <Typography variant="caption" color="secondary" style={styles.footerText}>
            Memuat halaman berikutnya...
          </Typography>
        </View>
      );
    }

    if (latestQuery.isFetchNextPageError) {
      return (
        <View style={styles.footerErrorContainer}>
          <Typography variant="caption" color="error">
            Gagal memuat halaman berikutnya.
          </Typography>
          <Button
            variant="outlined"
            title="Coba Lagi"
            onPress={onRetryNextPage}
            style={styles.retryButtonSmall}
          />
        </View>
      );
    }

    if (!latestQuery.hasNextPage && hasLatestData && feedEndMessage) {
      return (
        <View style={styles.footerEndContainer}>
          <Typography variant="caption" color="secondary">
            {feedEndMessage}
          </Typography>
        </View>
      );
    }

    return null;
  }, [
    colors.accentPrimary,
    feedEndMessage,
    hasLatestData,
    latestQuery.hasNextPage,
    latestQuery.isFetchNextPageError,
    latestQuery.isFetchingNextPage,
    onRetryNextPage,
  ]);

  // Elemen Empty List untuk Pembaruan Terbaru (Memoized Element)
  const listEmptyElement = useMemo(() => {
    if (latestQuery.isLoading || latestQuery.isError) return null;

    return (
      <View style={styles.emptyContainer}>
        <Icon name="menu_book" size={48} color={colors.textSecondary} accessibilityLabel="Belum ada pembaruan" />
        <Typography variant="body" color="secondary" style={styles.emptyText}>
          Belum ada pembaruan novel yang tersedia.
        </Typography>
      </View>
    );
  }, [colors.textSecondary, latestQuery.isError, latestQuery.isLoading]);

  // Jika kondisi error total pada awal buka tanpa data sesi dan gagal jaringan:
  if (hasNoData && isTotalError && isNetworkFailure) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.surfaceBackground,
            paddingTop: insets.top,
          },
        ]}
      >
        {/* Top App Bar 56dp */}
        <View
          style={[
            styles.topBar,
            {
              backgroundColor: colors.surfaceRaised,
              borderBottomColor: colors.borderSubtle,
            },
          ]}
        >
          <Typography variant="headline" color="primary">
            Discover
          </Typography>
        </View>

        <View style={styles.offlineStateContainer}>
          <Icon name="error" size={56} color={colors.textSecondary} accessibilityLabel="Tidak dapat menghubungi server" />
          <Typography variant="title" color="primary" style={styles.offlineTitle}>
            Tidak Dapat Menghubungi Server
          </Typography>
          <Typography variant="body" color="secondary" style={styles.offlineDesc}>
            Gagal menyambung ke server backend. Periksa koneksi internet atau buka Pustaka Anda untuk membaca novel lokal.
          </Typography>

          <View style={styles.offlineActionRow}>
            <Button
              variant="filled"
              title="Buka Pustaka"
              onPress={() => navigation.navigate('Library')}
              icon="library_books"
            />
            <Button
              variant="outlined"
              title="Coba Lagi"
              onPress={onRefresh}
              icon="refresh"
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceBackground,
          paddingTop: insets.top,
        },
      ]}
    >
      {/* Top App Bar Ringkas 56dp (Bebas dari mock search input) */}
      <View
        style={[
          styles.topBar,
          {
            backgroundColor: colors.surfaceRaised,
            borderBottomColor: colors.borderSubtle,
          },
        ]}
      >
        <Typography variant="headline" color="primary">
          Discover
        </Typography>

        {/* Theme Switcher Aksesibel untuk Pengujian Pairing */}
        <View style={styles.themeToggleGroup}>
          <Button
            variant={theme === 'light' ? 'filled' : 'outlined'}
            title="L"
            onPress={() => setTheme('light')}
            accessibilityLabel="Pilih tema Light"
            style={styles.themeButton}
          />
          <Button
            variant={theme === 'dark' ? 'filled' : 'outlined'}
            title="D"
            onPress={() => setTheme('dark')}
            accessibilityLabel="Pilih tema Dark"
            style={styles.themeButton}
          />
          <Button
            variant={theme === 'sepia' ? 'filled' : 'outlined'}
            title="S"
            onPress={() => setTheme('sepia')}
            accessibilityLabel="Pilih tema Sepia"
            style={styles.themeButton}
          />
        </View>
      </View>

      {/* Root Vertical FlatList Tunggal dengan Elemen Ter-render Stabil */}
      <FlatList
        data={latestNovels}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <LatestFeedItem novel={item} onPress={onNovelPress} />
        )}
        ListHeaderComponent={listHeaderElement}
        ListFooterComponent={listFooterElement}
        ListEmptyComponent={listEmptyElement}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[colors.accentPrimary]}
            tintColor={colors.accentPrimary}
          />
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.space4,
    borderBottomWidth: 1,
  },
  themeToggleGroup: {
    flexDirection: 'row',
    gap: SPACING.space1,
  },
  themeButton: {
    minWidth: 36,
    minHeight: 36,
    paddingHorizontal: 8,
  },
  headerContainer: {
    paddingBottom: SPACING.space2,
  },
  smallBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.space2,
    marginHorizontal: SPACING.space4,
    marginTop: SPACING.space2,
    borderRadius: RADIUS.small,
    borderWidth: 1,
    gap: SPACING.space2,
  },
  bannerText: {
    flex: 1,
  },
  sectionContainer: {
    marginTop: SPACING.space3,
  },
  sectionHeaderRow: {
    paddingHorizontal: SPACING.space4,
    paddingVertical: SPACING.space2,
  },
  popularCarouselContent: {
    paddingHorizontal: SPACING.space4,
    paddingVertical: SPACING.space1,
  },
  sectionDivider: {
    height: 1,
    marginVertical: SPACING.space3,
    marginHorizontal: SPACING.space4,
  },
  inlineErrorCard: {
    marginHorizontal: SPACING.space4,
    padding: SPACING.space3,
    alignItems: 'center',
    gap: SPACING.space2,
  },
  errorText: {
    textAlign: 'center',
  },
  retryButton: {
    marginTop: SPACING.space2,
  },
  retryButtonSmall: {
    marginTop: SPACING.space1,
    minHeight: 36,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.space8,
    gap: SPACING.space2,
  },
  emptyText: {
    textAlign: 'center',
    paddingHorizontal: SPACING.space4,
    paddingVertical: SPACING.space2,
  },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.space4,
    gap: SPACING.space2,
  },
  footerText: {
    marginLeft: SPACING.space2,
  },
  footerErrorContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.space4,
    gap: SPACING.space2,
  },
  footerEndContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.space6,
  },
  listContent: {
    flexGrow: 1,
  },
  offlineStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.space6,
    gap: SPACING.space3,
  },
  offlineTitle: {
    textAlign: 'center',
    marginTop: SPACING.space2,
  },
  offlineDesc: {
    textAlign: 'center',
    lineHeight: 22,
  },
  offlineActionRow: {
    flexDirection: 'row',
    gap: SPACING.space3,
    marginTop: SPACING.space4,
  },
});
