import { useCallback, useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { DrawerScreenProps } from '@react-navigation/drawer';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainDrawerParamList, RootStackParamList } from '../App';
import { analyzeEntry, getEntries, AnalyzeError, SessionExpiredError, NetworkError } from '../services/api';
import { computeStreak, StreakInfo } from '../utils/streak';
import { getRandomPrompt } from '../utils/prompts';
import { spacing, radius } from '../theme';
import { useTheme } from '../theme/ThemeContext';

type JournalScreenProps = CompositeScreenProps<
    DrawerScreenProps<MainDrawerParamList, 'Journal'>,
    NativeStackScreenProps<RootStackParamList>
>;

type Feedback = { type: 'error' | 'success'; text: string } | null;

export default function JournalScreen({ navigation }: JournalScreenProps) {
    const { colors } = useTheme();
    const [text, setText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<Feedback>(null);
    const [streakInfo, setStreakInfo] = useState<StreakInfo | null>(null);
    const [prompt, setPrompt] = useState(() => getRandomPrompt());
    const [downloadStatus, setDownloadStatus] = useState('');
    const loadStreak = useCallback(() => {
        getEntries()
            .then((entries) => setStreakInfo(computeStreak(entries)))
            .catch(() => {
                // fallo de red o sesión expirada -> simplemente no mostramos
                // la racha, el resto de la pantalla sigue siendo usable
            });
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadStreak();
        }, [loadStreak])
    );

    async function handleSave() {
        if (!text.trim()) return;
        setFeedback(null);
        setSubmitting(true);
        try {
            const result = await analyzeEntry(text, (p) => {
                setDownloadStatus(`Preparing on-device analysis: ${p.fileName} ${Math.round(p.progress * 100)}%`);
            });
            setDownloadStatus('');
            setText('');
            setPrompt(getRandomPrompt(prompt));
            if (result.high_risk) {
                navigation.navigate('Resources', { autoTriggered: true });
                return;
            }
            setFeedback({ type: 'success', text: 'Entry saved. Thanks for writing today.' });
            loadStreak();
        } catch (e: any) {
            setDownloadStatus('');
            if (e instanceof SessionExpiredError) return;
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
    function streakLabel(): string | null {
        if (!streakInfo) return null;
        if (streakInfo.streak === 0) return 'Write today to start a streak.';
        if (streakInfo.hasEntryToday) {
            return streakInfo.streak === 1
                ? '🔥 1-day streak — you wrote today.'
                : `🔥 ${streakInfo.streak}-day streak — you wrote today.`;
        }
        return `🔥 ${streakInfo.streak}-day streak — write today to keep it going.`;
    }

    const label = streakLabel();

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
                    {!!label && (
                        <View style={[styles.streakBanner, { backgroundColor: colors.primaryLight }]}>
                            <Text style={[styles.streakText, { color: colors.primaryDark }]}>{label}</Text>
                        </View>
                    )}

                    <Text style={[styles.label, { color: colors.textPrimary }]}>How are you feeling today?</Text>

                    {text.trim().length === 0 && (
                        <View style={styles.promptRow}>
                            <Text style={[styles.promptText, { color: colors.textSecondary }]}>💭 {prompt}</Text>
                            <TouchableOpacity
                                onPress={() => setPrompt(getRandomPrompt(prompt))}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Text style={[styles.promptRefresh, { color: colors.primary }]}>Try another</Text>
                            </TouchableOpacity>
                        </View>
                    )}

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
                    {!!downloadStatus && (
                        <Text style={[styles.feedbackText, { color: colors.textSecondary }]}>{downloadStatus}</Text>
                    )}

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
    streakBanner: { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
    streakText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
    label: { fontSize: 18, fontWeight: '600', marginBottom: spacing.sm },
    promptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
    promptText: { fontSize: 13, fontStyle: 'italic', flex: 1, marginRight: spacing.sm },
    promptRefresh: { fontSize: 12, fontWeight: '600' },
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