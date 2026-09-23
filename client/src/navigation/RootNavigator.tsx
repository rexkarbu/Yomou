import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BottomTabNavigator } from './BottomTabNavigator';
import {
  NovelDetailPlaceholderScreen,
  ReaderPlaceholderScreen,
  DownloadManagerPlaceholderScreen,
} from '../screens';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="MainTabs"
      screenOptions={{
        headerShown: false,
        animation: 'default',
      }}
    >
      <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
      <Stack.Screen name="NovelDetail" component={NovelDetailPlaceholderScreen} />
      <Stack.Screen name="Reader" component={ReaderPlaceholderScreen} />
      <Stack.Screen name="DownloadManager" component={DownloadManagerPlaceholderScreen} />
    </Stack.Navigator>
  );
};
