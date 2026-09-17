import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { spacing, radius, shadow } from '../theme';
import { useTheme } from '../theme/ThemeContext';

type ConfirmModalProps = {
    visible: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel?: string;
    destructive?: boolean;
    loading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
};

export default function ConfirmModal({
    visible,
    title,
    message,
    confirmLabel,
    cancelLabel = 'Cancel',
    destructive = false,
    loading = false,
    onConfirm,
    onCancel,
}: ConfirmModalProps) {
    const { colors } = useTheme();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onCancel}
            statusBarTranslucent
        >
            <Pressable style={styles.backdrop} onPress={loading ? undefined : onCancel}>
                <Pressable
                    style={[
                        styles.card,
                        shadow.card,
                        { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                    // evita que tocar la tarjeta cierre el modal (solo el backdrop lo hace)
                    onPress={() => { }}
                >
                    <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
                    <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>

                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[
                                styles.button,
                                styles.cancelButton,
                                { borderColor: colors.border },
                            ]}
                            onPress={onCancel}
                            disabled={loading}
                            activeOpacity={0.75}
                        >
                            <Text style={[styles.buttonText, { color: colors.textPrimary }]}>
                                {cancelLabel}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.button,
                                {
                                    backgroundColor: destructive ? colors.danger : colors.primary,
                                    opacity: loading ? 0.7 : 1,
                                },
                            ]}
                            onPress={onConfirm}
                            disabled={loading}
                            activeOpacity={0.85}
                        >
                            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
                                {loading ? '…' : confirmLabel}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    card: {
        width: '100%',
        maxWidth: 360,
        borderRadius: radius.lg ?? radius.md,
        borderWidth: 1,
        padding: spacing.lg,
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
        marginBottom: spacing.xs,
    },
    message: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: spacing.lg,
    },
    actions: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    button: {
        flex: 1,
        paddingVertical: spacing.sm + 2,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        borderWidth: 1,
        backgroundColor: 'transparent',
    },
    buttonText: {
        fontSize: 15,
        fontWeight: '600',
    },
});