
import {
    View,
    Text,
    Linking,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { DrawerScreenProps } from '@react-navigation/drawer';
import type { MainDrawerParamList } from '../App';
import { spacing, radius, shadow } from '../theme';
import { useTheme } from '../theme/ThemeContext';

type Props = DrawerScreenProps<MainDrawerParamList, 'Resources'>;

const HELPLINES = [
    // Spain
    {
        country: '🇪🇸 Spain',
        name: '024 — Suicide behaviour helpline',
        phone: '024',
    },
    {
        country: '🇪🇸 Spain',
        name: 'Teléfono de la Esperanza',
        phone: '717003717',
    },
    {
        country: '🇪🇸 Spain',
        name: 'Emergency services',
        phone: '112',
    },

    // United States
    {
        country: '🇺🇸 United States',
        name: '988 Suicide & Crisis Lifeline',
        phone: '988',
    },
    {
        country: '🇺🇸 United States',
        name: 'Emergency services',
        phone: '911',
    },

    // Canada
    {
        country: '🇨🇦 Canada',
        name: '988 Suicide Crisis Helpline',
        phone: '988',
    },
    {
        country: '🇨🇦 Canada',
        name: 'Emergency services',
        phone: '911',
    },

    // United Kingdom
    {
        country: '🇬🇧 United Kingdom',
        name: 'Samaritans',
        phone: '116123',
    },
    {
        country: '🇬🇧 United Kingdom',
        name: 'Emergency services',
        phone: '999',
    },

    // Ireland
    {
        country: '🇮🇪 Ireland',
        name: 'Samaritans',
        phone: '116123',
    },
    {
        country: '🇮🇪 Ireland',
        name: 'Emergency services',
        phone: '112',
    },

    // France
    {
        country: '🇫🇷 France',
        name: '3114 — National Suicide Prevention Hotline',
        phone: '3114',
    },
    {
        country: '🇫🇷 France',
        name: 'Emergency services',
        phone: '112',
    },

    // Germany
    {
        country: '🇩🇪 Germany',
        name: 'TelefonSeelsorge',
        phone: '116123',
    },
    {
        country: '🇩🇪 Germany',
        name: 'Emergency services',
        phone: '112',
    },

    // Australia
    {
        country: '🇦🇺 Australia',
        name: 'Lifeline',
        phone: '131114',
    },
    {
        country: '🇦🇺 Australia',
        name: 'Emergency services',
        phone: '000',
    },
];

export default function ResourcesScreen({ route }: Props) {
    const { colors } = useTheme();
    const autoTriggered = route.params?.autoTriggered;

    const handleCall = (phone: string) => {
        Linking.openURL(`tel:${phone}`);
    };

    return (
        <SafeAreaView
            style={{
                flex: 1,
                backgroundColor: colors.background,
            }}
        >
            <ScrollView
                contentContainerStyle={styles.container}
                showsVerticalScrollIndicator={false}
            >
                {autoTriggered && (
                    <View
                        style={[
                            styles.autoBanner,
                            { backgroundColor: colors.warning },
                        ]}
                    >
                        <Text
                            style={[
                                styles.autoBannerText,
                                { color: colors.warningText },
                            ]}
                        >
                            This could be a good moment to talk to someone.
                            Here&apos;s immediate help.
                        </Text>
                    </View>
                )}

                <Text
                    style={[
                        styles.title,
                        { color: colors.textPrimary },
                    ]}
                >
                    Help lines
                </Text>

                <Text
                    style={[
                        styles.subtitle,
                        { color: colors.textSecondary },
                    ]}
                >
                    If you need someone to talk to, you can contact one of
                    these services. Tap a number to call.
                </Text>

                {HELPLINES.map((helpline, index) => {
                    const showCountry =
                        index === 0 ||
                        HELPLINES[index - 1].country !== helpline.country;

                    return (
                        <View
                            key={`${helpline.country}-${helpline.phone}-${index}`}
                        >
                            {showCountry && (
                                <Text
                                    style={[
                                        styles.country,
                                        { color: colors.textPrimary },
                                    ]}
                                >
                                    {helpline.country}
                                </Text>
                            )}

                            <TouchableOpacity
                                style={[
                                    styles.card,
                                    shadow.card,
                                    { backgroundColor: colors.card },
                                ]}
                                onPress={() =>
                                    handleCall(helpline.phone)
                                }
                                activeOpacity={0.8}
                            >
                                <Text
                                    style={[
                                        styles.cardName,
                                        { color: colors.textPrimary },
                                    ]}
                                >
                                    {helpline.name}
                                </Text>

                                <Text
                                    style={[
                                        styles.cardPhone,
                                        { color: colors.primary },
                                    ]}
                                >
                                    {helpline.phone}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    );
                })}

                <Text
                    style={[
                        styles.footnote,
                        { color: colors.textSecondary },
                    ]}
                >
                    If you are in immediate danger, contact your local
                    emergency services.
                </Text>

                <Text
                    style={[
                        styles.footnote,
                        { color: colors.textSecondary },
                    ]}
                >
                    Talking to someone isn&apos;t a failure — it&apos;s a step
                    forward.
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: spacing.lg,
        paddingBottom: spacing.xl,
    },

    autoBanner: {
        padding: spacing.md,
        borderRadius: radius.md,
        marginBottom: spacing.lg,
    },

    autoBannerText: {
        fontSize: 15,
        lineHeight: 21,
        fontWeight: '500',
    },

    title: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: spacing.xs,
    },

    subtitle: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: spacing.md,
    },

    country: {
        fontSize: 17,
        fontWeight: '700',
        marginTop: spacing.md,
        marginBottom: spacing.sm,
    },

    card: {
        borderRadius: radius.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },

    cardName: {
        fontSize: 16,
        fontWeight: '600',
    },

    cardPhone: {
        fontSize: 14,
        marginTop: spacing.xs,
        fontWeight: '600',
    },

    footnote: {
        fontSize: 13,
        lineHeight: 19,
        marginTop: spacing.md,
        textAlign: 'center',
    },
});
