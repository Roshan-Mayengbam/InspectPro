import React from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    StatusBar, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../theme';
import { setOnboarded } from '../utils/storage';

const { width } = Dimensions.get('window');

export default function OnboardingScreen({ navigation }) {
    const handleGetStarted = async () => {
        await setOnboarded();
        navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    };

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

            <View style={styles.container}>
                {/* Icon */}
                <View style={styles.iconWrap}>
                    <MaterialIcons name="home-work" size={72} color={COLORS.amber} />
                </View>

                {/* Title */}
                <Text style={styles.title}>InspectPro</Text>
                <Text style={styles.subtitle}>PROPERTY INSPECTOR</Text>

                {/* Feature list */}
                <View style={styles.features}>
                    {[
                        { icon: 'checklist', text: 'Room-by-room checklists' },
                        { icon: 'add-a-photo', text: 'Attach photos to issues' },
                        { icon: 'picture-as-pdf', text: 'Generate & share PDF reports' },
                        { icon: 'cloud-off', text: '100% offline — no account needed' },
                    ].map((f) => (
                        <View key={f.icon} style={styles.featureRow}>
                            <MaterialIcons name={f.icon} size={20} color={COLORS.amber} />
                            <Text style={styles.featureText}>{f.text}</Text>
                        </View>
                    ))}
                </View>

                {/* CTA */}
                <TouchableOpacity style={styles.ctaBtn} onPress={handleGetStarted} activeOpacity={0.85}>
                    <Text style={styles.ctaText}>GET STARTED</Text>
                    <MaterialIcons name="arrow-forward" size={22} color={COLORS.amberDark} />
                </TouchableOpacity>

                <Text style={styles.footer}>No account • No cloud • No tracking</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: COLORS.background },
    container: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: 32, gap: 16,
    },
    iconWrap: {
        width: 120, height: 120, borderRadius: 24,
        backgroundColor: 'rgba(232,160,32,0.1)',
        borderWidth: 1, borderColor: 'rgba(232,160,32,0.3)',
        alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    },
    title: {
        fontSize: 38, fontWeight: '900', color: COLORS.amber,
        letterSpacing: -1, textTransform: 'uppercase',
    },
    subtitle: {
        fontSize: 12, fontWeight: '700', color: COLORS.textMuted,
        letterSpacing: 4, textTransform: 'uppercase', marginTop: -8,
    },
    features: {
        width: '100%', gap: 14, marginTop: 16, marginBottom: 8,
        backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
        borderWidth: 1, borderColor: COLORS.border,
        padding: 20,
    },
    featureRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    featureText: { fontSize: 15, color: COLORS.textPrimary, fontWeight: '400' },
    ctaBtn: {
        width: '100%', backgroundColor: COLORS.amber, borderRadius: RADIUS.sm,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, paddingVertical: 18, marginTop: 8,
    },
    ctaText: { fontSize: 17, fontWeight: '900', color: COLORS.amberDark, letterSpacing: 1.5 },
    footer: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
});
