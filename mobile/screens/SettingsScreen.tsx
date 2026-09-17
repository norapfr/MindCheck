import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { CommonActions } from '@react-navigation/native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { DrawerScreenProps } from '@react-navigation/drawer';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainDrawerParamList, RootStackParamList } from '../App';
import { exportMyData, deleteMyAccount, logout, getMe, SessionExpiredError, NetworkError, RateLimitError } from '../services/api';
import { buildJournalReportHtml } from '../utils/reportHtml';
import { spacing, radius, shadow } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import ConfirmModal from '../components/Confirmmodal';

type Props = CompositeScreenProps<
    DrawerScreenProps<MainDrawerParamList, 'Settings'>,
    NativeStackScreenProps<RootStackParamList>
>;

export default function SettingsScreen({ navigation }: Props) {
    const { colors } = useTheme();
    const [exporting, setExporting] = useState(false);
    const [exportingPdf, setExportingPdf] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    const [accountEmail, setAccountEmail] = useState<string | null>(null);
    const [loadingAccount, setLoadingAccount] = useState(true);

    const [logoutModalVisible, setLogoutModalVisible] = useState(false);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);

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
            if (e instanceof RateLimitError) {
                Alert.alert('Too fast', e.message);
            } else if (e instanceof NetworkError) {
                Alert.alert('No connection', e.message);
            } else {
                Alert.alert('Error', e.message);
            }
        } finally {
            setExporting(false);
        }
    }

    async function handleExportPdf() {
        setExportingPdf(true);
        try {
            const data: any = await exportMyData();
            const html = buildJournalReportHtml({
                email: data.email,
                accountCreatedAt: data.account_created_at,
                entries: data.entries,
            });

            const { uri } = await Print.printToFileAsync({ html });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
            } else {
                Alert.alert('Report ready', `Saved to ${uri}`);
            }
        } catch (e: any) {
            if (e instanceof SessionExpiredError) return;
            if (e instanceof RateLimitError) {
                Alert.alert('Too fast', e.message);
            } else if (e instanceof NetworkError) {
                Alert.alert('No connection', e.message);
            } else {
                Alert.alert('Error', e.message ?? 'Could not generate the report.');
            }
        } finally {
            setExportingPdf(false);
        }
    }

    async function confirmLogout() {
        setLoggingOut(true);
        try {
            await logout();
            setLogoutModalVisible(false);
            goToOnboarding();
        } catch (e: any) {
            setLogoutModalVisible(false);
            Alert.alert('Error', e.message);
        } finally {
            setLoggingOut(false);
        }
    }

    async function confirmDelete() {
        setDeleting(true);
        try {
            await deleteMyAccount();
            setDeleteModalVisible(false);
            goToOnboarding();
        } catch (e: any) {
            setDeleteModalVisible(false);
            if (e instanceof SessionExpiredError) return;
            if (e instanceof RateLimitError) {
                Alert.alert('Too fast', e.message);
            } else if (e instanceof NetworkError) {
                Alert.alert('No connection', e.message);
            } else {
                Alert.alert('Error', e.message);
            }
        } finally {
            setDeleting(false);
        }
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
                    onPress={handleExportPdf}
                    disabled={exportingPdf}
                    activeOpacity={0.8}
                >
                    {exportingPdf ? (
                        <ActivityIndicator color={colors.primary} />
                    ) : (
                        <>
                            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Export as PDF report</Text>
                            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                                A readable summary with your mood trend and entries — great for sharing with a therapist.
                            </Text>
                        </>
                    )}
                </TouchableOpacity>

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
                                Download everything MindCheck has stored about you, as a raw data file.
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
                    onPress={() => setLogoutModalVisible(true)}
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
                    onPress={() => setDeleteModalVisible(true)}
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

            <ConfirmModal
                visible={logoutModalVisible}
                title="Log out?"
                message="You can log back in anytime with your email and password."
                confirmLabel="Log out"
                loading={loggingOut}
                onConfirm={confirmLogout}
                onCancel={() => setLogoutModalVisible(false)}
            />

            <ConfirmModal
                visible={deleteModalVisible}
                title={`Delete your account${accountEmail ? ` (${accountEmail})` : ''}?`}
                message="This permanently deletes your account and every journal entry. This cannot be undone."
                confirmLabel="Delete everything"
                destructive
                loading={deleting}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteModalVisible(false)}
            />
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