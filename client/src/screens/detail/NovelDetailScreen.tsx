import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Image,
  RefreshControl,
  TouchableOpacity,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../context/ThemeContext';
import { Typography, Button, Surface, Icon } from '../../components/common';
import { NovelDetailSkeleton } from './NovelDetailSkeleton';
import { getNovelDetail } from '../../services/api/novelApi';
import { getDatabase } from '../../services/storage/sqlite';
import {
  loadLocalNovelDetailSnapshot,
  syncNovelMetadata,
  toggleNovelBookmark,
  type LocalNovelDetailSnapshot,
} from '../../services/storage/novelDetailStorage';
import { resolveReadingTarget } from './chapterSelection';
import {
  applyOptimisticBookmarkToggle,
  applyBookmarkToggleSuccess,
  applyBookmarkToggleFailure,
} from './bookmarkState';
import { DetailLifecycleTracker } from './detailLifecycle';
import type { RootStackScreenProps } from '../../navigation/types';
import type { ChapterSummary, NovelDetail, NovelSummary } from '../../types/novel';
import { SPACING, RADIUS } from '../../styles/theme';

export const NovelDetailScreen: React.FC<RootStackScreenProps<'NovelDetail'>> = ({
  route,
  navigation,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const { novelId } = route.params;

  // Ambang batas reflow terukur per DetailSpec: lebar < 360dp atau fontScale >= 1.5
  const isReflowRequired = width < 360 || fontScale >= 1.5;

  // 1. State Storage Lokal
  const [storageStatus, setStorageStatus] = useState<'INITIALIZING' | 'READY' | 'UNAVAILABLE'>(
    'INITIALIZING'
  );
  const [localSnapshot, setLocalSnapshot] = useState<LocalNovelDetailSnapshot | null>(null);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [isSavingBookmark, setIsSavingBookmark] = useState<boolean>(false);
  const [bookmarkNotice, setBookmarkNotice] = useState<string | null>(null);

  // Lifecycle & concurrency tracker (non-reusable session tokens and sync guards)
  const lifecycle = useRef(new DetailLifecycleTracker()).current;
  const isMountedRef = useRef<boolean>(true);
  const isSavingBookmarkRef = useRef<boolean>(false);
  const isRefreshingRef = useRef<boolean>(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      lifecycle.invalidateSession();
    };
  }, [lifecycle]);

  // Reset state seketika saat prop novelId berganti
  useEffect(() => {
    lifecycle.startSession();
    isSavingBookmarkRef.current = false;
    isRefreshingRef.current = false;
    setStorageStatus('INITIALIZING');
    setLocalSnapshot(null);
    setIsBookmarked(false);
    setIsSavingBookmark(false);
    setIsRefreshing(false);
    setBookmarkNotice(null);
    setRefreshNotice(null);

    return () => {
      // Invalidate session saat novelId berganti atau unmount (mencegah balapan A -> B -> A)
      lifecycle.invalidateSession();
      isSavingBookmarkRef.current = false;
      isRefreshingRef.current = false;
    };
  }, [lifecycle, novelId]);

  // 2. State Tampilan (Ekspansi Sinopsis, Urutan Bab, dan Refresh)
  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState<boolean>(false);
  const [isAscending, setIsAscending] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);
  const [coverFailed, setCoverFailed] = useState<boolean>(false);

  // Inisialisasi & pembacaan storage lokal
  const reloadLocalData = useCallback(async () => {
    const token = lifecycle.startLocalRead();
    try {
      const db = await getDatabase();
      const snapshot = await loadLocalNovelDetailSnapshot(db, novelId);

      // Pastikan component masih mounted dan sesi/operasi lokal masih aktif (mencegah balapan A -> B -> A)
      if (!isMountedRef.current || !lifecycle.canApplyLocalReadResult(token)) {
        return;
      }

      setLocalSnapshot(snapshot);
      // Hasil reload lama TIDAK boleh menimpa mutasi bookmark lebih baru
      if (lifecycle.canApplyLocalReadBookmark(token.mutationVersionAtStart)) {
        if (snapshot) {
          setIsBookmarked(snapshot.isBookmarked);
        } else {
          setIsBookmarked(false);
        }
      }
      // Tetapkan READY HANYA setelah snapshot berhasil dibaca, termasuk hasil null
      setStorageStatus('READY');
    } catch (err) {
      if (isMountedRef.current && lifecycle.canApplyLocalReadResult(token)) {
        console.warn('Gagal membaca storage lokal detail novel:', err);
        setStorageStatus('UNAVAILABLE');
      }
    }
  }, [lifecycle, novelId]);

  useEffect(() => {
    reloadLocalData();
  }, [reloadLocalData]);

  // 3. Query Jaringan TanStack Query
  const detailQuery = useQuery({
    queryKey: ['novels', 'detail', novelId],
    queryFn: ({ signal }) => getNovelDetail(novelId, { signal }),
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 menit
  });

  // Sinkronisasi otomatis ke SQLite ketika data API sukses termuat
  useEffect(() => {
    if (detailQuery.data && storageStatus === 'READY') {
      const queryNovel = detailQuery.data;
      if (queryNovel.id !== novelId) {
        return;
      }

      let isEffectCancelled = false;
      const syncToken = lifecycle.startSync();

      (async () => {
        try {
          const db = await getDatabase();
          await syncNovelMetadata(db, queryNovel);

          if (isEffectCancelled || !isMountedRef.current || !lifecycle.canApplySyncResult(syncToken.sessionId, isEffectCancelled)) {
            return;
          }

          // Muat ulang snapshot lokal untuk memperbarui bab tersimpan
          const updated = await loadLocalNovelDetailSnapshot(db, novelId);
          if (isEffectCancelled || !isMountedRef.current || !lifecycle.canApplySyncResult(syncToken.sessionId, isEffectCancelled)) {
            return;
          }

          if (updated) {
            setLocalSnapshot(updated);
            // Pastikan reload background tidak menimpa state optimistik dengan status bookmark lama
            if (lifecycle.canApplySyncBookmark(syncToken.mutationVersionAtStart)) {
              setIsBookmarked(updated.isBookmarked);
            }
          }
        } catch (err) {
          // Kegagalan simpan lokal TIDAK BOLEH membatalkan atau merusak tampilan data API
          if (!isEffectCancelled && isMountedRef.current && lifecycle.canApplySyncResult(syncToken.sessionId, isEffectCancelled)) {
            console.warn('Gagal menyinkronkan metadata ke SQLite lokal:', err);
          }
        }
      })();

      return () => {
        isEffectCancelled = true;
      };
    }
  }, [detailQuery.data, lifecycle, novelId, storageStatus]);

  // 4. Resolusi Data Aktif (Jaringan vs Lokal Tersimpan)
  const isSourceFromLocal = !detailQuery.data && Boolean(localSnapshot);

  const activeNovel: NovelDetail | NovelSummary | null = useMemo(() => {
    if (detailQuery.data && detailQuery.data.id === novelId) {
      return detailQuery.data;
    }
    if (localSnapshot && localSnapshot.novel.id === novelId) {
      return localSnapshot.novel;
    }
    return null;
  }, [detailQuery.data, localSnapshot, novelId]);

  // Daftar bab sumber dalam urutan kronologis asli
  const sourceChapters: readonly ChapterSummary[] = useMemo(() => {
    if (detailQuery.data && detailQuery.data.id === novelId) {
      return detailQuery.data.chapters;
    }
    if (localSnapshot && localSnapshot.novel.id === novelId && localSnapshot.chapters) {
      return localSnapshot.chapters;
    }
    return [];
  }, [detailQuery.data, localSnapshot, novelId]);

  // Daftar bab tampilan (murni visual, tanpa mutasi sumber atau cache)
  const displayChapters = useMemo(() => {
    if (isAscending) {
      return sourceChapters;
    }
    return [...sourceChapters].reverse();
  }, [isAscending, sourceChapters]);

  // Bab riwayat terakhir dibaca
  const lastReadChapterId = localSnapshot?.lastReadChapterId ?? null;

  // Resolusi bab target membaca via helper fungsi produksi
  const readingTarget = useMemo(() => {
    return resolveReadingTarget(sourceChapters, lastReadChapterId);
  }, [sourceChapters, lastReadChapterId]);

  // 5. Handler Aksi Pengguna
  // Aksi 1: Mulai Baca / Lanjut Baca
  const onReadPress = useCallback(() => {
    if (!readingTarget.targetChapterId) {
      return;
    }

    navigation.navigate('Reader', {
      novelId,
      chapterId: readingTarget.targetChapterId,
    });
  }, [navigation, novelId, readingTarget.targetChapterId]);

  // Aksi 2: Toggle Bookmark dengan Penguncian Sinkron & Rollback Dua Arah
  const onBookmarkPress = useCallback(async () => {
    const hasNovel = Boolean(activeNovel && activeNovel.id === novelId);
    // Guard sinkron menggunakan isSavingBookmarkRef yang sudah tersedia sebelum memulai mutasi
    if (
      isSavingBookmarkRef.current ||
      !lifecycle.canStartBookmark(storageStatus, hasNovel)
    ) {
      return;
    }

    const bookmarkToken = lifecycle.startBookmark();
    if (!bookmarkToken) {
      return;
    }

    isSavingBookmarkRef.current = true;
    const previousState = isBookmarked;
    const { targetState, optimisticState } = applyOptimisticBookmarkToggle(previousState);

    // Pembaruan optimistik seketika
    setIsBookmarked(optimisticState.isBookmarked);
    setIsSavingBookmark(optimisticState.isSavingBookmark);
    setBookmarkNotice(optimisticState.bookmarkNotice);

    try {
      const db = await getDatabase();
      await toggleNovelBookmark(db, activeNovel!, targetState);

      if (!isMountedRef.current || !lifecycle.canApplyBookmarkResult(bookmarkToken)) {
        return;
      }

      const successState = applyBookmarkToggleSuccess(targetState);
      setIsSavingBookmark(successState.isSavingBookmark);

      // Perbarui snapshot lokal
      await reloadLocalData();
    } catch (err) {
      if (!isMountedRef.current || !lifecycle.canApplyBookmarkResult(bookmarkToken)) {
        return;
      }

      // Rollback dua arah jika penulisan SQLite gagal
      const failState = applyBookmarkToggleFailure(previousState, targetState);
      setIsBookmarked(failState.isBookmarked);
      setIsSavingBookmark(failState.isSavingBookmark);
      setBookmarkNotice(failState.bookmarkNotice);
    } finally {
      // Operasi sesi lama tidak boleh membuka lock operasi sesi baru:
      // Hanya buka lock jika sesi dan ID operasi masih aktif dan cocok
      if (isMountedRef.current) {
        const released = lifecycle.releaseBookmarkLock(bookmarkToken);
        if (released) {
          isSavingBookmarkRef.current = false;
          setIsSavingBookmark(false);
        }
      }
    }
  }, [activeNovel, isBookmarked, lifecycle, novelId, reloadLocalData, storageStatus]);

  // Aksi 3: Unduh Bab (Perilaku jujur selama milestone DL belum tiba)
  const onDownloadPress = useCallback(() => {
    if (sourceChapters.length === 0) {
      return;
    }

    Alert.alert(
      'Fitur Dalam Pengembangan',
      'Pengunduhan novel untuk dibaca secara offline belum tersedia pada rilis ini (dijadwalkan pada Milestone Unduhan). Anda dapat menyimpan novel ini ke Bookmark Pustaka.',
      [{ text: 'Mengerti', style: 'default' }]
    );
  }, [sourceChapters.length]);

  // Handler retry error awal yang ter-guard sinkron
  const onInitialRetry = useCallback(() => {
    if (isRefreshingRef.current || !lifecycle.canStartRefresh(detailQuery.isFetching)) {
      return;
    }
    detailQuery.refetch();
  }, [detailQuery, lifecycle]);

  // Aksi 4: Pull-to-Refresh dengan Guard Sinkron dan Pengabaian REQUEST_CANCELLED
  const onRefresh = useCallback(async () => {
    if (isRefreshingRef.current || !lifecycle.canStartRefresh(detailQuery.isFetching)) {
      return;
    }

    const refreshToken = lifecycle.startRefresh(detailQuery.isFetching);
    if (!refreshToken) {
      return;
    }

    isRefreshingRef.current = true;
    setIsRefreshing(true);
    setRefreshNotice(null);

    try {
      const res = await detailQuery.refetch();

      if (!isMountedRef.current || !lifecycle.canApplyRefreshResult(refreshToken)) {
        return;
      }

      if (res.isError) {
        const error = res.error;
        const isCancelled =
          (error as any)?.code === 'REQUEST_CANCELLED' ||
          (error as any)?.message === 'REQUEST_CANCELLED' ||
          (error as any)?.name === 'AbortError';
        if (!isCancelled) {
          setRefreshNotice('Gagal menyegarkan detail novel. Menampilkan data sebelumnya.');
        }
      }
    } catch (err: any) {
      if (!isMountedRef.current || !lifecycle.canApplyRefreshResult(refreshToken)) {
        return;
      }

      const isCancelled =
        err?.code === 'REQUEST_CANCELLED' ||
        err?.message === 'REQUEST_CANCELLED' ||
        err?.name === 'AbortError';
      if (!isCancelled) {
        setRefreshNotice('Gagal menyegarkan detail novel. Menampilkan data sebelumnya.');
      }
    } finally {
      // Operasi sesi lama tidak boleh membuka lock operasi sesi baru
      if (isMountedRef.current) {
        const released = lifecycle.releaseRefreshLock(refreshToken);
        if (released) {
          isRefreshingRef.current = false;
          setIsRefreshing(false);
        }
      }
    }
  }, [detailQuery, lifecycle]);

  // 6. Penanganan State Render (Loading / Error / Konten)
  if (detailQuery.isLoading && !activeNovel) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surfaceBackground, paddingTop: insets.top }]}>
        <View style={[styles.topBar, { borderBottomColor: colors.borderSubtle }]}>
          <Button
            variant="text"
            icon="arrow_back"
            accessibilityLabel="Kembali ke layar sebelumnya"
            onPress={() => navigation.goBack()}
            style={styles.iconButton}
          />
          <Typography variant="title" color="primary" numberOfLines={1} style={styles.topBarTitle}>
            Detail Novel
          </Typography>
        </View>
        <NovelDetailSkeleton />
      </View>
    );
  }

  if (detailQuery.isError && !activeNovel) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surfaceBackground, paddingTop: insets.top }]}>
        <View style={[styles.topBar, { borderBottomColor: colors.borderSubtle }]}>
          <Button
            variant="text"
            icon="arrow_back"
            accessibilityLabel="Kembali ke layar sebelumnya"
            onPress={() => navigation.goBack()}
            style={styles.iconButton}
          />
          <Typography variant="title" color="primary" numberOfLines={1} style={styles.topBarTitle}>
            Detail Novel
          </Typography>
        </View>
        <View style={styles.stateCenterContainer}>
          <Surface variant="card" style={styles.errorCard}>
            <Icon name="error" size={40} color={colors.statusError} accessibilityLabel="Galat memuat novel" />
            <Typography variant="title" color="primary" style={styles.errorTitle}>
              Gagal Memuat Detail Novel
            </Typography>
            <Typography variant="body" color="secondary" style={styles.errorDesc}>
              Tidak dapat menghubungi server. Periksa koneksi internet Anda atau coba lagi.
            </Typography>
            <Button
              variant="filled"
              title="Coba Lagi"
              onPress={onInitialRetry}
              style={styles.retryButton}
            />
          </Surface>
        </View>
      </View>
    );
  }

  if (!activeNovel) {
    return null;
  }

  // 7. ListHeaderComponent (Metadata Dua Kolom Reflowable, Sinopsis, Tiga Tombol, & Header Bab)
  const listHeaderElement = (
    <View style={styles.headerContainer}>
      {/* Banner kegagalan refresh atau notice data lokal */}
      {refreshNotice && (
        <View
          style={[styles.banner, { backgroundColor: colors.surfaceRaised, borderColor: colors.statusError }]}
          accessibilityRole="alert"
        >
          <Icon name="info" size={16} color={colors.statusError} accessibilityLabel="Pemberitahuan galat" />
          <Typography variant="caption" color="secondary" style={styles.bannerText}>
            {refreshNotice}
          </Typography>
          <Button
            variant="outlined"
            title="Coba Lagi"
            onPress={onRefresh}
            style={styles.retryButtonSmall}
          />
        </View>
      )}

      {isSourceFromLocal && detailQuery.isError && !refreshNotice && (
        <View
          style={[styles.banner, { backgroundColor: colors.surfaceRaised, borderColor: colors.borderSubtle }]}
          accessibilityRole="alert"
        >
          <Icon name="info" size={16} color={colors.textSecondary} accessibilityLabel="Info data lokal" />
          <Typography variant="caption" color="secondary" style={styles.bannerText}>
            Menampilkan data tersimpan; pembaruan dari server gagal.
          </Typography>
          <Button
            variant="outlined"
            title="Coba Lagi"
            onPress={onRefresh}
            style={styles.retryButtonSmall}
          />
        </View>
      )}

      {bookmarkNotice && (
        <View
          style={[styles.banner, { backgroundColor: colors.surfaceRaised, borderColor: colors.statusError }]}
          accessibilityRole="alert"
        >
          <Icon name="error" size={16} color={colors.statusError} accessibilityLabel="Galat bookmark" />
          <Typography variant="caption" color="error" style={styles.bannerText}>
            {bookmarkNotice}
          </Typography>
        </View>
      )}

      {/* Seksi Header Metadata Berdampingan (Reflowable: Row -> Column jika layar sempit atau fontScale >= 1.5) */}
      <View
        style={[
          styles.metadataHeader,
          isReflowRequired ? styles.metadataHeaderColumn : styles.metadataHeaderRow,
        ]}
      >
        {/* Sisi Kiri: Cover Novel Rasio 2:3 (lebar 93dp, tinggi 140dp) */}
        <View
          style={[
            styles.coverContainer,
            { backgroundColor: colors.surfaceRaised, borderColor: colors.borderSubtle },
          ]}
        >
          {!coverFailed && activeNovel.coverUrl ? (
            <Image
              source={{ uri: activeNovel.coverUrl }}
              style={styles.coverImage}
              resizeMode="cover"
              onError={() => setCoverFailed(true)}
              accessibilityLabel={`Cover novel ${activeNovel.title}`}
            />
          ) : (
            <View style={styles.coverFallback}>
              <Icon name="menu_book" size={36} color={colors.textSecondary} accessibilityLabel="Gambar tidak tersedia" />
            </View>
          )}
        </View>

        {/* Sisi Kanan: Metadata Novel */}
        <View style={styles.metadataContent}>
          <Typography
            variant="headline"
            color="primary"
            numberOfLines={isReflowRequired ? undefined : 3}
            style={styles.novelTitle}
          >
            {activeNovel.title}
          </Typography>

          {activeNovel.author && (
            <Typography variant="body" color="secondary" numberOfLines={1}>
              {activeNovel.author}
            </Typography>
          )}

          {activeNovel.status && (
            <View style={styles.chipRow}>
              <View
                style={[
                  styles.statusChip,
                  { backgroundColor: colors.surfaceRaised, borderColor: colors.borderStrong },
                ]}
              >
                <Typography variant="label" color="primary">
                  {activeNovel.status}
                </Typography>
              </View>
            </View>
          )}

          {activeNovel.genres && activeNovel.genres.length > 0 && (
            <View style={styles.genreContainer}>
              {activeNovel.genres.map((genre) => (
                <View
                  key={genre}
                  style={[
                    styles.genreChip,
                    { backgroundColor: colors.surfaceRaised, borderColor: colors.borderSubtle },
                  ]}
                >
                  <Typography variant="caption" color="secondary">
                    {genre}
                  </Typography>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      <View style={[styles.sectionDivider, { backgroundColor: colors.borderSubtle }]} />

      {/* Seksi Sinopsis yang Dapat Diperluas (Expandable, Text-Align: Left Mutlak) */}
      <View style={styles.synopsisSection}>
        <Typography
          variant="body"
          color="secondary"
          numberOfLines={isSynopsisExpanded ? undefined : 3}
          style={styles.synopsisText}
        >
          {activeNovel.synopsis || 'Sinopsis belum tersedia untuk novel ini.'}
        </Typography>

        {activeNovel.synopsis && activeNovel.synopsis.length > 120 && (
          <TouchableOpacity
            style={styles.synopsisToggleButton}
            onPress={() => setIsSynopsisExpanded((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel={
              isSynopsisExpanded ? 'Sembunyikan sinopsis' : 'Tampilkan seluruh sinopsis novel'
            }
          >
            <Typography variant="label" color="accent">
              {isSynopsisExpanded ? 'Ciutkan' : 'Selengkapnya'}
            </Typography>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.sectionDivider, { backgroundColor: colors.borderSubtle }]} />

      {/* Barisan Tiga Tombol Aksi Utama (Reflowable: Row -> Column jika layar sempit atau fontScale >= 1.5) */}
      <View
        style={[
          styles.actionButtonsContainer,
          isReflowRequired ? styles.actionButtonsColumn : styles.actionButtonsRow,
        ]}
      >
        <Button
          variant="filled"
          title={readingTarget.actionLabel}
          icon="auto_stories"
          onPress={onReadPress}
          disabled={sourceChapters.length === 0}
          style={styles.actionButton}
        />

        <Button
          variant={isBookmarked ? 'filled' : 'outlined'}
          title={
            storageStatus === 'INITIALIZING'
              ? 'Memuat...'
              : isBookmarked
              ? 'Tersimpan'
              : 'Bookmark'
          }
          icon={isBookmarked ? 'bookmark' : 'bookmark_border'}
          onPress={onBookmarkPress}
          disabled={storageStatus !== 'READY' || isSavingBookmark}
          loading={isSavingBookmark}
          accessibilityLabel={
            storageStatus === 'INITIALIZING'
              ? 'Memuat status bookmark lokal'
              : storageStatus === 'UNAVAILABLE'
              ? 'Penyimpanan lokal tidak tersedia'
              : isBookmarked
              ? 'Hapus novel dari bookmark'
              : 'Simpan novel ke bookmark'
          }
          style={styles.actionButton}
        />

        <Button
          variant="outlined"
          title={sourceChapters.length === 0 ? 'Tidak Ada Bab' : 'Unduh'}
          icon="download"
          onPress={onDownloadPress}
          disabled={sourceChapters.length === 0}
          accessibilityLabel="Unduh bab novel untuk dibaca offline"
          style={styles.actionButton}
        />
      </View>

      <View style={[styles.sectionDivider, { backgroundColor: colors.borderSubtle }]} />

      {/* Header Seksi Bab */}
      <View style={styles.chapterHeaderRow}>
        <Typography variant="title" color="primary">
          Daftar Bab ({sourceChapters.length} bab)
        </Typography>

        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setIsAscending((prev) => !prev)}
          accessibilityRole="button"
          accessibilityLabel={`Urutan bab: ${
            isAscending ? 'Terlama ke terbaru' : 'Terbaru ke terlama'
          }. Ketuk untuk membalik urutan`}
        >
          <Icon name="sort" size={20} color={colors.accentPrimary} />
          <Typography variant="label" color="accent" style={styles.sortButtonText}>
            {isAscending ? 'Terlama' : 'Terbaru'}
          </Typography>
        </TouchableOpacity>
      </View>
    </View>
  );

  // 8. ListEmptyComponent (Kondisi jika daftar bab kosong / 0 bab)
  const listEmptyElement = useMemo(() => {
    return (
      <View style={styles.emptyContainer}>
        <Icon name="menu_book" size={48} color={colors.textSecondary} accessibilityLabel="Belum ada bab" />
        <Typography variant="title" color="primary" style={styles.emptyTitle}>
          Belum Ada Bab Tersedia
        </Typography>
        <Typography variant="body" color="secondary" style={styles.emptyText}>
          Penyedia belum merilis bab untuk novel ini atau daftar bab belum disinkronisasi.
        </Typography>
        <Button
          variant="filled"
          title="Muat Ulang"
          icon="refresh"
          onPress={onRefresh}
          style={styles.reloadButton}
        />
      </View>
    );
  }, [colors.textSecondary, onRefresh]);

  // 9. renderItem Baris Bab (Flat Row dengan Garis Pemisah 1dp)
  const renderChapterRow = ({ item }: { item: ChapterSummary }) => {
    const isLastRead = lastReadChapterId === item.id;

    return (
      <View>
        <TouchableOpacity
          style={styles.chapterRowItem}
          onPress={() =>
            navigation.navigate('Reader', {
              novelId,
              chapterId: item.id, // Preservasi string kanonik
            })
          }
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Bab: ${item.title}${isLastRead ? ', terakhir dibaca' : ''}`}
        >
          <View style={styles.chapterRowContent}>
            <Typography variant="body" color="primary" numberOfLines={1} style={styles.chapterTitleText}>
              {item.title}
            </Typography>

            <View style={styles.chapterMetaRow}>
              {item.releaseDate && (
                <Typography variant="caption" color="secondary">
                  {item.releaseDate}
                </Typography>
              )}

              {isLastRead && (
                <Typography variant="caption" color="accent" style={styles.lastReadBadge}>
                  Terakhir dibaca
                </Typography>
              )}
            </View>
          </View>
        </TouchableOpacity>
        <View style={[styles.chapterDivider, { backgroundColor: colors.borderSubtle }]} />
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceBackground, paddingTop: insets.top }]}>
      {/* Top App Bar 56dp */}
      <View style={[styles.topBar, { borderBottomColor: colors.borderSubtle }]}>
        <Button
          variant="text"
          icon="arrow_back"
          accessibilityLabel="Kembali ke layar sebelumnya"
          onPress={() => navigation.goBack()}
          style={styles.iconButton}
        />
        <Typography variant="title" color="primary" numberOfLines={1} style={styles.topBarTitle}>
          {activeNovel.title}
        </Typography>
      </View>

      {/* FlatList Tervirtualisasi Tunggal */}
      <FlatList
        data={displayChapters}
        keyExtractor={(item) => item.id}
        renderItem={renderChapterRow}
        ListHeaderComponent={listHeaderElement}
        ListEmptyComponent={listEmptyElement}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[colors.accentPrimary]}
            tintColor={colors.accentPrimary}
          />
        }
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + SPACING.space6 }]}
      />
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
    borderBottomWidth: 1,
    gap: SPACING.space2,
  },
  iconButton: {
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitle: {
    flex: 1,
    fontSize: 18,
  },
  listContent: {
    flexGrow: 1,
  },
  headerContainer: {
    paddingHorizontal: SPACING.space4,
    paddingTop: SPACING.space3,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.space2,
    borderRadius: RADIUS.medium,
    borderWidth: 1,
    marginBottom: SPACING.space3,
    gap: SPACING.space2,
  },
  bannerText: {
    flex: 1,
  },
  retryButtonSmall: {
    minHeight: 36,
    paddingHorizontal: 8,
  },
  metadataHeader: {
    gap: SPACING.space4,
  },
  metadataHeaderRow: {
    flexDirection: 'row',
  },
  metadataHeaderColumn: {
    flexDirection: 'column',
  },
  coverContainer: {
    width: 93,
    height: 140,
    borderRadius: RADIUS.medium,
    borderWidth: 1,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metadataContent: {
    flex: 1,
    gap: SPACING.space2,
    justifyContent: 'center',
  },
  novelTitle: {
    fontSize: 20,
    lineHeight: 26,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.small,
    borderWidth: 1,
  },
  genreContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: SPACING.space1,
  },
  genreChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.small,
    borderWidth: 1,
  },
  sectionDivider: {
    height: 1,
    marginVertical: SPACING.space4,
  },
  synopsisSection: {
    gap: SPACING.space2,
  },
  synopsisText: {
    textAlign: 'left',
    lineHeight: 22,
  },
  synopsisToggleButton: {
    minHeight: 48,
    justifyContent: 'center',
  },
  actionButtonsContainer: {
    gap: SPACING.space2,
  },
  actionButtonsRow: {
    flexDirection: 'row',
  },
  actionButtonsColumn: {
    flexDirection: 'column',
  },
  actionButton: {
    flex: 1,
    minHeight: 48,
  },
  chapterHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.space2,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: SPACING.space2,
    gap: 4,
  },
  sortButtonText: {
    fontSize: 14,
  },
  chapterRowItem: {
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: SPACING.space4,
    paddingVertical: SPACING.space2,
  },
  chapterRowContent: {
    gap: 4,
  },
  chapterTitleText: {
    textAlign: 'left',
  },
  chapterMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.space2,
  },
  lastReadBadge: {
    fontWeight: '600',
  },
  chapterDivider: {
    height: 1,
    marginLeft: SPACING.space4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.space8,
    paddingHorizontal: SPACING.space4,
    gap: SPACING.space2,
  },
  emptyTitle: {
    textAlign: 'center',
    marginTop: SPACING.space2,
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 20,
  },
  reloadButton: {
    marginTop: SPACING.space3,
    minHeight: 48,
  },
  stateCenterContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.space4,
  },
  errorCard: {
    width: '100%',
    padding: SPACING.space4,
    alignItems: 'center',
    gap: SPACING.space2,
    borderRadius: RADIUS.medium,
  },
  errorTitle: {
    textAlign: 'center',
    marginTop: SPACING.space1,
  },
  errorDesc: {
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: SPACING.space2,
    minWidth: 120,
  },
});
