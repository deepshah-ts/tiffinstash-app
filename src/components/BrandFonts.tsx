import React from 'react';
import {ActivityIndicator, Text, View} from 'react-native';
import {useFonts} from 'expo-font';
import {
  Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold,
  Poppins_700Bold, Poppins_800ExtraBold,
} from '@expo-google-fonts/poppins';
import {C} from '../theme';

/** Font assets come from the installed package and are bundled by Metro.
 * The app waits instead of silently presenting the wrong font. */
export default function BrandFonts({children}: {children: React.ReactNode}) {
  const [loaded, error] = useFonts({
    Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold,
    Poppins_700Bold, Poppins_800ExtraBold,
  });
  if (!loaded) return <View style={{flex: 1, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center', padding: 28}}>
    {error
      ? <Text accessibilityRole="alert" style={{color: C.ink, textAlign: 'center', lineHeight: 24}}>
          TiffinStash’s fonts could not load. Please close and reopen the app. For a development build, run npm run setup and rebuild.
        </Text>
      : <ActivityIndicator color={C.primary} size="large" accessibilityLabel="Loading TiffinStash"/>}
  </View>;
  return <>{children}</>;
}
