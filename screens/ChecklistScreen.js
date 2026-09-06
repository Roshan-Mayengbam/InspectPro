import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, TextInput, ScrollView, Image,
    StyleSheet, StatusBar, Alert, Keyboard, Modal,
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
    return room.items.length > 0 && room.items.every((i) => i.status !== 'none');
}

export default function ChecklistScreen({ navigation, route }) {
    const { inspectionId } = route.params;
    const [inspection, setInspection] = useState(null);
    const [activeRoomIdx, setActiveRoomIdx] = useState(0);
    const [kbHeight, setKbHeight] = useState(0);
    const scrollRef = useRef(null);
    const focusedCardY = useRef(0);

    // Add-condition modal state
    const [addCondVisible, setAddCondVisible] = useState(false);
    const [newCondName, setNewCondName] = useState('');

    useEffect(() => {
        const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
            setKbHeight(e.endCoordinates.height);
            scrollRef.current?.scrollTo({ y: focusedCardY.current, animated: true });
        });
        const hideSub = Keyboard.addListener('keyboardDidHide', () => {
            setKbHeight(0);
        });
        return () => { showSub.remove(); hideSub.remove(); };
    }, []);

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

    const removeItem = useCallback((roomIdx, itemId) => {
        setInspection((prev) => {
            if (!prev) return prev;
            const updatedRooms = prev.rooms.map((r, ri) => {
                if (ri !== roomIdx) return r;
                return { ...r, items: r.items.filter((it) => it.id !== itemId) };
            });
            const updated = { ...prev, rooms: updatedRooms };
            updateInspection(updated.id, updated);
            return updated;
        });
    }, []);

    const addCondition = useCallback(() => {
        const clean = newCondName.trim();
        if (!clean) {
            setAddCondVisible(false);
            setNewCondName('');
            return;
        }
        setInspection((prev) => {
            if (!prev) return prev;
            const updatedRooms = prev.rooms.map((r, ri) => {
                if (ri !== activeRoomIdx) return r;
                const newItem = {
                    id: r.id + '-custom-' + Date.now(),
                    name: clean,
                    status: 'none',
                    note: '',
                    photos: [],
                };
                return { ...r, items: [...r.items, newItem] };
            });
            const updated = { ...prev, rooms: updatedRooms };
            updateInspection(updated.id, updated);
            return updated;
        });
        setNewCondName('');
        setAddCondVisible(false);
    }, [newCondName, activeRoomIdx]);

    // After a photo URI is obtained, ask owner to pick severity.
    // IMPORTANT: uses functional setInspection so it always reads the CURRENT
    // photos array — not the stale one captured when the camera button was tapped.
    const askSeverityAndSave = (roomIdx, itemId, uri) => {
        const applyPhoto = (sev) => {
            setInspection((prev) => {
                if (!prev) return prev;
                const updatedRooms = prev.rooms.map((r, ri) => {
                    if (ri !== roomIdx) return r;
                    return {
                        ...r,
                        items: r.items.map((it) => {
                            if (it.id !== itemId) return it;
                            return { ...it, photos: [...it.photos, uri], severity: sev };
                        }),
                    };
                });
                const updated = { ...prev, rooms: updatedRooms };
                updateInspection(updated.id, updated);   
                return updated;
            });
        };

        Alert.alert(
            'Issue Severity',
            'How severe is this issue?',
            [
                { text: '⚠ Minor', onPress: () => applyPhoto('minor') },
                { text: '🔴 Major', onPress: () => applyPhoto('major') },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };


    const handleCamera = async (roomIdx, item) => {
        // Always ask: Camera or Gallery
        Alert.alert(
            'Add Photo',
            'Choose a source',
            [
                {
                    text: '📷 Camera',
                    onPress: async () => {
                        try {
                            const perm = await ImagePicker.requestCameraPermissionsAsync();
                            if (!perm.granted) {
                                Alert.alert('Permission Required', 'Camera access is needed.');
                                return;
                            }
                            const result = await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 0.7 });
                            if (!result.canceled && result.assets?.[0]?.uri) {
                                askSeverityAndSave(roomIdx, item.id, result.assets[0].uri);
                            }
                        } catch (e) {
                            Alert.alert('Camera Error', e?.message || String(e));
                        }
                    },
                },
                {
                    text: '🖼 Gallery',
                    onPress: async () => {
                        try {
                            const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                            if (!perm.granted) {
                                Alert.alert('Permission Required', 'Gallery access is needed.');
                                return;
                            }
                            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.7 });
                            if (!result.canceled && result.assets?.[0]?.uri) {
                                askSeverityAndSave(roomIdx, item.id, result.assets[0].uri);
                            }
                        } catch (e) {
                            Alert.alert('Gallery Error', e?.message || String(e));
                        }
                    },
                },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
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

            {/* ── Add Condition Modal ───────────────────────────── */}
            <Modal
                transparent
                animationType="fade"
                visible={addCondVisible}
                onRequestClose={() => { setAddCondVisible(false); setNewCondName(''); }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalTitle}>Add Condition</Text>
                        <Text style={styles.modalRoomName}>{activeRoom?.name}</Text>

                        <TextInput
                            style={styles.modalInput}
                            placeholder="e.g. Balcony Railing, AC Unit…"
                            placeholderTextColor={COLORS.textMuted}
                            value={newCondName}
                            onChangeText={setNewCondName}
                            autoFocus
                            returnKeyType="done"
                            onSubmitEditing={addCondition}
                        />

                        <View style={styles.modalBtns}>
                            <TouchableOpacity
                                style={styles.modalCancel}
                                onPress={() => { setAddCondVisible(false); setNewCondName(''); }}
                            >
                                <Text style={styles.modalCancelText}>CANCEL</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalConfirm} onPress={addCondition}>
                                <Text style={styles.modalConfirmText}>ADD</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

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

            {/* Room sub-header: item count + Add condition button */}
            <View style={styles.roomSubHeader}>
                <Text style={styles.roomSubTitle}>
                    {activeRoom.name}
                    <Text style={styles.roomSubCount}>  {activeRoom.items.length} condition{activeRoom.items.length !== 1 ? 's' : ''}</Text>
                </Text>
                <TouchableOpacity
                    style={styles.addCondBtn}
                    onPress={() => setAddCondVisible(true)}
                >
                    <MaterialIcons name="add" size={14} color={COLORS.blue} />
                    <Text style={styles.addCondText}>ADD</Text>
                </TouchableOpacity>
            </View>

            {/* Checklist items */}
            <ScrollView
                ref={scrollRef}
                contentContainerStyle={[styles.listContent, { paddingBottom: kbHeight + 20 }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {activeRoom.items.length === 0 ? (
                    <View style={styles.emptyState}>
                        <MaterialIcons name="checklist" size={40} color={COLORS.textMuted} />
                        <Text style={styles.emptyText}>No conditions yet.</Text>
                        <Text style={styles.emptyHint}>Tap ADD above to add a condition to inspect.</Text>
                    </View>
                ) : (
                    activeRoom.items.map((item) => (
                        <ChecklistCard
                            key={item.id}
                            item={item}
                            onStatusChange={(s) => updateItem(activeRoomIdx, item.id, { status: s })}
                            onNoteChange={(n) => updateItem(activeRoomIdx, item.id, { note: n })}
                            onCamera={() => handleCamera(activeRoomIdx, item)}
                            onNoteFocus={(y) => { focusedCardY.current = y; }}
                            onRemove={() => {
                                Alert.alert(
                                    'Remove Condition',
                                    `Remove "${item.name}" from ${activeRoom.name}?`,
                                    [
                                        { text: 'Cancel', style: 'cancel' },
                                        { text: 'Remove', style: 'destructive', onPress: () => removeItem(activeRoomIdx, item.id) },
                                    ]
                                );
                            }}
                        />
                    ))
                )}
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
function ChecklistCard({ item, onStatusChange, onNoteChange, onCamera, onNoteFocus, onRemove }) {
    const [note, setNote] = useState(item.note || '');
    const debounceRef = useRef(null);
    const cardY = useRef(0);

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
        <View
            style={[styles.card, { borderColor: cardBorder, backgroundColor: cardBg }]}
            onLayout={(e) => { cardY.current = e.nativeEvent.layout.y; }}
        >
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
                    {/* Remove condition button */}
                    <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
                        <MaterialIcons name="close" size={18} color={COLORS.textMuted} />
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
                    onFocus={() => onNoteFocus && onNoteFocus(cardY.current)}
                    onBlur={() => {
                        // Flush debounce immediately so note is saved before navigating
                        if (debounceRef.current) {
                            clearTimeout(debounceRef.current);
                            debounceRef.current = null;
                        }
                        onNoteChange(note);
                    }}
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

    // ── Add Condition Modal ────────────────────────────────────────
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
        alignItems: 'center', justifyContent: 'center', padding: 32,
    },
    modalBox: {
        width: '100%', backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
        padding: 24, gap: 14,
    },
    modalTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary, textTransform: 'uppercase', letterSpacing: 1 },
    modalRoomName: { fontSize: 12, color: COLORS.amber, fontWeight: '600', marginTop: -8 },
    modalInput: {
        backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.amber,
        borderRadius: RADIUS.sm, padding: 12, color: COLORS.textPrimary, fontSize: 15,
    },
    modalBtns: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
    modalCancel: {
        borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm,
        paddingHorizontal: 18, paddingVertical: 10,
    },
    modalCancelText: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1 },
    modalConfirm: {
        backgroundColor: COLORS.amber, borderRadius: RADIUS.sm,
        paddingHorizontal: 24, paddingVertical: 10,
    },
    modalConfirmText: { fontSize: 12, fontWeight: '800', color: COLORS.amberDark, letterSpacing: 1 },

    // ── Header ───────────────────────────────────────────────────
    header: {
        height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: SPACING.sm, backgroundColor: COLORS.background,
        borderBottomWidth: 2, borderBottomColor: COLORS.border,
    },
    iconBtn: { padding: SPACING.sm },
    headerAddr: { ...FONT.mono, color: COLORS.textSecondary, flex: 1, textAlign: 'center', fontSize: 12 },

    // ── Progress ──────────────────────────────────────────────────
    progressBar: {
        paddingHorizontal: SPACING.md, paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 6,
    },
    progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    progressAddr: { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary, flex: 1 },
    progressPct: { fontSize: 14, fontWeight: '700', color: COLORS.amber },
    progressTrack: { height: 4, backgroundColor: COLORS.border, borderRadius: RADIUS.full, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: COLORS.amber, borderRadius: RADIUS.full },

    // ── Room Tabs ────────────────────────────────────────────────
    tabBar: { flexShrink: 0, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    tabContent: { paddingHorizontal: SPACING.md, paddingVertical: 8, gap: 6, alignItems: 'center', flexDirection: 'row' },
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

    // ── Room Sub-header ──────────────────────────────────────────
    roomSubHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: SPACING.md, paddingVertical: 8,
        borderBottomWidth: 1, borderBottomColor: COLORS.border,
        backgroundColor: COLORS.background,
    },
    roomSubTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
    roomSubCount: { fontSize: 11, fontWeight: '400', color: COLORS.textMuted },
    addCondBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        borderWidth: 1, borderColor: COLORS.blue, borderRadius: RADIUS.sm,
        paddingHorizontal: 12, paddingVertical: 5,
        backgroundColor: COLORS.blueBg,
    },
    addCondText: { ...FONT.mono, fontSize: 10, color: COLORS.blue, fontWeight: '700' },

    // ── List ─────────────────────────────────────────────────────
    listContent: { padding: SPACING.md, gap: 10, paddingBottom: 20 },

    // ── Empty State ──────────────────────────────────────────────
    emptyState: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
        paddingVertical: 60, gap: 10,
    },
    emptyText: { fontSize: 16, fontWeight: '600', color: COLORS.textMuted },
    emptyHint: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 24 },

    // ── Card ─────────────────────────────────────────────────────
    card: { borderWidth: 1, borderRadius: RADIUS.sm, padding: 14, gap: 10 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    itemName: { ...FONT.mono, color: COLORS.textPrimary, fontSize: 12, flex: 1 },
    cardActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    photoBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 3,
        backgroundColor: COLORS.blueBg, borderWidth: 1, borderColor: COLORS.blueBorder,
        borderRadius: RADIUS.sm, paddingHorizontal: 7, paddingVertical: 2,
    },
    photoBadgeText: { fontSize: 11, color: COLORS.blue, fontWeight: '700' },
    cameraBtn: { padding: 4 },
    removeBtn: { padding: 4 },
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

    // ── Severity picker ──────────────────────────────────────────
    severityRow: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
    },
    severityLabel: { ...FONT.mono, fontSize: 10, color: COLORS.textMuted, marginRight: 2 },
    sevBtn: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
        paddingVertical: 8, borderWidth: 1, borderColor: COLORS.border,
        borderRadius: RADIUS.sm, backgroundColor: 'rgba(0,0,0,0.15)',
    },
    sevBtnText: { ...FONT.mono, fontSize: 11, color: COLORS.textMuted },
    sevBtnMinorActive: { borderColor: COLORS.amber, backgroundColor: 'rgba(232,160,32,0.12)' },
    sevBtnMinorText: { color: COLORS.amber, fontWeight: '700' },
    sevBtnMajorActive: { borderColor: COLORS.red, backgroundColor: COLORS.redBg },
    sevBtnMajorText: { color: COLORS.red, fontWeight: '700' },

    thumb: { width: 64, height: 64, borderRadius: RADIUS.sm, marginRight: 8, borderWidth: 1, borderColor: COLORS.border },

    // ── Bottom Bar ───────────────────────────────────────────────
    bottomBar: {
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
