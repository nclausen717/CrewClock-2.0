
import "react-native-reanimated";
import React, { useEffect } from "react";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useColorScheme } from "react-native";
import { useNetworkState } from "expo-network";
import {
  DarkTheme,
  DefaultTheme,
  Theme,
  ThemeProvider,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { WidgetProvider } from "@/contexts/WidgetContext";
import { AuthProvider } from "@/contexts/AuthContext";
// Note: Error logging is auto-initialized via index.ts import

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const CustomDefaultTheme: Theme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    primary: "rgb(0, 122, 255)", // System Blue
    background: "rgb(242, 242, 247)", // Light mode background
    card: "rgb(255, 255, 255)", // White cards/surfaces
    text: "rgb(0, 0, 0)", // Black text for light mode
    border: "rgb(216, 216, 220)", // Light gray for separators/borders
    notification: "rgb(255, 59, 48)", // System Red
  },
};

const CustomDarkTheme: Theme = {
  ...DarkTheme,
  colors: {
    primary: "rgb(10, 132, 255)", // System Blue (Dark Mode)
    background: "rgb(1, 1, 1)", // True black background for OLED displays
    card: "rgb(28, 28, 30)", // Dark card/surface color
    text: "rgb(255, 255, 255)", // White text for dark mode
    border: "rgb(44, 44, 46)", // Dark gray for separators/borders
    notification: "rgb(255, 69, 58)", // System Red (Dark Mode)
  },
};

export const unstable_settings = {
  initialRouteName: "index", // Start at welcome screen
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const networkState = useNetworkState();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  React.useEffect(() => {
    if (
      !networkState.isConnected &&
      networkState.isInternetReachable === false
    ) {
      console.log("🔌 You are offline - changes will be saved locally");
    }
  }, [networkState.isConnected, networkState.isInternetReachable]);

  if (!loaded) {
    return null;
  }

  return (
    <>
      <StatusBar style="auto" animated />
        <ThemeProvider
          value={colorScheme === "dark" ? CustomDarkTheme : CustomDefaultTheme}
        >
          <AuthProvider>
            <WidgetProvider>
              <GestureHandlerRootView>
              <Stack>
                {/* Welcome/Login screens */}
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="login/company" options={{ headerShown: false }} />
                <Stack.Screen name="login/admin" options={{ headerShown: false }} />
                <Stack.Screen name="login/crew-lead" options={{ headerShown: false }} />
                
                {/* Main app with tabs */}
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                
                {/* Other screens */}
                <Stack.Screen name="clock-in" options={{ headerShown: false }} />
                <Stack.Screen name="clock-out" options={{ headerShown: false }} />
                <Stack.Screen name="crews" options={{ headerShown: false }} />
                <Stack.Screen name="crew-dashboard" options={{ headerShown: false }} />
                <Stack.Screen name="employees" options={{ headerShown: false }} />
                <Stack.Screen name="job-sites" options={{ headerShown: false }} />
                <Stack.Screen name="reports" options={{ headerShown: false }} />
                
                {/* 404 */}
                <Stack.Screen name="+not-found" options={{ headerShown: false }} />
              </Stack>
              <SystemBars style={"auto"} />
              </GestureHandlerRootView>
            </WidgetProvider>
          </AuthProvider>
        </ThemeProvider>
    </>
  );
}
