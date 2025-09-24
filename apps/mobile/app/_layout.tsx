"use client";

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { UIProvider } from '@/providers/ui';
import { AppHeader } from '@/components/app-header';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <UIProvider>
        <Stack screenOptions={{ header: ({ options }) => (<AppHeader title={String(options.title ?? '')} />) }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="init" options={{ title: 'Initializing' }} />
          <Stack.Screen name="dtcs" options={{ title: 'Trouble Codes' }} />
          <Stack.Screen name="freeze" options={{ title: 'Freeze Frame' }} />
          <Stack.Screen name="vehicle" options={{ title: 'Vehicle Info' }} />
          <Stack.Screen name="advanced" options={{ title: 'Advanced Scan (Beta)' }} />
          <Stack.Screen name="logs" options={{ title: 'Logs & Exports' }} />
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </UIProvider>
    </ThemeProvider>
  );
}
