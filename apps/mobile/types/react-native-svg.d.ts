declare module 'react-native-svg' {
  import * as React from 'react';
  import { ViewProps } from 'react-native';
  export const Svg: React.ComponentType<ViewProps & { viewBox?: string; width?: any; height?: any }>;
  export const Path: React.ComponentType<{ d: string; stroke?: string; strokeWidth?: number; fill?: string }>;
}

