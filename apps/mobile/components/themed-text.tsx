import { StyleSheet, Text, type TextProps } from 'react-native';
import { useSettings } from '@/providers/settings';

import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const { settings } = useSettings();
  const scale = settings.accessibility?.largeFont ? 1.2 : 1;

  return (
    <Text
      style={[
        { color },
        type === 'default' ? { ...styles.default, fontSize: styles.default.fontSize * scale, lineHeight: styles.default.lineHeight * scale } : undefined,
        type === 'title' ? { ...styles.title, fontSize: styles.title.fontSize * scale, lineHeight: styles.title.lineHeight * scale } : undefined,
        type === 'defaultSemiBold' ? { ...styles.defaultSemiBold, fontSize: styles.defaultSemiBold.fontSize * scale, lineHeight: styles.defaultSemiBold.lineHeight * scale } : undefined,
        type === 'subtitle' ? { ...styles.subtitle, fontSize: styles.subtitle.fontSize * scale } : undefined,
        type === 'link' ? { ...styles.link, fontSize: styles.link.fontSize * scale, lineHeight: styles.link.lineHeight * scale } : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    color: '#0a7ea4',
  },
});
