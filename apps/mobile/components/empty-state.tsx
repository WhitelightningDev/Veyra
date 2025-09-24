import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ThemedText } from '@/components/themed-text';

export function EmptyState({
  title,
  description,
  icon = 'info',
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentProps<typeof MaterialIcons>['name'];
  primaryLabel?: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <MaterialIcons name={icon} size={40} color="#888" />
      <ThemedText type="defaultSemiBold" style={styles.title}>{title}</ThemedText>
      {description ? <ThemedText style={styles.desc}>{description}</ThemedText> : null}
      <View style={styles.row}>
        {secondaryLabel && onSecondary ? (
          <Pressable onPress={onSecondary} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
            <ThemedText>{secondaryLabel}</ThemedText>
          </Pressable>
        ) : null}
        {primaryLabel && onPrimary ? (
          <Pressable onPress={onPrimary} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
            <ThemedText style={{ color: '#fff' }}>{primaryLabel}</ThemedText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 8, paddingVertical: 20 },
  title: { textAlign: 'center' },
  desc: { textAlign: 'center', opacity: 0.7 },
  row: { flexDirection: 'row', gap: 8, marginTop: 6 },
  secondary: { borderWidth: 1, borderColor: '#999', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  primary: { backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  pressed: { opacity: 0.9 },
});

