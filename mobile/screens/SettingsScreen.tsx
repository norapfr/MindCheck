import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { CommonActions } from '@react-navigation/native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { DrawerScreenProps } from '@react-navigation/drawer';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainDrawerParamList, RootStackParamList } from '../App';
import { exportMyData, deleteMyAccount, logout, getMe, SessionExpiredError, NetworkError } from '../services/api';
import { spacing, radius, shadow } from '../theme';
import { useTheme } from '../theme/ThemeContext';

type Props = CompositeScreenProps<
    DrawerScreenProps<MainDrawerParamList, 'Settings'>,
    NativeStackScreenProps<RootStackParamList>
>;

export default function SettingsScreen({ navigation }: Props) {
    const { colors } = useTheme();
    const [exporting, setExporting] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    const [accountEmail, setAccountEmail] = useState<string | null>(null);
    const [loadingAccount, setLoadingAccount] = useState(true);

    useFocusEffect(
        useCallback(() => {
            let isActive = true;
            setLoadingAccount(true);

            getMe()
                .then((me) => {
                    if (isActive) setAccountEmail(me.email);
                })
                .catch((e) => {
                    if (!isActive) return;
                    if (e instanceof SessionExpiredError) return;
                })
                .finally(() => {
                    if (isActive) setLoadingAccount(false);
                });

            return () => { isActive = false; };
        }, [])
    );

    function goToOnboarding() {
        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [{ name: 'Login' }],
            })
        );
    }

    async function handleExport() {
        setExporting(true);
        try {
            const data = await exportMyData();
            const path = `${FileSystem.documentDirectory}mindcheck-export.json`;
            await FileSystem.writeAsStringAsync(path, JSON.stringify(data, null, 2));

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(path, { mimeType: 'application/json' });
            } else {
                Alert.alert('Export ready', `Saved to ${path}`);
            }
        } catch (e: any) {
            if (e instanceof SessionExpiredError) return;
            if (e instanceof NetworkError) {
                Alert.alert('No connection', e.message);
            } else {
                Alert.alert('Error', e.message);
            }
        } finally {
            setExporting(false);
        }
    }

    function handleLogout() {
        Alert.alert(
            'Log out?',
            'You can log back in anytime with your email and password.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Log out',
                    onPress: async () => {
                        setLoggingOut(true);
                        try {
                            await logout();
                            goToOnboarding();
                        } catch (e: any) {
                            Alert.alert('Error', e.message);
                        } finally {
                            setLoggingOut(false);
                        }
                    },
                },
            ]
        );
    }

    function handleDelete() {
        const label = accountEmail ? ` (${accountEmail})` : '';
        Alert.alert(
            `Delete your account${label}?`,
            'This permanently deletes your account and every journal entry. This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete everything',
                    style: 'destructive',
                    onPress: async () => {
                        setDeleting(true);
                        try {
                            await deleteMyAccount();
                            goToOnboarding();
                        } catch (e: any) {
                            if (e instanceof SessionExpiredError) return;
                            if (e instanceof NetworkError) {
                                Alert.alert('No connection', e.message);
                            } else {
                                Alert.alert('Error', e.message);
                            }
                        } finally {
                            setDeleting(false);
                        }
                    },
                },
            ]
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Signed in as</Text>
                <View style={[styles.card, shadow.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    {loadingAccount ? (
                        <ActivityIndicator color={colors.primary} />
                    ) : (
                        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                            {accountEmail ?? 'Could not load your account'}
                        </Text>
                    )}
                </View>

                <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: spacing.lg }]}>Your data</Text>

                <TouchableOpacity
                    style={[styles.card, shadow.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={handleExport}
                    disabled={exporting}
                    activeOpacity={0.8}
                >
                    {exporting ? (
                        <ActivityIndicator color={colors.primary} />
                    ) : (
                        <>
                            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Export my data</Text>
                            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                                Download everything MindCheck has stored about you, as a file.
                            </Text>
                        </>
                    )}
                </TouchableOpacity>

                <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: spacing.lg }]}>Account</Text>

                <TouchableOpacity
                    style={[styles.card, shadow.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => navigation.navigate('ChangePassword')}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Change password</Text>
                    <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                        Update the password you use to log in.
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.card, shadow.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={handleLogout}
                    disabled={loggingOut}
                    activeOpacity={0.8}
                >
                    {loggingOut ? (
                        <ActivityIndicator color={colors.primary} />
                    ) : (
                        <>
                            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Log out</Text>
                            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                                Sign out of this device. Your data stays safe on your account.
                            </Text>
                        </>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.card, shadow.card, { backgroundColor: colors.card, borderColor: colors.danger }]}
                    onPress={handleDelete}
                    disabled={deleting}
                    activeOpacity={0.8}
                >
                    {deleting ? (
                        <ActivityIndicator color={colors.danger} />
                    ) : (
                        <>
                            <Text style={[styles.cardTitle, { color: colors.danger }]}>Delete my account</Text>
                            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                                Permanently erase your account and all journal entries.
                            </Text>
                        </>
                    )}
                </TouchableOpacity>

                <Text style={[styles.disclaimer, { color: colors.textSecondary }]}>
                    MindCheck is a self-awareness and support tool. It does not diagnose any
                    medical condition and does not replace professional help.
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, padding: spacing.lg },
    sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: spacing.md, textTransform: 'uppercase' },
    card: { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1 },
    cardTitle: { fontSize: 16, fontWeight: '600' },
    cardSubtitle: { fontSize: 13, marginTop: spacing.xs },
    disclaimer: { fontSize: 12, marginTop: spacing.lg, textAlign: 'center', lineHeight: 18 },
});