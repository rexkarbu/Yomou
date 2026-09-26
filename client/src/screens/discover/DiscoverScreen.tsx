import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Pressable,
  Keyboard,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { Typography, Button, Icon, Surface } from '../../components/common';
import { NovelCard } from '../../components/novel/NovelCard';
import { LatestFeedItem } from '../../components/novel/LatestFeedItem';
import {
  PopularCarouselSkeleton,
  LatestFeedSkeleton,
} from '../../components/novel/FeedSkeleton';
import { getPopularNovels, getLatestNovels, searchNovels } from '../../services/api/novelApi';
import {
  deduplicateNovels,
  calculateNextPageParam,
  evaluateFeedEndReason,
  getFeedEndMessage,
  getSearchEndMessage,
} from '../../services/api/feedPagination';
import {
  resolveSearchUiState,
  SearchDebounceManager,
} from './searchState';
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

  // State pencarian
  const [rawInput, setRawInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Pengelola debounce berbasis kelas produksi
  const debounceManagerRef = useRef<SearchDebounceManager | null>(null);
  if (!debounceManagerRef.current) {
    debounceManagerRef.current = new SearchDebounceManager(400, (committed) => {
      setDebouncedQuery(committed);
    });
  }

  // Bersihkan timer saat unmount
  useEffect(() => {
    return () => {
      debounceManagerRef.current?.destroy();
    };
  }, []);

  // Pantau kemunculan keyboard virtual
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Perilaku tombol hardware Back Android:
  // 1. Back menutup keyboard terlebih dahulu jika terbuka.
  // 2. Saat keyboard sudah tertutup dan Search aktif, Back membersihkan pencarian kembali ke Beranda.
  // 3. Setelah di Beranda, gunakan navigasi default (return false).
  // Handler hanya aktif saat layar Discover sedang fokus dan dibersihkan saat blur/unmount.
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (isKeyboardVisible) {
          Keyboard.dismiss();
          return true;
        }
        if (rawInput.trim().length > 0 || debouncedQuery.length > 0) {
          debounceManagerRef.current?.clear();
          setRawInput('');
          setDebouncedQuery('');
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => {
        subscription.remove();
      };
    }, [isKeyboardVisible, rawInput, debouncedQuery])
  );

  // Penanganan perubahan input teks pencarian
  const onInputChange = useCallback((text: string) => {
    setRawInput(text);
    debounceManagerRef.current?.setInput(text);
  }, []);

  // Tombol bersihkan ("X"): batalkan timer, reset query, pertahankan fokus input untuk mengetik ulang
  const onClearSearch = useCallback(() => {
    debounceManagerRef.current?.clear();
    setRawInput('');
    setDebouncedQuery('');
    inputRef.current?.focus();
  }, []);

  // Tombol "Kembali ke Beranda": menutup keyboard dan membersihkan pencarian
  const onReturnHome = useCallback(() => {
    Keyboard.dismiss();
    debounceManagerRef.current?.clear();
    setRawInput('');
    setDebouncedQuery('');
  }, []);

  // Penggantian tema tunggal yang menggilir Light -> Dark -> Sepia -> Light
  const cycleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'sepia' : 'light');
  }, [theme, setTheme]);

  const currentThemeLabel = theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'Sepia';
  const nextThemeLabel = theme === 'light' ? 'Dark' : theme === 'dark' ? 'Sepia' : 'Light';

  // Mode pencarian aktif jika input teks setelah di-trim tidak kosong
  const isSearchMode = rawInput.trim().length > 0;
  const isPendingDebounce = isSearchMode && rawInput.trim() !== debouncedQuery;

  // 1. Query Novel Populer (Horizontal Carousel) - Beranda
  const popularQuery = useQuery({
    queryKey: ['novels', 'popular'],
    queryFn: ({ signal }) => getPopularNovels({ signal }),
    retry: false,
    staleTime: 1000 * 60 * 15, // 15 menit
  });

  // 2. Query Pembaruan Terbaru (Infinite Scroll Vertikal) - Beranda
  const latestQuery = useInfiniteQuery({
    queryKey: ['novels', 'latest'],
    queryFn: ({ pageParam = 1, signal }) => getLatestNovels(pageParam, { signal }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => calculateNextPageParam(lastPage, allPages),
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 menit
  });

  // 3. Query Pencarian Novel (Infinite Scroll Vertikal)
  // Aturan Query selama debounce:
  // enabled: isSearchMode && !isPendingDebounce && debouncedQuery.length > 0
  // Query key dan parameter request menggunakan kata kunci trim yang identik (debouncedQuery).
  const searchQuery = useInfiniteQuery({
    queryKey: ['novels', 'search', debouncedQuery],
    queryFn: ({ pageParam = 1, signal }) => searchNovels(debouncedQuery, pageParam, { signal }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => calculateNextPageParam(lastPage, allPages),
    enabled: isSearchMode && !isPendingDebounce && debouncedQuery.length > 0,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 menit
  });

  // Deduplikasi data pembaruan terbaru berbasis novel.id
  const latestNovels = useMemo(() => {
    if (!latestQuery.data?.pages) return [];
    return deduplicateNovels(latestQuery.data.pages);
  }, [latestQuery.data?.pages]);

  // Deduplikasi data hasil pencarian berbasis novel.id
  const searchNovelsList = useMemo(() => {
    if (!searchQuery.data?.pages) return [];
    return deduplicateNovels(searchQuery.data.pages);
  }, [searchQuery.data?.pages]);

  // Evaluasi penghentian feed Beranda
  const feedEndReason = useMemo(() => {
    return evaluateFeedEndReason(latestQuery.data?.pages);
  }, [latestQuery.data?.pages]);

  const feedEndMessage = useMemo(() => {
    return getFeedEndMessage(feedEndReason);
  }, [feedEndReason]);

  // Evaluasi penghentian feed Pencarian
  const searchEndReason = useMemo(() => {
    return evaluateFeedEndReason(searchQuery.data?.pages);
  }, [searchQuery.data?.pages]);

  const searchEndMessage = useMemo(() => {
    return getSearchEndMessage(searchEndReason);
  }, [searchEndReason]);

  // Status tampilan pencarian melalui fungsi produksi deterministik
  const searchUiState = useMemo(() => {
    return resolveSearchUiState({
      rawInput,
      debouncedQuery,
      isLoading: searchQuery.isLoading,
      isSuccess: searchQuery.isSuccess,
      isError: searchQuery.isError,
      isRefetchError: searchQuery.isRefetchError,
      error: searchQuery.error,
      items: searchNovelsList,
    });
  }, [
    rawInput,
    debouncedQuery,
    searchQuery.isLoading,
    searchQuery.isSuccess,
    searchQuery.isError,
    searchQuery.isRefetchError,
    searchQuery.error,
    searchNovelsList,
  ]);

  const onNovelPress = useCallback(
    (novelId: string) => {
      navigation.navigate('NovelDetail', { novelId });
    },
    [navigation]
  );

  // Pull-to-refresh untuk Beranda Discover
  const onRefresh = useCallback(async () => {
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

  // Pull-to-refresh / retry refresh untuk Pencarian dengan guard request berjalan
  const onSearchRefresh = useCallback(async () => {
    if (
      isRefreshing ||
      searchQuery.isFetching ||
      searchQuery.isFetchingNextPage
    ) {
      return;
    }

    setIsRefreshing(true);
    try {
      await searchQuery.refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, searchQuery]);

  // Guard pemanggilan fetchNextPage pada Beranda
  const onEndReached = useCallback(() => {
    if (
      isRefreshing ||
      latestQuery.isFetching ||
      latestQuery.isFetchingNextPage ||
      latestQuery.isFetchNextPageError ||
      !latestQuery.hasNextPage
    ) {
      return;
    }
    latestQuery.fetchNextPage();
  }, [isRefreshing, latestQuery]);

  // Tombol retry pagination Beranda
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

  // Guard pemanggilan fetchNextPage pada Pencarian
  const onSearchEndReached = useCallback(() => {
    if (
      isRefreshing ||
      searchQuery.isFetching ||
      searchQuery.isFetchingNextPage ||
      searchQuery.isFetchNextPageError || // Hentikan auto-fetch saat pagination gagal sampai retry ditekan
      !searchQuery.hasNextPage
    ) {
      return;
    }
    searchQuery.fetchNextPage();
  }, [isRefreshing, searchQuery]);

  // Tombol retry pagination Pencarian
  const onRetrySearchNextPage = useCallback(() => {
    if (
      isRefreshing ||
      searchQuery.isFetching ||
      searchQuery.isFetchingNextPage
    ) {
      return;
    }
    searchQuery.fetchNextPage();
  }, [isRefreshing, searchQuery]);

  // Evaluasi offline total Beranda HANYA jika tidak ada data sama sekali
  const hasPopularData = Boolean(popularQuery.data && popularQuery.data.length > 0);
  const hasLatestData = latestNovels.length > 0;
  const hasNoData = !hasPopularData && !hasLatestData;

  const isTotalError = popularQuery.isError && latestQuery.isError;
  const isNetworkFailure =
    (popularQuery.error instanceof AppError && popularQuery.error.code === 'NETWORK_FAILURE') ||
    (latestQuery.error instanceof AppError && latestQuery.error.code === 'NETWORK_FAILURE');

  // Elemen Header List Beranda
  const listHeaderElement = useMemo(() => {
    return (
      <View style={styles.headerContainer}>
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

        <View style={[styles.sectionDivider, { backgroundColor: colors.borderSubtle }]} />

        <View style={styles.sectionHeaderRow}>
          <Typography variant="title" color="primary">
            Pembaruan Terbaru
          </Typography>
        </View>

        {latestQuery.isLoading && !hasLatestData && <LatestFeedSkeleton />}

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

  // Elemen Footer List Beranda
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

  // Elemen Empty List Beranda
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

  // Elemen Header List Hasil Pencarian: "{N} novel dimuat" & banner refetch galat
  const searchListHeaderElement = useMemo(() => {
    const refetchError =
      searchUiState.type === 'SUCCESS' ? searchUiState.refetchError : null;

    return (
      <View style={styles.searchHeaderContainer}>
        {refetchError && (
          <View
            style={[
              styles.smallBanner,
              { backgroundColor: colors.surfaceRaised, borderColor: colors.statusError },
            ]}
            accessibilityRole="alert"
          >
            <Icon name="info" size={16} color={colors.statusError} accessibilityLabel="Pemberitahuan galat" />
            <Typography variant="caption" color="secondary" style={styles.bannerText}>
              Gagal menyegarkan: {refetchError}. Menampilkan hasil sebelumnya.
            </Typography>
            <Button
              variant="outlined"
              title="Coba Lagi"
              onPress={onSearchRefresh}
              style={styles.retryButtonSmall}
            />
          </View>
        )}
        <View style={styles.searchCountContainer}>
          <Typography variant="label" color="secondary">
            {searchNovelsList.length} novel dimuat
          </Typography>
        </View>
      </View>
    );
  }, [
    colors.statusError,
    colors.surfaceRaised,
    onSearchRefresh,
    searchNovelsList.length,
    searchUiState,
  ]);

  // Elemen Footer List Hasil Pencarian
  const searchListFooterElement = useMemo(() => {
    if (searchQuery.isFetchingNextPage) {
      return (
        <View style={styles.footerLoader} accessibilityRole="progressbar">
          <ActivityIndicator size="small" color={colors.accentPrimary} />
          <Typography variant="caption" color="secondary" style={styles.footerText}>
            Memuat halaman berikutnya...
          </Typography>
        </View>
      );
    }

    if (searchQuery.isFetchNextPageError) {
      return (
        <View style={styles.footerErrorContainer}>
          <Typography variant="caption" color="error">
            Gagal memuat halaman berikutnya.
          </Typography>
          <Button
            variant="outlined"
            title="Coba Lagi"
            onPress={onRetrySearchNextPage}
            style={styles.retryButtonSmall}
          />
        </View>
      );
    }

    if (!searchQuery.hasNextPage && searchNovelsList.length > 0 && searchEndMessage) {
      return (
        <View style={styles.footerEndContainer}>
          <Typography variant="caption" color="secondary">
            {searchEndMessage}
          </Typography>
        </View>
      );
    }

    return null;
  }, [
    colors.accentPrimary,
    searchEndMessage,
    searchNovelsList.length,
    searchQuery.hasNextPage,
    searchQuery.isFetchNextPageError,
    searchQuery.isFetchingNextPage,
    onRetrySearchNextPage,
  ]);

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
      {/* Top App Bar Terintegrasi Selalu Tersedia (Bebas Dipakai Walaupun Feed Beranda Gagal) */}
      <View
        style={[
          styles.topBar,
          {
            backgroundColor: colors.surfaceRaised,
            borderBottomColor: colors.borderSubtle,
          },
        ]}
      >
        {/* Bilah Input Pencarian */}
        <View
          style={[
            styles.searchBarContainer,
            {
              backgroundColor: colors.surfaceBackground,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <Icon
            name="search"
            size={24}
            color={colors.textSecondary}
            accessibilityLabel="Pencarian"
          />
          <TextInput
            ref={inputRef}
            value={rawInput}
            onChangeText={onInputChange}
            placeholder="Cari judul novel..."
            placeholderTextColor={colors.textSecondary}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            accessibilityLabel="Bilah pencarian novel"
            style={[styles.searchInput, { color: colors.textPrimary }]}
          />
          {rawInput.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Bersihkan pencarian"
              onPress={onClearSearch}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.clearButton}
            >
              <Icon name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>

        {/* Tombol Tema Tunggal Menggilir Light/Dark/Sepia (Touch Target >= 48dp) */}
        <Button
          variant="outlined"
          icon="palette"
          onPress={cycleTheme}
          accessibilityLabel={`Ganti tema, saat ini ${currentThemeLabel}, beralih ke ${nextThemeLabel}`}
          style={styles.themeCycleButton}
        />
      </View>

      {/* Konten Berdasarkan Status UI */}
      {!isSearchMode ? (
        hasNoData && isTotalError && isNetworkFailure ? (
          /* Kegagalan kedua feed Beranda tanpa data sesi (Dibatasi pada area konten saja, Top Bar tetap utuh) */
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
        ) : (
          /* Mode Beranda Normal (Novel Populer + Pembaruan Terbaru) */
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
        )
      ) : searchUiState.type === 'DEBOUNCING' ? (
        /* Status Menunggu Debounce: Tampilkan pesan tenang, sembunyikan hasil lama */
        <View style={styles.stateCenterContainer}>
          <ActivityIndicator size="small" color={colors.accentPrimary} />
          <Typography variant="body" color="secondary" style={styles.statusText}>
            Menyiapkan pencarian untuk "{searchUiState.query}"...
          </Typography>
        </View>
      ) : searchUiState.type === 'LOADING' ? (
        /* Loading Awal Pencarian */
        <View style={styles.searchSkeletonContainer}>
          <LatestFeedSkeleton />
        </View>
      ) : searchUiState.type === 'ERROR' ? (
        /* Error Pencarian (Kecuali jika dibatalkan secara bersih) */
        searchUiState.isCancelled ? null : (
          <View style={styles.stateCenterContainer}>
            <Surface variant="card" style={styles.inlineErrorCard}>
              <Icon name="error" size={24} color={colors.statusError} accessibilityLabel="Galat pencarian" />
              <Typography variant="body" color="secondary" style={styles.errorText}>
                {searchUiState.message}
              </Typography>
              <Button
                variant="filled"
                title="Coba Lagi"
                onPress={() => searchQuery.refetch()}
                style={styles.retryButton}
              />
            </Surface>
          </View>
        )
      ) : searchUiState.type === 'EMPTY' ? (
        /* Hasil Kosong HANYA setelah respons sukses halaman pertama [] */
        <View style={styles.emptyContainer}>
          <Icon name="menu_book" size={48} color={colors.textSecondary} accessibilityLabel="Tidak ada hasil" />
          <Typography variant="title" color="primary" style={styles.emptyTitle}>
            Tidak menemukan novel untuk "{searchUiState.query}"
          </Typography>
          <Typography variant="body" color="secondary" style={styles.emptyText}>
            Coba gunakan kata kunci lain atau periksa ejaan judul novel.
          </Typography>
          <Button
            variant="outlined"
            title="Kembali ke Beranda"
            onPress={onReturnHome}
            style={styles.returnHomeButton}
          />
        </View>
      ) : (
        /* Hasil Ditemukan: FlatList vertikal hasil pencarian */
        <FlatList
          data={searchNovelsList}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <LatestFeedItem novel={item} onPress={onNovelPress} />
          )}
          ListHeaderComponent={searchListHeaderElement}
          ListFooterComponent={searchListFooterElement}
          onEndReached={onSearchEndReached}
          onEndReachedThreshold={0.5}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onSearchRefresh}
              colors={[colors.accentPrimary]}
              tintColor={colors.accentPrimary}
            />
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.space3,
    paddingVertical: SPACING.space1,
    borderBottomWidth: 1,
    gap: SPACING.space2,
  },
  searchBarContainer: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.medium,
    borderWidth: 1,
    paddingHorizontal: SPACING.space2,
  },
  searchInput: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: SPACING.space2,
    paddingVertical: SPACING.space1,
    fontSize: 15,
  },
  clearButton: {
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeCycleButton: {
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  searchHeaderContainer: {
    paddingBottom: SPACING.space1,
  },
  searchCountContainer: {
    paddingHorizontal: SPACING.space4,
    paddingVertical: SPACING.space2,
  },
  stateCenterContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.space4,
    gap: SPACING.space2,
  },
  statusText: {
    textAlign: 'center',
    marginTop: SPACING.space2,
  },
  searchSkeletonContainer: {
    paddingTop: SPACING.space3,
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.space8,
    paddingHorizontal: SPACING.space6,
    gap: SPACING.space2,
  },
  emptyTitle: {
    textAlign: 'center',
    marginTop: SPACING.space2,
  },
  emptyText: {
    textAlign: 'center',
    paddingHorizontal: SPACING.space4,
    paddingVertical: SPACING.space1,
  },
  returnHomeButton: {
    marginTop: SPACING.space3,
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
