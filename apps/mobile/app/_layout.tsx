"use client";

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { UIProvider } from '@/providers/ui';
import { AppHeader } from '@/components/app-header';
import { SettingsProvider } from '@/providers/settings';
import { TelemetryProvider } from '@/providers/telemetry';
import { TripProvider } from '@/providers/trip';
import { HistoryProvider } from '@/providers/history';
import { useEffect } from 'react';
import { router, usePathname } from 'expo-router';

function OnboardGate() {
  const path = usePathname();
  useEffect(() => {
    (async () => {
      try {
        const Storage = require('@react-native-async-storage/async-storage');
        const flag = await Storage.getItem('onboarded');
        if (!flag && path !== '/onboarding') {
          router.replace('/onboarding');
        }
      } catch {}
    })();
  }, [path]);
  return null;
}

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const pathname = usePathname();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SettingsProvider>
      <UIProvider>
      <TelemetryProvider>
      <HistoryProvider>
      <TripProvider>
        <Stack initialRouteName="connect" screenOptions={{ header: ({ options }) => (<AppHeader title={String(options.title ?? '')} />) }}>
          <OnboardGate />
          <Stack.Screen name="connect" options={{ title: 'Connect' }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="init" options={{ title: 'Initializing' }} />
          <Stack.Screen name="dtcs" options={{ title: 'Trouble Codes' }} />
          <Stack.Screen name="freeze" options={{ title: 'Freeze Frame' }} />
          <Stack.Screen name="freeze-compare" options={{ title: 'Freeze Compare' }} />
          <Stack.Screen name="vehicle" options={{ title: 'Vehicle Info' }} />
          <Stack.Screen name="advanced" options={{ title: 'Advanced Scan (Beta)' }} />
          <Stack.Screen name="logs" options={{ title: 'Logs & Exports' }} />
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
          <Stack.Screen name="readiness" options={{ title: 'Readiness' }} />
          <Stack.Screen name="onboarding" options={{ title: 'Welcome' }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </TripProvider>
      </HistoryProvider>
      </TelemetryProvider>
      </UIProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}
