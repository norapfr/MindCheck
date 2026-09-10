import { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NetworkError } from '../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { login, AuthError } from '../services/api';
import { spacing, radius } from '../theme';
import { useTheme } from '../theme/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation, route }: Props) {
    const { colors } = useTheme();
    const sessionExpired = route.params?.sessionExpired;

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [formError, setFormError] = useState('');

    function clearErrors() {
        setEmailError('');
        setPasswordError('');
        setFormError('');
    }

    async function handleSubmit() {
        clearErrors();
        setLoading(true);
        try {
            await login(email, password);
            navigation.replace('Main');
        } catch (e: any) {
            if (e instanceof AuthError) {
                if (e.kind === 'invalid_credentials') {
                    setPasswordError(e.message);
                } else {
                    setFormError(e.message);
                }
            } else if (e instanceof NetworkError) {
                setFormError(e.message);
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
                    <Text style={[styles.title, { color: colors.textPrimary }]}>Welcome back</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Log in to continue with MindCheck</Text>

                    {sessionExpired && (
                        <View style={[styles.sessionBanner, { backgroundColor: colors.warning }]}>
                            <Text style={[styles.sessionBannerText, { color: colors.warningText }]}>
                                Your session expired. Please log in again.
                            </Text>
                        </View>
                    )}

                    <View style={styles.inputGroup}>
                        <TextInput
                            style={[
                                styles.input,
                                { borderColor: emailError ? colors.danger : colors.border, backgroundColor: colors.card, color: colors.textPrimary },
                            ]}
                            placeholder="Email"
                            placeholderTextColor={colors.textSecondary}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            returnKeyType="next"
                            value={email}
                            onChangeText={(v) => { setEmail(v); if (emailError) setEmailError(''); }}
                        />
                        {!!emailError && <Text style={[styles.fieldError, { color: colors.danger }]}>{emailError}</Text>}

                        <View style={[
                            styles.passwordRow,
                            { borderColor: passwordError ? colors.danger : colors.border, backgroundColor: colors.card },
                        ]}>
                            <TextInput
                                style={[styles.passwordInput, { color: colors.textPrimary }]}
                                placeholder="Password"
                                placeholderTextColor={colors.textSecondary}
                                secureTextEntry={!showPassword}
                                returnKeyType="done"
                                value={password}
                                onChangeText={(v) => { setPassword(v); if (passwordError) setPasswordError(''); }}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                                <Ionicons
                                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                    size={20}
                                    color={colors.textSecondary}
                                />
                            </TouchableOpacity>
                        </View>
                        {!!passwordError && <Text style={[styles.fieldError, { color: colors.danger }]}>{passwordError}</Text>}
                    </View>

                    {!!formError && <Text style={[styles.formError, { color: colors.danger }]}>{formError}</Text>}

                    <TouchableOpacity
                        style={[styles.primaryButton, { backgroundColor: colors.primary }, loading && { opacity: 0.6 }]}
                        onPress={handleSubmit}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.primaryButtonText}>{loading ? 'Loading…' : 'Log in'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => { clearErrors(); navigation.navigate('Register'); }}
                        style={{ marginTop: spacing.md }}
                    >
                        <Text style={[styles.switchModeText, { color: colors.primary }]}>
                            Don't have an account? Sign up
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { padding: spacing.lg, flexGrow: 1, justifyContent: 'center' },
    title: { fontSize: 26, fontWeight: '700', textAlign: 'center' },
    subtitle: { fontSize: 14, textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.lg },
    sessionBanner: { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg },
    sessionBannerText: { fontSize: 14, textAlign: 'center', fontWeight: '500' },
    inputGroup: { gap: spacing.sm, marginBottom: spacing.sm },
    input: { borderWidth: 1, borderRadius: radius.sm, padding: 14, fontSize: 15 },
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
    formError: { fontSize: 13, marginBottom: spacing.sm, textAlign: 'center' },
    primaryButton: { borderRadius: radius.sm, padding: 15, alignItems: 'center', marginTop: spacing.sm },
    primaryButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
    switchModeText: { textAlign: 'center', fontSize: 14, fontWeight: '500' },
});