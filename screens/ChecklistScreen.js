import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, TextInput, ScrollView, Image,
    StyleSheet, StatusBar, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, FONT, SPACING, RADIUS } from '../theme';
import { getInspectionById, updateInspection } from '../utils/storage';

function countTotal(rooms) {
    return rooms.reduce((sum, r) => sum + r.items.length, 0);
}
function countDone(rooms) {
    return rooms.reduce((sum, r) => sum + r.items.filter((i) => i.status !== 'none').length, 0);
}
function isRoomDone(room) {
    return room.items.every((i) => i.status !== 'none');
}

export default function ChecklistScreen({ navigation, route }) {
    const { inspectionId } = route.params;
    const [inspection, setInspection] = useState(null);
    const [activeRoomIdx, setActiveRoomIdx] = useState(0);
    const scrollRef = useRef(null);

    useEffect(() => {
        getInspectionById(inspectionId).then((data) => {
            if (data) setInspection(data);
        });
    }, [inspectionId]);

    const persist = useCallback(async (updated) => {
        setInspection(updated);
        await updateInspection(updated.id, updated);
    }, []);

    const updateItem = useCallback(async (roomIdx, itemId, patch) => {
        setInspection((prev) => {
            if (!prev) return prev;
            const updatedRooms = prev.rooms.map((r, ri) => {
                if (ri !== roomIdx) return r;
                return { ...r, items: r.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)) };
            });
            const updated = { ...prev, rooms: updatedRooms };
            updateInspection(updated.id, updated);
            return updated;
        });
    }, []);

    const handleCamera = async (roomIdx, item) => {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        let result;
        if (perm.granted) {
            result = await ImagePicker.launchCameraAsync({ mediaTypes: 'Images', quality: 0.7 });
        } else {
            const gallPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!gallPerm.granted) {
                Alert.alert('Permission Required', 'Camera or gallery access is needed to add photos.');
                return;
            }
            result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'Images', quality: 0.7 });
        }
        if (!result.canceled && result.assets?.[0]?.uri) {
            const uri = result.assets[0].uri;
            updateItem(roomIdx, item.id, { photos: [...item.photos, uri] });
        }
    };

    const handleNext = () => {
        if (!inspection) return;
        if (activeRoomIdx < inspection.rooms.length - 1) {
            setActiveRoomIdx((prev) => prev + 1);
            scrollRef.current?.scrollTo({ y: 0, animated: true });
        } else {
            navigation.navigate('Report', { inspectionId });
        }
    };

    if (!inspection) {
        return (
            <SafeAreaView style={styles.safe}>
                <View style={styles.loadingCenter}>
                    <Text style={{ color: COLORS.textMuted }}>Loading…</Text>
                </View>
            </SafeAreaView>
        );
    }

    const { rooms } = inspection;
    const totalItems = countTotal(rooms);
    const doneItems = countDone(rooms);
    const progress = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;
    const activeRoom = rooms[activeRoomIdx];
    const isLastRoom = activeRoomIdx === rooms.length - 1;

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                    <MaterialIcons name="arrow-back" size={24} color={COLORS.amber} />
                </TouchableOpacity>
                <Text style={styles.headerAddr} numberOfLines={1}>{inspection.address}</Text>
                <TouchableOpacity
                    onPress={() => navigation.navigate('Report', { inspectionId })}
                    style={styles.iconBtn}
                >
                    <MaterialIcons name="summarize" size={22} color={COLORS.textSecondary} />
                </TouchableOpacity>
            </View>

            {/* Progress bar */}
            <View style={styles.progressBar}>
                <View style={styles.progressRow}>
                    <Text style={styles.progressAddr} numberOfLines={1}>{inspection.address}</Text>
                    <Text style={styles.progressPct}>{progress}%</Text>
                </View>
                <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${progress}%` }]} />
                </View>
            </View>

            {/* Room Tabs */}
            <ScrollView
                horizontal showsHorizontalScrollIndicator={false}
                style={styles.tabBar} contentContainerStyle={styles.tabContent}
            >
                {rooms.map((room, idx) => {
                    const active = idx === activeRoomIdx;
                    const done = isRoomDone(room);
                    return (
                        <TouchableOpacity
                            key={room.id}
                            style={[styles.tab, active && styles.tabActive, done && !active && styles.tabDone]}
                            onPress={() => setActiveRoomIdx(idx)}
                        >
                            {done && <Text style={styles.tabCheck}>✓ </Text>}
                            <Text style={[styles.tabText, active && styles.tabTextActive]}>
                                {room.name.toUpperCase()}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* Checklist items */}
            <ScrollView ref={scrollRef} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
                {activeRoom.items.map((item) => (
                    <ChecklistCard
                        key={item.id}
                        item={item}
                        onStatusChange={(s) => updateItem(activeRoomIdx, item.id, { status: s })}
                        onNoteChange={(n) => updateItem(activeRoomIdx, item.id, { note: n })}
                        onCamera={() => handleCamera(activeRoomIdx, item)}
                    />
                ))}
            </ScrollView>

            {/* Bottom CTA */}
            <View style={styles.bottomBar}>
                <TouchableOpacity
                    style={[styles.nextBtn, isLastRoom && styles.nextBtnFinal]}
                    onPress={handleNext}
                    activeOpacity={0.85}
                >
                    <Text style={[styles.nextBtnText, isLastRoom && styles.nextBtnTextFinal]}>
                        {isLastRoom ? 'GENERATE REPORT' : 'NEXT ROOM'}
                    </Text>
                    <MaterialIcons name="arrow-forward" size={20} color={isLastRoom ? COLORS.amberDark : '#004668'} />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

// ChecklistCard sub-component
function ChecklistCard({ item, onStatusChange, onNoteChange, onCamera }) {
    const [note, setNote] = useState(item.note || '');
    const debounceRef = useRef(null);

    // Sync note if item changed from parent
    useEffect(() => { setNote(item.note || ''); }, [item.id]);

    const handleNoteChange = (text) => {
        setNote(text);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => onNoteChange(text), 500);
    };

    const STATUS_CFG = {
        ok: { icon: 'check-circle', label: 'OK', selBg: COLORS.greenBg, selBorder: COLORS.green, selColor: COLORS.green },
        issue: { icon: 'warning', label: 'ISSUE', selBg: COLORS.redBg, selBorder: COLORS.red, selColor: COLORS.red },
        na: { icon: 'remove', label: 'N/A', selBg: 'rgba(100,116,139,0.1)', selBorder: COLORS.textSecondary, selColor: COLORS.textSecondary },
    };

    const cardBorder = item.status === 'ok' ? COLORS.green : item.status === 'issue' ? COLORS.red : COLORS.border;
    const cardBg = item.status === 'ok' ? COLORS.greenBg : item.status === 'issue' ? COLORS.redBg : COLORS.surface;

    return (
        <View style={[styles.card, { borderColor: cardBorder, backgroundColor: cardBg }]}>
            <View style={styles.cardHeader}>
                <Text style={styles.itemName}>{item.name.toUpperCase()}</Text>
                <View style={styles.cardActions}>
                    {item.photos.length > 0 && (
                        <View style={styles.photoBadge}>
                            <MaterialIcons name="photo-camera" size={12} color={COLORS.blue} />
                            <Text style={styles.photoBadgeText}>{item.photos.length}</Text>
                        </View>
                    )}
                    <TouchableOpacity onPress={onCamera} style={styles.cameraBtn}>
                        <MaterialIcons name="add-a-photo" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.btnRow}>
                {['ok', 'issue', 'na'].map((s) => {
                    const cfg = STATUS_CFG[s];
                    const sel = item.status === s;
                    return (
                        <TouchableOpacity
                            key={s}
                            style={[
                                styles.stateBtn,
                                sel
                                    ? { backgroundColor: cfg.selBg, borderColor: cfg.selBorder }
                                    : { backgroundColor: 'rgba(0,0,0,0.15)', borderColor: COLORS.border },
                            ]}
                            onPress={() => onStatusChange(s)}
                        >
                            <MaterialIcons name={cfg.icon} size={18} color={sel ? cfg.selColor : COLORS.textMuted} />
                            <Text style={[styles.stateBtnText, { color: sel ? cfg.selColor : COLORS.textMuted }]}>
                                {cfg.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {item.status === 'issue' && (
                <TextInput
                    style={styles.noteInput}
                    placeholder="Describe issue..."
                    placeholderTextColor="rgba(248,113,113,0.5)"
                    multiline numberOfLines={2}
                    value={note}
                    onChangeText={handleNoteChange}
                    textAlignVertical="top"
                />
            )}

            {item.photos.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {item.photos.map((uri, idx) => (
                        <Image key={idx} source={{ uri }} style={styles.thumb} />
                    ))}
                </ScrollView>
            )}
        </View>
    );
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
    headerAddr: { ...FONT.mono, color: COLORS.textSecondary, flex: 1, textAlign: 'center', fontSize: 12 },
    progressBar: {
        paddingHorizontal: SPACING.md, paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 6,
    },
    progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    progressAddr: { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary, flex: 1 },
    progressPct: { fontSize: 14, fontWeight: '700', color: COLORS.amber },
    progressTrack: { height: 4, backgroundColor: COLORS.border, borderRadius: RADIUS.full, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: COLORS.amber, borderRadius: RADIUS.full },
    tabBar: { maxHeight: 52, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    tabContent: { paddingHorizontal: SPACING.md, paddingVertical: 10, gap: 6, alignItems: 'center', flexDirection: 'row' },
    tab: {
        flexDirection: 'row', alignItems: 'center',
        borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm,
        paddingHorizontal: 12, paddingVertical: 5, backgroundColor: COLORS.surface,
    },
    tabActive: { borderColor: COLORS.amber, backgroundColor: 'rgba(232,160,32,0.1)' },
    tabDone: { borderColor: COLORS.green, backgroundColor: COLORS.greenBg },
    tabCheck: { fontSize: 11, color: COLORS.green, fontWeight: '700' },
    tabText: { ...FONT.mono, fontSize: 10, color: COLORS.textMuted },
    tabTextActive: { color: COLORS.amber },
    listContent: { padding: SPACING.md, gap: 10, paddingBottom: 100 },
    card: { borderWidth: 1, borderRadius: RADIUS.sm, padding: 14, gap: 10 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    itemName: { ...FONT.mono, color: COLORS.textPrimary, fontSize: 12 },
    cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    photoBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 3,
        backgroundColor: COLORS.blueBg, borderWidth: 1, borderColor: COLORS.blueBorder,
        borderRadius: RADIUS.sm, paddingHorizontal: 7, paddingVertical: 2,
    },
    photoBadgeText: { fontSize: 11, color: COLORS.blue, fontWeight: '700' },
    cameraBtn: { padding: 4 },
    btnRow: { flexDirection: 'row', gap: 8 },
    stateBtn: {
        flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4,
        paddingVertical: 10, borderWidth: 1, borderRadius: RADIUS.sm,
    },
    stateBtnText: { ...FONT.mono, fontSize: 10 },
    noteInput: {
        backgroundColor: COLORS.redDark, borderWidth: 1, borderColor: COLORS.red,
        borderRadius: RADIUS.sm, padding: 10, color: COLORS.textPrimary,
        fontSize: 14, minHeight: 58, textAlignVertical: 'top',
    },
    thumb: { width: 64, height: 64, borderRadius: RADIUS.sm, marginRight: 8, borderWidth: 1, borderColor: COLORS.border },
    bottomBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border, padding: SPACING.md,
    },
    nextBtn: {
        backgroundColor: COLORS.blue, borderRadius: RADIUS.sm,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16,
    },
    nextBtnFinal: { backgroundColor: COLORS.amber },
    nextBtnText: { fontSize: 16, fontWeight: '800', color: '#004668', textTransform: 'uppercase', letterSpacing: 0.8 },
    nextBtnTextFinal: { color: COLORS.amberDark },
});
