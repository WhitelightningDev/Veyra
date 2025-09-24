import React from 'react';
import { StyleSheet, View, Pressable, Image } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { router } from 'expo-router';

export default function OnboardingScreen() {
  async function done() {
    try {
      const Storage = require('@react-native-async-storage/async-storage');
      await Storage.setItem('onboarded', '1');
    } catch {}
    router.replace('/connect');
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={{ textAlign: 'center', marginBottom: 12 }}>Welcome</ThemedText>
      <Step text="Plug in your OBD adapter" />
      <Step text="Turn key ON (ignition)" />
      <Step text="Tap Scan to find your adapter" />

      <Pressable onPress={done} style={({ pressed }) => [styles.primary, pressed && { opacity: 0.85 }]}>
        <ThemedText type="defaultSemiBold" style={{ color: '#fff' }}>Got it</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

function Step({ text }: { text: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.bullet} />
      <ThemedText>{text}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 10, justifyContent: 'center' },
  step: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bullet: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.light.tint },
  primary: { alignSelf: 'center', backgroundColor: Colors.light.tint, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 18, marginTop: 16 },
});

