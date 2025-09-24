import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ThemedText } from '@/components/themed-text';
import { useUI } from '@/providers/ui';
import { router } from 'expo-router';

export function AppHeader({ title }: { title?: string }) {
  const { bleStatus } = useUI();
  const chip = bleStatus === 'connected' ? { text: 'Connected', bg: '#16a34a33', fg: '#166534' }
    : bleStatus === 'scanning' ? { text: 'Scanning', bg: '#f59e0b33', fg: '#92400e' }
    : { text: 'Disconnected', bg: '#dc262633', fg: '#7f1d1d' };

  return (
    <View style={styles.wrap}>
      <ThemedText type="title" numberOfLines={1} style={styles.title}>{title ?? ''}</ThemedText>
      <View style={styles.right}>
        <View style={[styles.chip, { backgroundColor: chip.bg }]}> 
          <ThemedText style={[styles.chipText, { color: chip.fg }]}>{chip.text}</ThemedText>
        </View>
        <Pressable onPress={() => router.push('/settings')} style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.8 }]}>
          <MaterialIcons name="settings" size={22} color="#666" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6 },
  title: { },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  chipText: { fontSize: 12 },
  iconBtn: { padding: 6, marginLeft: 2 },
});

