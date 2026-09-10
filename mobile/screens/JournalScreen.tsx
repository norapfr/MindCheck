import { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { DrawerScreenProps } from '@react-navigation/drawer';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainDrawerParamList, RootStackParamList } from '../App';
import { analyzeEntry, AnalyzeError, SessionExpiredError, NetworkError } from '../services/api';
import { spacing, radius } from '../theme';
import { useTheme } from '../theme/ThemeContext';

type Props = CompositeScreenProps<
    DrawerScreenProps<MainDrawerParamList, 'Journal'>,
    NativeStackScreenProps<RootStackParamList>
>;

type Feedback = { type: 'error' | 'success'; text: string } | null;

export default function JournalScreen({ navigation }: Props) {
    const { colors } = useTheme();
    const [text, setText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<Feedback>(null);

    async function handleSave() {
        if (!text.trim()) return;
        setFeedback(null);
        setSubmitting(true);
        try {
            const result = await analyzeEntry(text);
            setText('');
            if (result.high_risk) {
                navigation.navigate('Resources', { autoTriggered: true });
                return;
            }
            setFeedback({ type: 'success', text: 'Entry saved. Thanks for writing today.' });
        } catch (e: any) {
            if (e instanceof SessionExpiredError) return; // ya se está redirigiendo a Onboarding
            if (e instanceof NetworkError) {
                setFeedback({ type: 'error', text: e.message });
            } else if (e instanceof AnalyzeError && e.kind !== 'generic') {
                setFeedback({ type: 'error', text: e.message });
            } else {
                setFeedback({ type: 'error', text: e.message ?? 'Could not analyze this entry.' });
            }
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <ScrollView
                    contentContainerStyle={styles.container}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <Text style={[styles.label, { color: colors.textPrimary }]}>How are you feeling today?</Text>
                    <TextInput
                        style={[styles.textArea, { borderColor: colors.border, backgroundColor: colors.card, color: colors.textPrimary }]}
                        multiline
                        placeholder="Write freely…"
                        placeholderTextColor={colors.textSecondary}
                        value={text}
                        onChangeText={(v) => { setText(v); if (feedback) setFeedback(null); }}
                        textAlignVertical="top"
                    />

                    <TouchableOpacity
                        style={[styles.saveButton, { backgroundColor: colors.primary }, submitting && { opacity: 0.6 }]}
                        onPress={handleSave}
                        disabled={submitting}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.saveButtonText}>{submitting ? 'Saving…' : 'Save entry'}</Text>
                    </TouchableOpacity>

                    {!!feedback && (
                        <Text
                            style={[
                                styles.feedbackText,
                                { color: feedback.type === 'error' ? colors.danger : colors.success },
                            ]}
                        >
                            {feedback.text}
                        </Text>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, padding: spacing.lg },
    label: { fontSize: 18, fontWeight: '600', marginBottom: spacing.sm },
    textArea: {
        minHeight: 220,
        borderWidth: 1,
        borderRadius: radius.md,
        padding: spacing.md,
        fontSize: 15,
        marginBottom: spacing.md,
    },
    saveButton: { borderRadius: radius.sm, padding: 15, alignItems: 'center' },
    saveButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
    feedbackText: { fontSize: 13, marginTop: spacing.sm, textAlign: 'center' },
});