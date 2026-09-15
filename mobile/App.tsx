import { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme, DrawerActions, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, Switch, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import ChangePasswordScreen from './screens/ChangePasswordScreen';
import JournalScreen from './screens/JournalScreen';
import HistoryScreen from './screens/HistoryScreen';
import EntryDetailScreen from './screens/EntryDetailScreen';
import ResourcesScreen from './screens/ResourcesScreen';
import SettingsScreen from './screens/SettingsScreen';
import ModelValidationScreen from './screens/ModelValidationScreen'; // TEMPORAL — quitar tras validar
import { hasSession, JournalEntry } from './services/api';
import { navigationRef } from './navigation/navigationRef';
import { ThemeProvider, useTheme } from './theme/ThemeContext';
import { spacing } from './theme';

export type HistoryStackParamList = {
  HistoryList: undefined;
  EntryDetail: { entry: JournalEntry };
};

export type MainDrawerParamList = {
  Journal: undefined;
  HistoryStack: undefined;
  Resources: { autoTriggered?: boolean } | undefined;
  Settings: undefined;
  ModelValidation: undefined; // TEMPORAL — quitar tras validar
};

export type RootStackParamList = {
  Login: { sessionExpired?: boolean } | undefined;
  Register: undefined;
  ChangePassword: undefined;
  Main: { screen?: keyof MainDrawerParamList; params?: any } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Drawer = createDrawerNavigator<MainDrawerParamList>();
const HistoryStack = createNativeStackNavigator<HistoryStackParamList>();

function CustomDrawerContent(props: any) {
  const { colors, isDark, toggleScheme } = useTheme();
  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1 }}>
      <DrawerItemList {...props} />
      <View style={[styles.themeRow, { borderTopColor: colors.border }]}>
        <View style={styles.themeLabelGroup}>
          <Ionicons name={isDark ? 'moon' : 'sunny'} size={18} color={colors.textSecondary} />
          <Text style={[styles.themeLabel, { color: colors.textPrimary }]}>Dark mode</Text>
        </View>
        <Switch
          value={isDark}
          onValueChange={toggleScheme}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#fff"
        />
      </View>
    </DrawerContentScrollView>
  );
}

function HistoryMenuButton() {
  const navigation = useNavigation();
  return (
    <TouchableOpacity
      onPress={() => navigation.getParent()?.dispatch(DrawerActions.openDrawer())}
      style={{ paddingHorizontal: spacing.md }}
    >
      <Ionicons name="menu" size={24} color="#fff" />
    </TouchableOpacity>
  );
}

function HistoryStackNavigator() {
  const { colors } = useTheme();
  return (
    <HistoryStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <HistoryStack.Screen
        name="HistoryList"
        component={HistoryScreen}
        options={{ title: 'History', headerLeft: () => <HistoryMenuButton /> }}
      />
      <HistoryStack.Screen name="EntryDetail" component={EntryDetailScreen} options={{ title: 'Entry' }} />
    </HistoryStack.Navigator>
  );
}

function MainDrawer() {
  const { colors } = useTheme();
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={({ route }) => ({
        headerShown: route.name !== 'HistoryStack',
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: colors.textSecondary,
        drawerActiveBackgroundColor: colors.primaryLight,
        drawerStyle: { backgroundColor: colors.card, width: 250 },
        drawerLabelStyle: { fontSize: 14, fontWeight: '600' },
        drawerIcon: ({ color, size }) => {
          const icons: Record<keyof MainDrawerParamList, any> = {
            Journal: 'create-outline',
            HistoryStack: 'stats-chart-outline',
            Resources: 'heart-outline',
            Settings: 'settings-outline',
            ModelValidation: 'flask-outline',
          };
          return <Ionicons name={icons[route.name as keyof MainDrawerParamList]} size={size} color={color} />;
        },
      })}
    >
      <Drawer.Screen name="Journal" component={JournalScreen} options={{ title: 'Journal' }} />
      <Drawer.Screen name="HistoryStack" component={HistoryStackNavigator} options={{ title: 'History' }} />
      <Drawer.Screen name="Resources" component={ResourcesScreen} options={{ title: 'Help Resources' }} />
      <Drawer.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      {/* TEMPORAL: quitar esta pantalla en cuanto se confirme que el modelo local coincide con el baseline */}
      <Drawer.Screen name="ModelValidation" component={ModelValidationScreen} options={{ title: 'Model Validation (DEV)' }} />
    </Drawer.Navigator>
  );
}

function SplashLoading() {
  const { colors } = useTheme();
  return (
    <View style={[styles.splash, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

function Navigation() {
  const { colors, isDark } = useTheme();
  const [checkingSession, setCheckingSession] = useState(true);
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>('Login');

  useEffect(() => {
    let isMounted = true;
    hasSession()
      .then((loggedIn) => {
        if (isMounted) setInitialRoute(loggedIn ? 'Main' : 'Login');
      })
      .catch(() => {
        if (isMounted) setInitialRoute('Login');
      })
      .finally(() => {
        if (isMounted) setCheckingSession(false);
      });
    return () => { isMounted = false; };
  }, []);

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      primary: colors.primary,
      card: colors.card,
      border: colors.border,
      text: colors.textPrimary,
    },
  };

  if (checkingSession) {
    return (
      <NavigationContainer theme={navTheme} ref={navigationRef}>
        <SplashLoading />
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer theme={navTheme} ref={navigationRef}>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen
          name="ChangePassword"
          component={ChangePasswordScreen}
          options={{
            headerShown: true,
            title: 'Change password',
            headerStyle: { backgroundColor: colors.primary },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: '700' },
          }}
        />
        <Stack.Screen name="Main" component={MainDrawer} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider>
          <Navigation />
        </ThemeProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  themeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    marginTop: 'auto',
  },
  themeLabelGroup: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  themeLabel: { fontSize: 14, fontWeight: '600' },
});