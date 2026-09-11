import { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { changePassword, PasswordChangeError, SessionExpiredError, NetworkError } from '../services/api';
import { spacing, radius } from '../theme';
import { useTheme } from '../theme/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'ChangePassword'>;

const MIN_PASSWORD_LENGTH = 8;

export default function ChangePasswordScreen({ navigation }: Props) {
    const { colors } = useTheme();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);

    const [currentError, setCurrentError] = useState('');
    const [newError, setNewError] = useState('');
    const [formError, setFormError] = useState('');
    const [success, setSuccess] = useState(false);

    function clearErrors() {
        setCurrentError('');
        setNewError('');
        setFormError('');
    }

    async function handleSubmit() {
        clearErrors();
        setSuccess(false);

        if (newPassword.length < MIN_PASSWORD_LENGTH) {
            setNewError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
            return;
        }
        if (newPassword !== confirmPassword) {
            setNewError('Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            await changePassword(currentPassword, newPassword);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setSuccess(true);
        } catch (e: any) {
            if (e instanceof SessionExpiredError) return; // ya se está redirigiendo a Login
            if (e instanceof NetworkError) {
                setFormError(e.message);
            } else if (e instanceof PasswordChangeError) {
                if (e.kind === 'wrong_current') {
                    setCurrentError(e.message);
                } else if (e.kind === 'same_password' || e.kind === 'weak_password') {
                    setNewError(e.message);
                } else {
                    setFormError(e.message);
                }
            } else {
                setFormError(e.message ?? 'Something went wrong. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView
                    contentContainerStyle={styles.container}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        Choose a new password for your account.
                    </Text>

                    <View style={styles.inputGroup}>
                        <View style={[
                            styles.passwordRow,
                            { borderColor: currentError ? colors.danger : colors.border, backgroundColor: colors.card },
                        ]}>
                            <TextInput
                                style={[styles.passwordInput, { color: colors.textPrimary }]}
                                placeholder="Current password"
                                placeholderTextColor={colors.textSecondary}
                                secureTextEntry={!showCurrent}
                                returnKeyType="next"
                                value={currentPassword}
                                onChangeText={(v) => { setCurrentPassword(v); if (currentError) setCurrentError(''); }}
                            />
                            <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} hitSlop={8}>
                                <Ionicons
                                    name={showCurrent ? 'eye-off-outline' : 'eye-outline'}
                                    size={20}
                                    color={colors.textSecondary}
                                />
                            </TouchableOpacity>
                        </View>
                        {!!currentError && <Text style={[styles.fieldError, { color: colors.danger }]}>{currentError}</Text>}

                        <View style={[
                            styles.passwordRow,
                            { borderColor: newError ? colors.danger : colors.border, backgroundColor: colors.card },
                        ]}>
                            <TextInput
                                style={[styles.passwordInput, { color: colors.textPrimary }]}
                                placeholder="New password"
                                placeholderTextColor={colors.textSecondary}
                                secureTextEntry={!showNew}
                                returnKeyType="next"
                                value={newPassword}
                                onChangeText={(v) => { setNewPassword(v); if (newError) setNewError(''); }}
                            />
                            <TouchableOpacity onPress={() => setShowNew(!showNew)} hitSlop={8}>
                                <Ionicons
                                    name={showNew ? 'eye-off-outline' : 'eye-outline'}
                                    size={20}
                                    color={colors.textSecondary}
                                />
                            </TouchableOpacity>
                        </View>

                        <View style={[
                            styles.passwordRow,
                            { borderColor: newError ? colors.danger : colors.border, backgroundColor: colors.card },
                        ]}>
                            <TextInput
                                style={[styles.passwordInput, { color: colors.textPrimary }]}
                                placeholder="Confirm new password"
                                placeholderTextColor={colors.textSecondary}
                                secureTextEntry={!showConfirm}
                                returnKeyType="done"
                                value={confirmPassword}
                                onChangeText={(v) => { setConfirmPassword(v); if (newError) setNewError(''); }}
                            />
                            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} hitSlop={8}>
                                <Ionicons
                                    name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                                    size={20}
                                    color={colors.textSecondary}
                                />
                            </TouchableOpacity>
                        </View>
                        {!!newError && <Text style={[styles.fieldError, { color: colors.danger }]}>{newError}</Text>}
                        {!newError && (
                            <Text style={[styles.hintText, { color: colors.textSecondary }]}>
                                At least {MIN_PASSWORD_LENGTH} characters.
                            </Text>
                        )}
                    </View>

                    {!!formError && <Text style={[styles.formError, { color: colors.danger }]}>{formError}</Text>}
                    {success && (
                        <Text style={[styles.formSuccess, { color: colors.success }]}>
                            Password updated successfully.
                        </Text>
                    )}

                    <TouchableOpacity
                        style={[styles.primaryButton, { backgroundColor: colors.primary }, loading && { opacity: 0.6 }]}
                        onPress={handleSubmit}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.primaryButtonText}>{loading ? 'Updating…' : 'Update password'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: spacing.md }}>
                        <Text style={[styles.switchModeText, { color: colors.primary }]}>Cancel</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { padding: spacing.lg, flexGrow: 1, justifyContent: 'center' },
    subtitle: { fontSize: 14, textAlign: 'center', marginBottom: spacing.lg },
    inputGroup: { gap: spacing.sm, marginBottom: spacing.sm },
    passwordRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: radius.sm,
        paddingHorizontal: 14,
    },
    passwordInput: {
        flex: 1,
        paddingVertical: 14,
        fontSize: 15,
    },
    fieldError: { fontSize: 12, marginTop: -4, marginLeft: 4 },
    hintText: { fontSize: 12, marginTop: -4, marginLeft: 4 },
    formError: { fontSize: 13, marginTop: spacing.sm, marginBottom: spacing.sm, textAlign: 'center' },
    formSuccess: { fontSize: 13, marginTop: spacing.sm, marginBottom: spacing.sm, textAlign: 'center', fontWeight: '600' },
    primaryButton: { borderRadius: radius.sm, padding: 15, alignItems: 'center', marginTop: spacing.sm },
    primaryButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
    switchModeText: { textAlign: 'center', fontSize: 14, fontWeight: '500' },
});