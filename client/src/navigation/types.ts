import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';

/**
 * Parameter list for the main bottom tab navigator.
 */
export type MainTabParamList = {
  Discover: undefined;
  Library: undefined;
};

/**
 * Parameter list for the root native stack navigator.
 * Detail and Reader reside on this root stack outside MainTabs,
 * ensuring the bottom tab bar is hidden on both screens.
 */
export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  NovelDetail: {
    novelId: string;
  };
  Reader: {
    novelId: string;
    chapterId: string;
  };
  DownloadManager: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, T>,
    NativeStackScreenProps<RootStackParamList>
  >;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
