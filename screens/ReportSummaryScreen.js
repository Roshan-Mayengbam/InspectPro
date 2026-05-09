import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Image,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const COLORS = {
    bg: '#0a0d14',
    surface: '#0d1117',
    surfaceHigh: '#302920',
    surfaceHighest: '#3b342a',
    border: '#1e2535',
    outline: '#9e8e7a',
    orange: '#e8a020',
    textPrimary: '#eee0d3',
    textSecondary: '#bfc6db',
    error: '#ffb4ab',
    errorBg: 'rgba(147,0,10,0.1)',
    errorBorder: 'rgba(255,180,171,0.3)',
    blue: '#4ab7fc',
    green: '#4ade80',
    greenBg: 'rgba(74,222,128,0.1)',
    greenBorder: 'rgba(74,222,128,0.3)',
};

const FLAGGED_ISSUES = [
    {
        id: '1',
        location: 'Kitchen · Cabinets',
        severity: 'Major',
        description: 'Scratched surface on lower cabinets near sink.',
        imageUri: 'https://via.placeholder.com/64x64/302920/9e8e7a?text=📷',
    },
    {
        id: '2',
        location: 'Living Room · Floor',
        severity: 'Minor',
        description: 'Water damage near the window sill.',
        imageUri: 'https://via.placeholder.com/64x64/302920/9e8e7a?text=📷',
    },
];

const { width } = Dimensions.get('window');
const A4_WIDTH = Math.min(width - 64, 340);
const A4_HEIGHT = A4_WIDTH * 1.414;

export default function ReportSummaryScreen({ navigation, route }) {
    const { inspection } = route?.params || {};
    const address = inspection?.address || '124 Baker St';
    const type = inspection?.type || 'Move-Out';
    const date = inspection?.date || 'Oct 12, 2023';

    const [pdfReady] = useState(true);

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                    <MaterialIcons name="arrow-back" size={24} color={COLORS.orange} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>InspectPro</Text>
                <TouchableOpacity style={styles.iconBtn}>
                    <MaterialIcons name="more-vert" size={24} color={COLORS.orange} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Summary Header Card */}
                <View style={styles.summaryCard}>
                    <View>
                        <Text style={styles.propertyName}>{address}</Text>
                        <View style={styles.metaRow}>
                            <View style={[styles.typeBadge]}>
                                <Text style={styles.typeBadgeText}>{type.toUpperCase()}</Text>
                            </View>
                            <Text style={styles.dateText}>{date}</Text>
                        </View>
                    </View>
                    <View style={styles.statsRow}>
                        {[
                            { label: 'ROOMS', value: '5', color: COLORS.blue },
                            { label: 'ISSUES', value: '3', color: COLORS.error },
                            { label: 'PHOTOS', value: '11', color: COLORS.green },
                        ].map((s) => (
                            <View key={s.label} style={styles.statBox}>
                                <Text style={styles.statLabel}>{s.label}</Text>
                                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Flagged Issues */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>FLAGGED ISSUES</Text>
                    {FLAGGED_ISSUES.map((issue) => (
                        <View key={issue.id} style={styles.issueCard}>
                            <MaterialIcons name="warning" size={22} color={COLORS.error} style={{ marginTop: 2 }} />
                            <View style={{ flex: 1 }}>
                                <View style={styles.issueHeader}>
                                    <Text style={styles.issueLocation}>{issue.location.toUpperCase()}</Text>
                                    <Text style={styles.issueSeverity}>{issue.severity}</Text>
                                </View>
                                <Text style={styles.issueDesc}>{issue.description}</Text>
                                <View style={styles.thumbRow}>
                                    <View style={styles.thumbPlaceholder}>
                                        <MaterialIcons name="photo" size={24} color="#64748b" />
                                    </View>
                                </View>
                            </View>
                        </View>
                    ))}
                </View>

                {/* PDF Preview Mockup */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>REPORT PREVIEW</Text>
                    <View style={styles.previewContainer}>
                        <View style={[styles.a4Paper, { width: A4_WIDTH, height: A4_HEIGHT }]}>
                            <View style={styles.a4Header}>
                                <Text style={styles.a4Title}>{'INSPECTION\nREPORT'}</Text>
                                <Text style={styles.a4Ref}>REF: IP-23-10-12A</Text>
                            </View>
                            <Text style={styles.a4Line}>Property: {address}</Text>
                            <Text style={[styles.a4Line, { marginBottom: 16 }]}>Date: {date}</Text>
                            <View style={styles.a4LineBlock} />
                            <View style={[styles.a4LineBlock, { width: '80%' }]} />
                            <View style={[styles.a4LineBlock, { width: '65%', marginBottom: 12 }]} />
                            <View style={styles.a4ImgRow}>
                                <View style={styles.a4ImgBlock} />
                                <View style={styles.a4ImgBlock} />
                            </View>
                            <Text style={styles.a4Footer}>Generated by InspectPro</Text>
                        </View>
                    </View>
                </View>

                {/* Generate PDF */}
                <TouchableOpacity style={styles.genBtn}>
                    <MaterialIcons name="download" size={20} color="#5b3b00" />
                    <Text style={styles.genBtnText}>GENERATE & SHARE PDF</Text>
                </TouchableOpacity>

                {/* PDF Ready State */}
                {pdfReady && (
                    <View style={styles.successCard}>
                        <View style={styles.successIcon}>
                            <MaterialIcons name="check" size={24} color={COLORS.green} />
                        </View>
                        <Text style={styles.successTitle}>PDF Ready!</Text>
                        <Text style={styles.successSub}>Generated in 2.1 seconds</Text>
                        <View style={styles.actionRow}>
                            {[
                                { icon: 'share', label: 'SHARE' },
                                { icon: 'mail', label: 'EMAIL' },
                            ].map((a) => (
                                <TouchableOpacity key={a.label} style={styles.actionBtn}>
                                    <MaterialIcons name={a.icon} size={16} color={COLORS.textPrimary} />
                                    <Text style={styles.actionBtnText}>{a.label}</Text>
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.actionBtnPrimary]}
                                onPress={() => navigation.navigate('Home')}
                            >
                                <MaterialIcons name="home" size={16} color="#5b3b00" />
                                <Text style={[styles.actionBtnText, { color: '#5b3b00' }]}>HOME</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: COLORS.bg },
    header: {
        height: 64,
        backgroundColor: COLORS.bg,
        borderBottomWidth: 2,
        borderBottomColor: COLORS.border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
    },
    iconBtn: { padding: 8 },
    headerTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: COLORS.orange,
        textTransform: 'uppercase',
        letterSpacing: -0.5,
    },
    content: { padding: 20, gap: 20, paddingBottom: 40 },
    summaryCard: {
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 2,
        padding: 16,
        gap: 16,
    },
    propertyName: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.5 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
    typeBadge: {
        backgroundColor: COLORS.surfaceHigh,
        borderWidth: 1,
        borderColor: COLORS.outline,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 2,
    },
    typeBadgeText: { fontSize: 10, fontWeight: '600', color: COLORS.textSecondary, letterSpacing: 1.5 },
    dateText: { fontSize: 12, color: COLORS.textSecondary },
    statsRow: { flexDirection: 'row', gap: 8 },
    statBox: {
        flex: 1,
        backgroundColor: COLORS.bg,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 2,
        padding: 10,
        alignItems: 'center',
        gap: 4,
    },
    statLabel: { fontSize: 10, fontWeight: '600', color: COLORS.textSecondary, letterSpacing: 1.5 },
    statValue: { fontSize: 24, fontWeight: '700' },
    section: { gap: 10 },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.textSecondary,
        letterSpacing: 2,
        textTransform: 'uppercase',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        paddingBottom: 6,
    },
    issueCard: {
        backgroundColor: COLORS.errorBg,
        borderWidth: 1,
        borderColor: COLORS.errorBorder,
        borderRadius: 2,
        padding: 14,
        flexDirection: 'row',
        gap: 14,
    },
    issueHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    issueLocation: { fontSize: 11, fontWeight: '700', color: COLORS.error, letterSpacing: 0.5 },
    issueSeverity: { fontSize: 12, color: COLORS.textSecondary },
    issueDesc: { fontSize: 14, color: COLORS.textPrimary, marginBottom: 10 },
    thumbRow: { flexDirection: 'row', gap: 8 },
    thumbPlaceholder: {
        width: 64,
        height: 64,
        backgroundColor: COLORS.surfaceHigh,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    previewContainer: {
        backgroundColor: '#40382e',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 2,
        padding: 12,
        alignItems: 'center',
        overflow: 'hidden',
    },
    a4Paper: {
        backgroundColor: '#fff',
        padding: 20,
        shadowColor: '#000',
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 6,
        borderRadius: 2,
    },
    a4Header: {
        borderBottomWidth: 2,
        borderBottomColor: '#000',
        paddingBottom: 6,
        marginBottom: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    a4Title: { fontWeight: '800', fontSize: 12, color: '#000', lineHeight: 16 },
    a4Ref: { fontSize: 7, color: '#888', fontFamily: 'monospace' },
    a4Line: { fontSize: 9, color: '#000', marginBottom: 4 },
    a4LineBlock: {
        height: 6,
        backgroundColor: '#e5e7eb',
        borderRadius: 2,
        marginBottom: 4,
        width: '100%',
    },
    a4ImgRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    a4ImgBlock: { flex: 1, height: 50, backgroundColor: '#e5e7eb', borderRadius: 2 },
    a4Footer: {
        marginTop: 'auto',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        paddingTop: 4,
        textAlign: 'center',
        fontSize: 7,
        color: '#888',
    },
    genBtn: {
        backgroundColor: COLORS.orange,
        borderRadius: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: COLORS.outline,
    },
    genBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#5b3b00',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
    },
    successCard: {
        backgroundColor: COLORS.bg,
        borderWidth: 1,
        borderColor: COLORS.greenBorder,
        borderRadius: 2,
        padding: 24,
        alignItems: 'center',
        gap: 6,
    },
    successIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: COLORS.greenBg,
        borderWidth: 1,
        borderColor: COLORS.greenBorder,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    successTitle: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary },
    successSub: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 10 },
    actionRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: COLORS.surfaceHigh,
        borderWidth: 1,
        borderColor: COLORS.outline,
        borderRadius: 2,
        paddingHorizontal: 16,
        paddingVertical: 10,
        minWidth: 100,
        justifyContent: 'center',
    },
    actionBtnPrimary: { backgroundColor: COLORS.orange },
    actionBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: 1 },
});
