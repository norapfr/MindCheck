import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TEST_TEXTS } from '../utils/testTexts';
import { getToken } from '../services/api';
import baselineScores from '../assets/baseline_scores.json';
import { useTheme } from '../theme/ThemeContext';
import { spacing, radius } from '../theme';

const API_URL = 'http://192.168.8.102:8000';
const MAX_ACCEPTABLE_DIFF = 0.01;

type RowResult = {
    id: number;
    depDiff: number;
    suicDiff: number;
    status: 'ok' | 'FAIL' | 'error';
    message?: string;
};

export default function ModelValidationScreen() {
    const { colors } = useTheme();
    const [running, setRunning] = useState(false);
    const [results, setResults] = useState<RowResult[]>([]);
    const [progressText, setProgressText] = useState('');

    async function preprocessOnBackend(text: string, token: string): Promise<string> {
        const res = await fetch(`${API_URL}/preprocess`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ text }),
        });
        if (!res.ok) throw new Error(`preprocess HTTP ${res.status}`);
        const data = await res.json();
        return data.cleaned_text;
    }

    async function runValidation() {
        setRunning(true);
        setResults([]);

        // Import dinámico: onnxruntime-react-native y react-native-fast-tflite
        // solo se cargan cuando el usuario pulsa este botón, no al arrancar
        // la app. Cargarlos en la cabecera del archivo los inicializaba en
        // el instante 0 (porque React Navigation importa todas las
        // pantallas del Drawer de forma inmediata), antes de que el resto
        // del entorno nativo terminara de asentarse -> "Cannot read
        // property 'install' of null".
        setProgressText('Cargando módulo de inferencia...');
        const { ensureModelsReady, analyzeLocally } = await import('../utils/riskAnalysis');

        setProgressText('Descargando/cargando modelos...');
        await ensureModelsReady((p) => setProgressText(`Descargando ${p.fileName}: ${Math.round(p.progress * 100)}%`));

        const token = await getToken();
        const baselineById = new Map(baselineScores.map((b: any) => [b.id, b]));

        const rows: RowResult[] = [];
        for (const item of TEST_TEXTS) {
            setProgressText(`Procesando texto ${item.id}/${TEST_TEXTS.length}...`);
            try {
                const cleaned = await preprocessOnBackend(item.text, token!);
                const scores = await analyzeLocally(cleaned);
                const baseline = baselineById.get(item.id);

                if (!baseline) {
                    rows.push({ id: item.id, depDiff: NaN, suicDiff: NaN, status: 'error', message: 'sin baseline' });
                    continue;
                }

                const depDiff = Math.abs(scores.depression_score - baseline.depression_score);
                const suicDiff = Math.abs(scores.suicide_risk_score - baseline.suicide_risk_score);
                const status = depDiff > MAX_ACCEPTABLE_DIFF || suicDiff > MAX_ACCEPTABLE_DIFF ? 'FAIL' : 'ok';

                rows.push({ id: item.id, depDiff, suicDiff, status });
            } catch (e: any) {
                rows.push({ id: item.id, depDiff: NaN, suicDiff: NaN, status: 'error', message: e.message });
            }
            setResults([...rows]);
        }

        setProgressText('');
        setRunning(false);
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>Validación del modelo local</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    Compara las puntuaciones calculadas en este dispositivo contra el baseline generado en el backend.
                </Text>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: colors.primary }]}
                    onPress={runValidation}
                    disabled={running}
                >
                    <Text style={styles.buttonText}>{running ? 'Corriendo...' : 'Ejecutar validación'}</Text>
                </TouchableOpacity>

                {running && (
                    <View style={styles.progressRow}>
                        <ActivityIndicator color={colors.primary} />
                        <Text style={[styles.progressText, { color: colors.textSecondary }]}>{progressText}</Text>
                    </View>
                )}

                {results.map((r) => (
                    <View
                        key={r.id}
                        style={[
                            styles.row,
                            { borderColor: r.status === 'ok' ? colors.success : colors.danger },
                        ]}
                    >
                        <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>
                            #{r.id} — {r.status.toUpperCase()}
                        </Text>
                        {r.status !== 'error' ? (
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                                dep_diff: {r.depDiff.toFixed(6)} · suic_diff: {r.suicDiff.toFixed(6)}
                            </Text>
                        ) : (
                            <Text style={{ color: colors.danger, fontSize: 12 }}>{r.message}</Text>
                        )}
                    </View>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, padding: spacing.lg },
    title: { fontSize: 20, fontWeight: '700', marginBottom: spacing.xs },
    subtitle: { fontSize: 13, marginBottom: spacing.lg },
    button: { borderRadius: radius.sm, padding: 14, alignItems: 'center', marginBottom: spacing.md },
    buttonText: { color: '#fff', fontWeight: '600' },
    progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
    progressText: { fontSize: 12, flex: 1 },
    row: { borderWidth: 1, borderRadius: radius.sm, padding: spacing.sm, marginBottom: spacing.xs },
});