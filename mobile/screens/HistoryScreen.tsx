import { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { CartesianChart, Line } from 'victory-native';
import type { DrawerScreenProps } from '@react-navigation/drawer';
import type { MainDrawerParamList } from '../App';
import { getEntries, JournalEntry, SessionExpiredError, NetworkError } from '../services/api';
import { spacing, radius, shadow } from '../theme';
import { useTheme } from '../theme/ThemeContext';

type Props = DrawerScreenProps<MainDrawerParamList, 'History'>;

export default function HistoryScreen(_props: Props) {
    const { colors } = useTheme();
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    useFocusEffect(
        useCallback(() => {
            let isActive = true;
            setLoading(true);
            setLoadError('');

            getEntries()
                .then((data) => {
                    if (isActive) setEntries(data);
                })
                .catch((e) => {
                    if (!isActive) return;
                    if (e instanceof SessionExpiredError) return; // ya se está redirigiendo a Onboarding
                    if (e instanceof NetworkError) {
                        setLoadError(e.message);
                    } else {
                        setLoadError(e.message ?? 'Could not load your history');
                    }
                })
                .finally(() => {
                    if (isActive) setLoading(false);
                });

            return () => { isActive = false; };
        }, [])
    );

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center' }]}>
                <ActivityIndicator color={colors.primary} />
            </SafeAreaView>
        );
    }

    if (loadError) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center' }]}>
                <Text style={[styles.emptyText, { color: colors.danger }]}>{loadError}</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {entries.length > 0 && (
                <>
                    <View style={[styles.chartCard, shadow.card, { backgroundColor: colors.card, width: Dimensions.get('window').width - spacing.lg * 2, height: 220 }]}>
                        <CartesianChart
                            data={entries.map((entry, index) => ({
                                x: index + 1,
                                depression: entry.depression_score,
                                suicideRisk: entry.suicide_risk_score,
                            }))}
                            xKey="x"
                            yKeys={["depression", "suicideRisk"]}
                            domain={{ y: [0, 1] }}
                        >
                            {({ points }) => (
                                <>
                                    <Line points={points.depression} color={colors.primary} strokeWidth={3} />
                                    <Line points={points.suicideRisk} color={colors.textSecondary} strokeWidth={3} />
                                </>
                            )}
                        </CartesianChart>
                    </View>
                    <View style={styles.legend}>
                        <Text style={[styles.legendText, { color: colors.primary }]}>● Depression</Text>
                        <Text style={[styles.legendText, { color: colors.textSecondary }]}>● Suicide risk</Text>
                    </View>
                </>
            )}

            <FlatList
                style={styles.list}
                data={[...entries].reverse()}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={entries.length === 0 ? styles.emptyListContent : { paddingTop: spacing.sm }}
                ListEmptyComponent={
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>You don't have any entries yet. Write your first one in Journal.</Text>
                }
                renderItem={({ item }) => (
                    <View style={[styles.entryRow, shadow.card, { backgroundColor: colors.card }]}>
                        <Text style={[styles.entryText, { color: colors.textPrimary }]} numberOfLines={2}>{item.text}</Text>
                        <Text style={[styles.entryScore, { color: colors.textSecondary }]}>
                            depression {item.depression_score.toFixed(2)} · suicide risk {item.suicide_risk_score.toFixed(2)} · {item.category}
                        </Text>
                    </View>
                )}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: spacing.lg },
    list: { flex: 1 },
    emptyListContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
    chartCard: { borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.sm },
    emptyText: { textAlign: 'center', paddingHorizontal: spacing.lg },
    entryRow: { borderRadius: radius.sm, padding: spacing.md, marginBottom: spacing.sm },
    entryText: { fontSize: 14 },
    entryScore: { fontSize: 12, marginTop: spacing.xs },
    legend: { flexDirection: 'row', gap: 20, marginBottom: spacing.sm },
    legendText: { fontSize: 12, fontWeight: '500' },
});