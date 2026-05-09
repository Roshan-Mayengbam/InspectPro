import React, { useState, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, FlatList,
   StyleSheet, StatusBar, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONT, SPACING, RADIUS } from '../theme';
import { loadInspections, deleteInspection } from '../utils/storage';

const TYPE_COLORS = {
    'Move-Out': { text: COLORS.amber, bg: 'rgba(232,160,32,0.1)', border: 'rgba(232,160,32,0.3)' },
    'Move-In': { text: COLORS.green, bg: COLORS.greenBg, border: COLORS.greenBorder },
    Routine: { text: COLORS.blue, bg: COLORS.blueBg, border: COLORS.blueBorder },
    Annual: { text: '#c084fc', bg: 'rgba(192,132,252,0.1)', border: 'rgba(192,132,252,0.3)' },
};

export default function HomeScreen({ navigation }) {
    const [inspections, setInspections] = useState([]);
    const [stats, setStats] = useState({ total: 0, completed: 0, totalIssues: 0 });

    useFocusEffect(
        useCallback(() => {
            loadInspections().then((data) => {
                setInspections(data);
                const total = data.length;
                const completed = data.filter((i) => i.status === 'complete').length;
                const totalIssues = data
                    .flatMap((i) => i.rooms.flatMap((r) => r.items))
                    .filter((item) => item.status === 'issue').length;
                setStats({ total, completed, totalIssues });
            });
        }, [])
    );

    const handleDelete = (id, address) => {
        Alert.alert('Delete Inspection', `Delete "${address}"? This cannot be undone.`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                    await deleteInspection(id);
                    setInspections((prev) => prev.filter((i) => i.id !== id));
                },
            },
        ]);
    };

    const renderCard = ({ item }) => {
        const tc = TYPE_COLORS[item.type] || TYPE_COLORS.Routine;
        const isComplete = item.status === 'complete';
        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('Report', { inspectionId: item.id })}
                onLongPress={() => handleDelete(item.id, item.address)}
                activeOpacity={0.8}
            >
                <View style={styles.cardRow}>
                    <Text style={styles.cardAddress} numberOfLines={1}>{item.address}</Text>
                    <View style={[styles.badge, { backgroundColor: tc.bg, borderColor: tc.border }]}>
                        <Text style={[styles.badgeText, { color: tc.text }]}>{item.type.toUpperCase()}</Text>
                    </View>
                </View>
                <View style={styles.cardRowBottom}>
                    <View style={styles.dateRow}>
                        <MaterialIcons name="calendar-today" size={12} color={COLORS.textMuted} />
                        <Text style={styles.dateText}>{item.date}</Text>
                    </View>
                    {isComplete ? (
                        <View style={[styles.badge, { backgroundColor: COLORS.greenBg, borderColor: COLORS.greenBorder }]}>
                            <Text style={[styles.badgeText, { color: COLORS.green }]}>PDF READY</Text>
                        </View>
                    ) : (
                        <View style={[styles.badge, { backgroundColor: COLORS.blueBg, borderColor: COLORS.blueBorder }]}>
                            <Text style={[styles.badgeText, { color: COLORS.blue }]}>IN PROGRESS</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.appName}>InspectPro</Text>
                    <Text style={styles.appSub}>PROPERTY INSPECTOR</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.iconBtn}>
                    <MaterialIcons name="settings" size={24} color={COLORS.amber} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={inspections}
                keyExtractor={(item) => item.id}
                renderItem={renderCard}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={() => (
                    <>
                        {/* New Inspection CTA */}
                        <TouchableOpacity
                            style={styles.ctaBtn}
                            onPress={() => navigation.navigate('NewInspection')}
                            activeOpacity={0.85}
                        >
                            <View style={styles.ctaInner}>
                                <MaterialIcons name="add-circle" size={28} color={COLORS.amberDark} />
                                <Text style={styles.ctaTitle}>New Inspection</Text>
                            </View>
                            <Text style={styles.ctaSub}>Start a property walkthrough</Text>
                        </TouchableOpacity>

                        {/* Stats strip */}
                        {stats.total > 0 && (
                            <View style={styles.statsStrip}>
                                {[
                                    { label: 'TOTAL', value: stats.total, color: COLORS.blue },
                                    { label: 'DONE', value: stats.completed, color: COLORS.green },
                                    { label: 'ISSUES', value: stats.totalIssues, color: COLORS.red },
                                ].map((s) => (
                                    <View key={s.label} style={styles.statItem}>
                                        <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                                        <Text style={styles.statLabel}>{s.label}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Section label */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionLabel}>RECENT</Text>
                        </View>
                    </>
                )}
                ListEmptyComponent={() => (
                    <View style={styles.emptyState}>
                        <MaterialIcons name="home-work" size={56} color={COLORS.textMuted} />
                        <Text style={styles.emptyText}>No inspections yet</Text>
                        <Text style={styles.emptySubText}>Tap "New Inspection" to get started.</Text>
                    </View>
                )}
            />

            {/* Bottom Nav */}
            <View style={styles.bottomNav}>
                <View style={[styles.navTab, styles.navTabActive]}>
                    <MaterialIcons name="home-work" size={22} color={COLORS.amberDark} />
                    <Text style={[styles.navLabel, { color: COLORS.amberDark }]}>HOME</Text>
                </View>
                <TouchableOpacity style={styles.navTab} onPress={() => navigation.navigate('NewInspection')}>
                    <MaterialIcons name="add-box" size={22} color={COLORS.textMuted} />
                    <Text style={styles.navLabel}>NEW</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.navTab}
                    onPress={() => {
                        const complete = inspections.find((i) => i.status === 'complete');
                        if (complete) navigation.navigate('Report', { inspectionId: complete.id });
                        else if (inspections[0]) navigation.navigate('Report', { inspectionId: inspections[0].id });
                    }}
                >
                    <MaterialIcons name="description" size={22} color={COLORS.textMuted} />
                    <Text style={styles.navLabel}>REPORTS</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: COLORS.background },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: SPACING.md, height: 64,
        backgroundColor: COLORS.background, borderBottomWidth: 2, borderBottomColor: COLORS.border,
    },
    appName: { fontSize: 22, fontWeight: '900', color: COLORS.amber, letterSpacing: -0.5, textTransform: 'uppercase' },
    appSub: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 3, textTransform: 'uppercase', marginTop: 1 },
    iconBtn: { padding: SPACING.sm },
    listContent: { padding: SPACING.md, paddingBottom: 100 },
    ctaBtn: {
        backgroundColor: COLORS.amber, borderRadius: RADIUS.sm, padding: 20, marginBottom: 16,
    },
    ctaInner: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
    ctaTitle: { fontSize: 22, fontWeight: '800', color: COLORS.amberDark },
    ctaSub: { fontSize: 13, color: COLORS.amberDark, marginLeft: 38, opacity: 0.8 },
    statsStrip: {
        flexDirection: 'row', backgroundColor: COLORS.surface,
        borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm,
        marginBottom: 16, overflow: 'hidden',
    },
    statItem: { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 3 },
    statValue: { fontSize: 22, fontWeight: '800' },
    statLabel: { ...FONT.label, fontSize: 9, color: COLORS.textMuted },
    sectionHeader: { borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 8, marginBottom: 10 },
    sectionLabel: { ...FONT.label, color: COLORS.textMuted },
    card: {
        backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
        borderRadius: RADIUS.sm, padding: 14, marginBottom: 10,
    },
    cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
    cardAddress: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary, flex: 1 },
    cardRowBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    dateText: { fontSize: 12, color: COLORS.textMuted },
    badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 3, borderWidth: 1 },
    badgeText: { ...FONT.mono, fontSize: 10 },
    emptyState: { alignItems: 'center', paddingTop: 60, gap: 10 },
    emptyText: { fontSize: 18, fontWeight: '700', color: COLORS.textSecondary },
    emptySubText: { fontSize: 13, color: COLORS.textMuted },
    bottomNav: {
        flexDirection: 'row', height: 64, backgroundColor: COLORS.surface,
        borderTopWidth: 2, borderTopColor: COLORS.border,
        alignItems: 'center', justifyContent: 'space-around',
    },
    navTab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 8 },
    navTabActive: {
        backgroundColor: COLORS.amber, borderRadius: RADIUS.sm,
        marginHorizontal: 4, maxWidth: 110,
    },
    navLabel: { ...FONT.mono, fontSize: 9, color: COLORS.textMuted },
});
