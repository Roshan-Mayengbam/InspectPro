import React, { useState } from 'react';
import {
    View, Text, TouchableOpacity, TextInput, ScrollView,
    StyleSheet, StatusBar, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, FONT, SPACING, RADIUS } from '../theme';
import { loadInspections, saveInspections } from '../utils/storage';

const INSPECTION_TYPES = [
    { id: 'Move-In', icon: 'login', label: 'Move-In' },
    { id: 'Move-Out', icon: 'logout', label: 'Move-Out' },
    { id: 'Routine', icon: 'event', label: 'Routine' },
    { id: 'Annual', icon: 'event-note', label: 'Annual' },
];

const DEFAULT_ROOM_DEFINITIONS = [
    { id: 'living-room', name: 'Living Room', items: ['Walls & Ceiling', 'Flooring', 'Windows', 'Lights & Switches', 'Doors'] },
    { id: 'kitchen', name: 'Kitchen', items: ['Countertops', 'Cabinets', 'Sink & Faucet', 'Appliances', 'Flooring'] },
    { id: 'bedroom', name: 'Bedroom', items: ['Walls & Ceiling', 'Flooring', 'Windows', 'Closet', 'Lights'] },
    { id: 'bathroom', name: 'Bathroom', items: ['Toilet', 'Shower/Tub', 'Sink & Faucet', 'Tiles', 'Ventilation'] },
    { id: 'exterior', name: 'Exterior', items: ['Front Door', 'Mailbox', 'Parking/Garage', 'Garden/Yard'] },
];

function buildInspection(address, type, selectedRoomDefs) {
    const id = Date.now().toString();
    const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return {
        id, address, type, date,
        status: 'in-progress',
        rooms: selectedRoomDefs.map((room) => ({
            id: room.id,
            name: room.name,
            items: room.items.map((itemName) => ({
                id: room.id + '-' + itemName.replace(/\s/g, ''),
                name: itemName,
                status: 'none',
                note: '',
                photos: [],
            })),
        })),
    };
}

export default function NewInspectionScreen({ navigation }) {
    const [type, setType] = useState('Move-Out');
    const [address, setAddress] = useState('');
    const [selectedRoomIds, setSelectedRoomIds] = useState(DEFAULT_ROOM_DEFINITIONS.map((r) => r.id));
    const [customRooms, setCustomRooms] = useState([]);

    // ── Add-Room modal state ──────────────────────────────────
    const [addRoomVisible, setAddRoomVisible] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');
    const [newRoomConditions, setNewRoomConditions] = useState('');

    const toggleRoom = (id) =>
        setSelectedRoomIds((prev) =>
            prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
        );

    const confirmAddRoom = () => {
        const clean = newRoomName.trim();
        if (!clean) {
            setAddRoomVisible(false);
            setNewRoomName('');
            setNewRoomConditions('');
            return;
        }
        // Parse conditions: split by comma or newline, filter empty
        const rawConditions = newRoomConditions.trim();
        const parsedItems = rawConditions
            ? rawConditions.split(/[,\n]+/).map((s) => s.trim()).filter(Boolean)
            : ['General Condition', 'Cleanliness', 'Damage'];
        const newRoom = {
            id: 'custom-' + Date.now(),
            name: clean,
            items: parsedItems,
        };
        setCustomRooms((prev) => [...prev, newRoom]);
        setSelectedRoomIds((prev) => [...prev, newRoom.id]);
        setNewRoomName('');
        setNewRoomConditions('');
        setAddRoomVisible(false);
    };

    const handleStart = async () => {
        if (!address.trim()) return;
        const allRoomDefs = [...DEFAULT_ROOM_DEFINITIONS, ...customRooms];
        const selected = allRoomDefs.filter((r) => selectedRoomIds.includes(r.id));
        const inspection = buildInspection(address.trim(), type, selected);
        const existing = await loadInspections();
        await saveInspections([inspection, ...existing]);
        navigation.navigate('Checklist', { inspectionId: inspection.id });
    };

    const allRoomDefs = [...DEFAULT_ROOM_DEFINITIONS, ...customRooms];
    const addressEmpty = !address.trim();

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

            {/* ── Add Room Modal ───────────────────────────────── */}
            <Modal
                transparent
                animationType="fade"
                visible={addRoomVisible}
                onRequestClose={() => setAddRoomVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalTitle}>Add Custom Room</Text>

                        <View style={styles.modalFieldGroup}>
                            <Text style={styles.modalLabel}>ROOM NAME</Text>
                            <TextInput
                                style={styles.modalInput}
                                placeholder="e.g. Garage, Laundry Room"
                                placeholderTextColor={COLORS.textMuted}
                                value={newRoomName}
                                onChangeText={setNewRoomName}
                                autoFocus
                                returnKeyType="next"
                            />
                        </View>

                        <View style={styles.modalFieldGroup}>
                            <Text style={styles.modalLabel}>CONDITIONS TO CHECK</Text>
                            <Text style={styles.modalHint}>Separate with commas or new lines. Leave blank for defaults.</Text>
                            <TextInput
                                style={[styles.modalInput, styles.modalInputMulti]}
                                placeholder={`General Condition, Cleanliness, Damage`}
                                placeholderTextColor={COLORS.textMuted}
                                value={newRoomConditions}
                                onChangeText={setNewRoomConditions}
                                multiline
                                numberOfLines={3}
                                textAlignVertical="top"
                                returnKeyType="done"
                                blurOnSubmit
                            />
                        </View>

                        <View style={styles.modalBtns}>
                            <TouchableOpacity
                                style={styles.modalCancel}
                                onPress={() => { setAddRoomVisible(false); setNewRoomName(''); setNewRoomConditions(''); }}
                            >
                                <Text style={styles.modalCancelText}>CANCEL</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalConfirm} onPress={confirmAddRoom}>
                                <Text style={styles.modalConfirmText}>ADD ROOM</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                    <MaterialIcons name="arrow-back" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>New Inspection</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                    {/* Inspection Type */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>INSPECTION TYPE</Text>
                        <View style={styles.typeGrid}>
                            {INSPECTION_TYPES.map((t) => {
                                const active = type === t.id;
                                return (
                                    <TouchableOpacity
                                        key={t.id}
                                        style={[styles.typeCard, active && styles.typeCardActive]}
                                        onPress={() => setType(t.id)}
                                    >
                                        <MaterialIcons name={t.icon} size={24} color={active ? COLORS.amber : COLORS.textMuted} />
                                        <Text style={[styles.typeLabel, active && styles.typeLabelActive]}>{t.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* Property Address */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>PROPERTY ADDRESS</Text>
                        <View style={styles.inputWrap}>
                            <TextInput
                                style={styles.textArea}
                                placeholder="Enter full property address..."
                                placeholderTextColor={COLORS.textMuted}
                                multiline numberOfLines={3}
                                value={address} onChangeText={setAddress}
                                textAlignVertical="top"
                            />
                            <MaterialIcons name="location-on" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
                        </View>
                    </View>

                    {/* Rooms */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>ROOMS INCLUDED</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.roomsScroll}
                            contentContainerStyle={styles.roomsScrollContent}
                        >
                            {allRoomDefs.map((def) => {
                                const active = selectedRoomIds.includes(def.id);
                                return (
                                    <TouchableOpacity
                                        key={def.id}
                                        style={[styles.chip, active && styles.chipActive]}
                                        onPress={() => toggleRoom(def.id)}
                                    >
                                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                                            {def.name.toUpperCase()}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                        <TouchableOpacity style={styles.addRoomBtn} onPress={() => setAddRoomVisible(true)}>
                            <MaterialIcons name="add" size={14} color={COLORS.blue} />
                            <Text style={[styles.addRoomText, { color: COLORS.blue }]}>ADD ROOM</Text>
                        </TouchableOpacity>
                    </View>

                </ScrollView>

                {/* Bottom CTA */}
                <View style={styles.bottomBar}>
                    <TouchableOpacity
                        style={[styles.startBtn, addressEmpty && styles.startBtnDisabled]}
                        onPress={handleStart}
                        disabled={addressEmpty}
                        activeOpacity={0.85}
                    >
                        <Text style={[styles.startBtnText, addressEmpty && styles.startBtnTextDisabled]}>
                            START WALKTHROUGH
                        </Text>
                        <MaterialIcons
                            name="arrow-forward" size={22}
                            color={addressEmpty ? COLORS.textMuted : COLORS.amberDark}
                        />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: COLORS.background },
    // Modal
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
        alignItems: 'center', justifyContent: 'center', padding: 32,
    },
    modalBox: {
        width: '100%', backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
        padding: 24, gap: 16,
    },
    modalTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, textTransform: 'uppercase', letterSpacing: 1 },
    modalFieldGroup: { gap: 4 },
    modalLabel: { ...FONT.label, fontSize: 10, color: COLORS.textMuted },
    modalHint: { fontSize: 11, color: COLORS.textMuted, marginBottom: 2, fontStyle: 'italic' },
    modalInput: {
        backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.amber,
        borderRadius: RADIUS.sm, padding: 12, color: COLORS.textPrimary, fontSize: 15,
    },
    modalInputMulti: { minHeight: 72, textAlignVertical: 'top' },
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
    // Header
    header: {
        height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: SPACING.sm, backgroundColor: COLORS.background,
        borderBottomWidth: 2, borderBottomColor: COLORS.border,
    },
    iconBtn: { padding: SPACING.sm },
    headerTitle: { ...FONT.header, fontSize: 20, color: COLORS.amber },
    content: { padding: SPACING.md, paddingBottom: 120, gap: 24 },
    section: { gap: 10 },
    sectionLabel: {
        ...FONT.label, color: COLORS.textMuted,
        borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 8,
    },
    typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    typeCard: {
        width: '48%', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
        borderRadius: RADIUS.sm, paddingVertical: 16, alignItems: 'center', gap: 6,
    },
    typeCardActive: { borderWidth: 2, borderColor: COLORS.amber, backgroundColor: 'rgba(232,160,32,0.08)' },
    typeLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
    typeLabelActive: { color: COLORS.amber },
    inputWrap: { position: 'relative' },
    textArea: {
        backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
        borderRadius: RADIUS.sm, padding: 14, paddingRight: 44,
        color: COLORS.textPrimary, fontSize: 16, minHeight: 90, textAlignVertical: 'top',
    },
    inputIcon: { position: 'absolute', right: 14, top: 14 },
    roomsScroll: { marginBottom: 8, overflow: 'visible' },
    roomsScrollContent: { paddingVertical: 4, paddingRight: 12, alignItems: 'center' },
    chip: {
        borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.full,
        paddingHorizontal: 14, paddingVertical: 8, marginRight: 8,
        backgroundColor: COLORS.surface,
    },
    chipActive: { borderColor: COLORS.blue, backgroundColor: COLORS.blueBg },
    chipText: { ...FONT.mono, fontSize: 10, color: COLORS.textMuted },
    chipTextActive: { ...FONT.mono, fontSize: 10, color: COLORS.blue },
    addRoomBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        borderWidth: 1, borderColor: COLORS.blue, borderRadius: RADIUS.sm,
        paddingHorizontal: 12, paddingVertical: 7, alignSelf: 'flex-start', marginTop: 4,
        backgroundColor: COLORS.blueBg,
    },
    addRoomText: { ...FONT.mono, fontSize: 10 },
    bottomBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: COLORS.background, borderTopWidth: 2, borderTopColor: COLORS.border,
        padding: SPACING.md,
    },
    startBtn: {
        backgroundColor: COLORS.amber, borderRadius: RADIUS.sm,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16,
    },
    startBtnDisabled: { backgroundColor: COLORS.border },
    startBtnText: { fontSize: 16, fontWeight: '800', color: COLORS.amberDark, textTransform: 'uppercase', letterSpacing: 1 },
    startBtnTextDisabled: { color: COLORS.textMuted },
});
