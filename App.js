import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { isOnboarded } from './utils/storage';
import AppNavigator from './navigation/AppNavigator';

// Keep splash visible until we finish checking onboarding state
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    async function prepare() {
      try {
        const onboarded = await isOnboarded();
        setInitialRoute(onboarded ? 'Home' : 'Onboarding');
      } catch (e) {
        setInitialRoute('Onboarding');
      } finally {
        await SplashScreen.hideAsync();
      }
    }
    prepare();
  }, []);

  if (!initialRoute) return null;

  return <AppNavigator initialRoute={initialRoute} />;
}
