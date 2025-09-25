Expo Dev Client setup

1) Install deps
   npm install

2) Ensure plugins in app.json
   - expo-dev-client (added)
   - expo-router and expo-splash-screen

3) Prebuild native projects
   npx expo prebuild -p ios -p android
   npx pod-install

4) Start Metro
   npm run start --workspaces --ws mobile -- --tunnel

5) Run on device
   npx expo run:ios --device
   or open apps/mobile/ios/mobile.xcworkspace in Xcode and run

Notes
- iOS build phase "Bundle React Native code and images" is present and resolves react-native-xcode.sh via Node, which is monorepo-safe.
- Debug builds SKIP_BUNDLING; use Release to embed the bundle.

