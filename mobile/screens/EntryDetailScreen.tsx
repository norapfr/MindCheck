import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HistoryStackParamList } from '../App';
import { spacing, radius, shadow } from '../theme';
import { useTheme } from '../theme/ThemeContext';

type Props = NativeStackScreenProps<HistoryStackParamList, 'EntryDetail'>;

function ScoreRow({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <View style={styles.scoreRow}>
            <Text style={[styles.scoreLabel, { color }]}>{label}</Text>
            <Text style={[styles.scoreValue, { color }]}>{value.toFixed(2)}</Text>
        </View>
    );
}

export default function EntryDetailScreen({ route }: Props) {
    const { colors } = useTheme();
    const { entry } = route.params;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView contentContainerStyle={styles.container}>
                <View style={[styles.textCard, shadow.card, { backgroundColor: colors.card }]}>
                    <Text style={[styles.entryText, { color: colors.textPrimary }]}>{entry.text}</Text>
                </View>

                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Scores</Text>
                <View style={[styles.scoresCard, shadow.card, { backgroundColor: colors.card }]}>
                    <ScoreRow label="Depression" value={entry.depression_score} color={colors.primary} />
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <ScoreRow label="Suicide risk" value={entry.suicide_risk_score} color={colors.textSecondary} />
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <ScoreRow label="Overall risk" value={entry.risk_score} color={colors.danger} />
                </View>

                <View style={[styles.categoryBadge, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.categoryText, { color: colors.primaryDark }]}>{entry.category}</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, padding: spacing.lg },
    textCard: { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg },
    entryText: { fontSize: 15, lineHeight: 22 },
    sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: spacing.sm, textTransform: 'uppercase' },
    scoresCard: { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg },
    scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
    scoreLabel: { fontSize: 14, fontWeight: '600' },
    scoreValue: { fontSize: 14, fontWeight: '700' },
    divider: { height: 1 },
    categoryBadge: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
    categoryText: { fontSize: 13, fontWeight: '600' },
});