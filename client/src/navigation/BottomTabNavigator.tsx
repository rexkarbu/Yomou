import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { Icon } from '../components/common/Icon';
import { DiscoverScreen } from '../screens/discover/DiscoverScreen';
import { LibraryPlaceholderScreen } from '../screens/library/LibraryPlaceholderScreen';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const BottomTabNavigator: React.FC = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // Ensuring each tab button has at least 48dp of touchable height and width
  // even after accounting for the Android navigation/gesture bar inset.
  const baseTabHeight = 60;
  const totalTabHeight = baseTabHeight + insets.bottom;

  return (
    <Tab.Navigator
      initialRouteName="Discover"
      backBehavior="initialRoute" // Explicit back behavior: Back from Library returns to Discover
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accentPrimary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surfaceRaised,
          borderTopWidth: 1,
          borderTopColor: colors.borderSubtle,
          height: totalTabHeight,
          paddingBottom: insets.bottom,
          elevation: 0,
        },
        tabBarItemStyle: {
          minHeight: 48,
          minWidth: 48,
          paddingVertical: 4,
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="Discover"
        component={DiscoverScreen}
        options={{
          tabBarLabel: 'Discover',
          tabBarAccessibilityLabel: 'Tab Discover: Jelajahi novel',
          tabBarIcon: ({ color }) => (
            <Icon name="auto_stories" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Library"
        component={LibraryPlaceholderScreen}
        options={{
          tabBarLabel: 'Library',
          tabBarAccessibilityLabel: 'Tab Library: Pustaka novel tersimpan',
          tabBarIcon: ({ color }) => (
            <Icon name="library_books" size={24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};
