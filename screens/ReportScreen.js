import React, { useState, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView, Image,
    StyleSheet, StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { COLORS, FONT, SPACING, RADIUS } from '../theme';
import { getInspectionById, updateInspection, loadSettings } from '../utils/storage';
import { pdfTemplate } from '../utils/pdfTemplate';

export default function ReportScreen({ navigation, route }) {
    const { inspectionId } = route.params;
    const [inspection, setInspection] = useState(null);
    const [settings, setSettings] = useState({});
    const [generating, setGenerating] = useState(false);
    const [pdfPath, setPdfPath] = useState(null);
    const [duration, setDuration] = useState(null);

    useEffect(() => {
        getInspectionById(inspectionId).then(setInspection);
        loadSettings().then(setSettings);
    }, [inspectionId]);

    if (!inspection) {
        return (
            <SafeAreaView style={styles.safe}>
                <View style={styles.loadingCenter}>
                    <ActivityIndicator color={COLORS.amber} />
                </View>
            </SafeAreaView>
        );
    }

    // Stats
    const roomCount = inspection.rooms.length;
    const allItems = inspection.rooms.flatMap((r) => r.items);
    const issueCount = allItems.filter((i) => i.status === 'issue').length;
    const photoCount = allItems.reduce((sum, i) => sum + i.photos.length, 0);

    const flaggedItems = inspection.rooms.flatMap((room) =>
        room.items.filter((i) => i.status === 'issue').map((i) => ({ ...i, roomName: room.name }))
    );

    const handleGeneratePdf = async () => {
        setGenerating(true);
        const startTime = Date.now();
        try {
            let generatePDF;
            try {
                const mod = require('react-native-html-to-pdf');
                // v1.3.0 exports a named `generatePDF` function
                generatePDF = mod.generatePDF ?? mod.default?.generatePDF ?? mod.default?.convert ?? mod.convert ?? null;
            } catch (_) {
                generatePDF = null;
            }

            const htmlString = pdfTemplate(inspection, settings);

            if (generatePDF) {
                const result = await generatePDF({
                    html: htmlString,
                    fileName: 'InspectPro-' + inspection.id,
                    directory: 'Documents',
                });

                // Native module may return null filePath on some devices
                let pdfFilePath = result?.filePath;
                if (pdfFilePath && !pdfFilePath.startsWith('file://')) {
                    pdfFilePath = 'file://' + pdfFilePath;
                }

                const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                const updated = { ...inspection, status: 'complete' };
                await updateInspection(updated.id, updated);
                setInspection(updated);
                setGenerating(false);
                setDuration(elapsed);

                if (pdfFilePath) {
                    setPdfPath(pdfFilePath);
                    await Sharing.shareAsync(pdfFilePath, { mimeType: 'application/pdf' });
                } else {
                    // filePath was null — fall back to HTML export
                    const { FileSystem } = await import('expo-file-system');
                    const htmlPath = FileSystem.documentDirectory + 'InspectPro-' + inspection.id + '.html';
                    await FileSystem.writeAsStringAsync(htmlPath, htmlString, {
                        encoding: FileSystem.EncodingType.UTF8,
                    });
                    setPdfPath(htmlPath);
                    Alert.alert(
                        'Report Saved as HTML',
                        'The PDF could not be written to disk. An HTML report has been saved instead.',
                        [
                            { text: 'Share HTML', onPress: () => Sharing.shareAsync(htmlPath) },
                            { text: 'OK' },
                        ]
                    );
                }
            } else {
                // Expo Go fallback: save as HTML
                const { FileSystem } = await import('expo-file-system');
                const path = FileSystem.documentDirectory + 'InspectPro-' + inspection.id + '.html';
                await FileSystem.writeAsStringAsync(path, htmlString, {
                    encoding: FileSystem.EncodingType.UTF8,
                });
                const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                const updated = { ...inspection, status: 'complete' };
                await updateInspection(updated.id, updated);
                setInspection(updated);
                setGenerating(false);
                setPdfPath(path);
                setDuration(elapsed);
                Alert.alert(
                    'Report Saved',
                    'PDF generation requires a dev build (npx expo run:android). HTML report saved instead.',
                    [
                        { text: 'Share HTML', onPress: () => Sharing.shareAsync(path) },
                        { text: 'OK' },
                    ]
                );
            }
        } catch (err) {
            setGenerating(false);
            Alert.alert('Error', 'Failed to generate report: ' + err.message);
        }
    };

    const handleShare = async () => {
        if (pdfPath) {
            await Sharing.shareAsync(pdfPath);
        } else {
            handleGeneratePdf();
        }
    };

    const handleEmail = async () => {
        if (pdfPath) {
            await Sharing.shareAsync(pdfPath, { mimeType: 'application/pdf' });
        } else {
            handleGeneratePdf();
        }
    };

    const isPdfReady = inspection.status === 'complete' || !!pdfPath;

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                    <MaterialIcons name="arrow-back" size={24} color={COLORS.amber} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>InspectPro</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.iconBtn}>
                    <MaterialIcons name="home" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Summary Card */}
                <View style={styles.summaryCard}>
                    <Text style={styles.addressLarge} numberOfLines={2}>{inspection.address}</Text>
                    <View style={styles.metaRow}>
                        <View style={styles.typeBadge}>
                            <Text style={styles.typeBadgeText}>{inspection.type.toUpperCase()}</Text>
                        </View>
                        <Text style={styles.dateText}>{inspection.date}</Text>
                    </View>
                    <View style={styles.statsRow}>
                        {[
                            { label: 'ROOMS', value: roomCount, color: COLORS.blue },
                            { label: 'ISSUES', value: issueCount, color: COLORS.red },
                            { label: 'PHOTOS', value: photoCount, color: COLORS.green },
                        ].map((s) => (
                            <View key={s.label} style={styles.statBox}>
                                <Text style={styles.statLabel}>{s.label}</Text>
                                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Flagged Issues */}
                {flaggedItems.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>FLAGGED ISSUES</Text>
                        {flaggedItems.map((item, idx) => (
                            <View key={idx} style={styles.issueCard}>
                                <MaterialIcons name="warning" size={20} color={COLORS.red} style={{ marginTop: 2 }} />
                                <View style={{ flex: 1 }}>
                                    <View style={styles.issueHeader}>
                                        <Text style={styles.issueLocation}>
                                            {item.roomName.toUpperCase()} · {item.name.toUpperCase()}
                                        </Text>
                                        {/* Only show severity if a photo was taken (severity set via photo picker) */}
                                        {!!item.severity && (
                                            <Text style={[
                                                styles.issueSeverity,
                                                item.severity === 'major' && styles.issueSeverityMajor,
                                                item.severity === 'minor' && styles.issueSeverityMinor,
                                            ]}>
                                                {item.severity === 'major' ? '🔴 Major' : '⚠ Minor'}
                                            </Text>
                                        )}
                                    </View>
                                    {/* Always show the note if present */}
                                    <Text style={styles.issueNote}>
                                        {item.note ? item.note : '— Issue noted'}
                                    </Text>
                                    {item.photos.length > 0 && (
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbRow}>
                                            {item.photos.map((uri, i) => (
                                                <Image key={i} source={{ uri }} style={styles.thumb} />
                                            ))}
                                        </ScrollView>
                                    )}
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* Report Preview */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>REPORT PREVIEW</Text>
                    <View style={styles.previewOuter}>
                        <View style={styles.a4}>
                            <View style={styles.a4Header}>
                                <Text style={styles.a4Title}>{'INSPECTION\nREPORT'}</Text>
                                <Text style={styles.a4Ref}>REF: IP-{inspection.id.slice(-8).toUpperCase()}</Text>
                            </View>
                            <Text style={styles.a4Line}>Property: {inspection.address}</Text>
                            <Text style={styles.a4Line}>Date: {inspection.date}</Text>
                            <Text style={styles.a4Line}>Type: {inspection.type}</Text>
                            {inspection.rooms.map((r) => (
                                <Text key={r.id} style={styles.a4RoomLine}>
                                    {isRoomDone(r) ? '✓' : '→'} {r.name}
                                </Text>
                            ))}
                            <Text style={styles.a4Footer}>Generated by InspectPro</Text>
                        </View>
                    </View>
                </View>

                {/* Generate button (shown when not yet generated) */}
                {!isPdfReady && (
                    <TouchableOpacity
                        style={styles.genBtn}
                        onPress={handleGeneratePdf}
                        disabled={generating}
                        activeOpacity={0.85}
                    >
                        {generating ? (
                            <ActivityIndicator color={COLORS.amberDark} />
                        ) : (
                            <>
                                <MaterialIcons name="download" size={20} color={COLORS.amberDark} />
                                <Text style={styles.genBtnText}>GENERATE &amp; SHARE PDF</Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}

                {/* PDF Ready state */}
                {isPdfReady && (
                    <View style={styles.successCard}>
                        <View style={styles.successIcon}>
                            <MaterialIcons name="check" size={28} color={COLORS.green} />
                        </View>
                        <Text style={styles.successTitle}>PDF Ready!</Text>
                        {duration && <Text style={styles.successSub}>Generated in {duration}s</Text>}
                        <View style={styles.actionRow}>
                            <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
                                <MaterialIcons name="share" size={16} color={COLORS.textPrimary} />
                                <Text style={styles.actionBtnText}>SHARE</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionBtn} onPress={handleEmail}>
                                <MaterialIcons name="mail" size={16} color={COLORS.textPrimary} />
                                <Text style={styles.actionBtnText}>EMAIL</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.actionBtnAmber]}
                                onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Home' }] })}
                            >
                                <MaterialIcons name="home" size={16} color={COLORS.amberDark} />
                                <Text style={[styles.actionBtnText, { color: COLORS.amberDark }]}>HOME</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

function isRoomDone(room) {
    return room.items.every((i) => i.status !== 'none');
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: COLORS.background },
    loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: {
        height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: SPACING.sm, backgroundColor: COLORS.background,
        borderBottomWidth: 2, borderBottomColor: COLORS.border,
    },
    iconBtn: { padding: SPACING.sm },
    headerTitle: { fontSize: 18, fontWeight: '900', color: COLORS.amber, textTransform: 'uppercase' },
    content: { padding: SPACING.md, gap: 20, paddingBottom: 40 },
    summaryCard: {
        backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
        borderRadius: RADIUS.sm, padding: 16, gap: 12,
    },
    addressLarge: { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.5 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    typeBadge: {
        backgroundColor: 'rgba(232,160,32,0.1)', borderWidth: 1, borderColor: 'rgba(232,160,32,0.3)',
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm,
    },
    typeBadgeText: { ...FONT.mono, fontSize: 10, color: COLORS.amber },
    dateText: { fontSize: 12, color: COLORS.textSecondary },
    statsRow: { flexDirection: 'row', gap: 8 },
    statBox: {
        flex: 1, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
        borderRadius: RADIUS.sm, padding: 10, alignItems: 'center', gap: 4,
    },
    statLabel: { ...FONT.mono, fontSize: 9, color: COLORS.textSecondary },
    statValue: { fontSize: 26, fontWeight: '800' },
    section: { gap: 10 },
    sectionLabel: {
        ...FONT.label, color: COLORS.textSecondary,
        borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 6,
    },
    issueCard: {
        backgroundColor: COLORS.redBg, borderWidth: 1, borderColor: COLORS.redBorder,
        borderRadius: RADIUS.sm, padding: 14, flexDirection: 'row', gap: 12,
    },
    issueHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    issueLocation: { ...FONT.mono, fontSize: 10, color: COLORS.red, flex: 1 },
    issueSeverity: { fontSize: 12, color: COLORS.textSecondary },
    issueSeverityMajor: { color: COLORS.red, fontWeight: '700' },
    issueSeverityMinor: { color: COLORS.amber, fontWeight: '700' },
    issueNote: { fontSize: 14, color: COLORS.textPrimary, marginBottom: 8 },
    thumbRow: { marginTop: 4 },
    thumb: { width: 64, height: 64, borderRadius: RADIUS.sm, marginRight: 8, borderWidth: 1, borderColor: COLORS.border },
    previewOuter: {
        backgroundColor: '#2a2520', borderWidth: 1, borderColor: COLORS.border,
        borderRadius: RADIUS.sm, padding: 12, alignItems: 'center',
    },
    a4: {
        backgroundColor: '#fff', padding: 18, borderRadius: 2,
        width: '100%', maxWidth: 360, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    },
    a4Header: {
        borderBottomWidth: 2, borderBottomColor: '#000', paddingBottom: 6, marginBottom: 8,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    },
    a4Title: { fontWeight: '900', fontSize: 13, color: '#000', lineHeight: 17 },
    a4Ref: { fontSize: 8, color: '#888' },
    a4Line: { fontSize: 9, color: '#000', marginBottom: 3 },
    a4RoomLine: { fontSize: 9, color: '#333', marginBottom: 2, paddingLeft: 4 },
    a4Footer: {
        marginTop: 12, borderTopWidth: 1, borderTopColor: '#ddd', paddingTop: 4,
        textAlign: 'center', fontSize: 8, color: '#999',
    },
    genBtn: {
        backgroundColor: COLORS.amber, borderRadius: RADIUS.sm,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, paddingVertical: 16,
    },
    genBtnText: { ...FONT.label, fontSize: 13, color: COLORS.amberDark },
    successCard: {
        backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.greenBorder,
        borderRadius: RADIUS.sm, padding: 24, alignItems: 'center', gap: 6,
    },
    successIcon: {
        width: 52, height: 52, borderRadius: 26,
        backgroundColor: COLORS.greenBg, borderWidth: 1, borderColor: COLORS.greenBorder,
        alignItems: 'center', justifyContent: 'center', marginBottom: 4,
    },
    successTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
    successSub: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 8 },
    actionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
    actionBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
        borderRadius: RADIUS.sm, paddingHorizontal: 16, paddingVertical: 10,
        minWidth: 90, justifyContent: 'center',
    },
    actionBtnAmber: { backgroundColor: COLORS.amber },
    actionBtnText: { ...FONT.mono, fontSize: 10, color: COLORS.textPrimary },
});
