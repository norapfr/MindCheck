import { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { register, AuthError, NetworkError } from '../services/api';
import { spacing, radius, shadow } from '../theme';
import { useTheme } from '../theme/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

const MIN_PASSWORD_LENGTH = 8;

export default function RegisterScreen({ navigation }: Props) {
    const { colors } = useTheme();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [consented, setConsented] = useState(false);
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

        if (password.length < MIN_PASSWORD_LENGTH) {
            setPasswordError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
            return;
        }

        if (!consented) {
            setFormError('Please accept the terms below to continue.');
            return;
        }

        setLoading(true);
        try {
            await register(email, password);
            navigation.replace('Main');
        } catch (e: any) {
            if (e instanceof AuthError) {
                if (e.kind === 'email_in_use') {
                    setEmailError(e.message);
                } else if (e.kind === 'weak_password') {
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
                    <Text style={[styles.title, { color: colors.textPrimary }]}>Create your account</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Start your MindCheck journal</Text>

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
                        {!passwordError && (
                            <Text style={[styles.hintText, { color: colors.textSecondary }]}>
                                At least {MIN_PASSWORD_LENGTH} characters.
                            </Text>
                        )}
                    </View>

                    <View style={[styles.disclaimerBox, shadow.card, { backgroundColor: colors.card }]}>
                        <Text style={[styles.disclaimerText, { color: colors.textPrimary }]}>
                            MindCheck is a self-awareness and emotional support tool.
                            {'\n\n'}
                            <Text style={{ fontWeight: '700' }}>It does not diagnose any medical
                                condition and does not replace professional help.</Text> If at any
                            point you feel you need to talk to someone, the "Help Resources" screen
                            is always available.
                            {'\n\n'}
                            What you write in your journal is analyzed to give you a sense of your
                            mood over time. You can export or delete all your data anytime from
                            Settings.
                        </Text>
                    </View>

                    <TouchableOpacity style={styles.checkboxRow} onPress={() => setConsented(!consented)} activeOpacity={0.7}>
                        <View style={[
                            styles.checkbox,
                            { borderColor: colors.textSecondary },
                            consented && { backgroundColor: colors.primary, borderColor: colors.primary },
                        ]} />
                        <Text style={[styles.checkboxLabel, { color: colors.textPrimary }]}>I've read and accept the above</Text>
                    </TouchableOpacity>

                    {!!formError && <Text style={[styles.formError, { color: colors.danger }]}>{formError}</Text>}

                    <TouchableOpacity
                        style={[styles.primaryButton, { backgroundColor: colors.primary }, loading && { opacity: 0.6 }]}
                        onPress={handleSubmit}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.primaryButtonText}>{loading ? 'Loading…' : 'Create account'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => { clearErrors(); navigation.navigate('Login'); }}
                        style={{ marginTop: spacing.md }}
                    >
                        <Text style={[styles.switchModeText, { color: colors.primary }]}>
                            Already have an account? Log in
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
    inputGroup: { gap: spacing.sm, marginBottom: spacing.lg },
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
    hintText: { fontSize: 12, marginTop: -4, marginLeft: 4 },
    disclaimerBox: { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
    disclaimerText: { fontSize: 14, lineHeight: 21 },
    checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
    checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, marginRight: spacing.sm },
    checkboxLabel: { fontSize: 14, flex: 1 },
    formError: { fontSize: 13, marginBottom: spacing.sm, textAlign: 'center' },
    primaryButton: { borderRadius: radius.sm, padding: 15, alignItems: 'center' },
    primaryButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
    switchModeText: { textAlign: 'center', fontSize: 14, fontWeight: '500' },
});