import React, { useState, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, TextInput, ScrollView, Image,
    StyleSheet, StatusBar, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, FONT, SPACING, RADIUS } from '../theme';
import { loadSettings, saveSettings, saveInspections } from '../utils/storage';

export default function SettingsScreen({ navigation }) {
    const [companyName, setCompanyName] = useState('');
    const [inspectorName, setInspectorName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [logoUri, setLogoUri] = useState(null);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        loadSettings().then((s) => {
            setCompanyName(s.companyName || '');
            setInspectorName(s.inspectorName || '');
            setPhone(s.phone || '');
            setEmail(s.email || '');
            setLogoUri(s.logoUri || null);
        });
    }, []);

    const handleLogoTap = async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
            Alert.alert('Permission Required', 'Gallery access is needed to pick a logo.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
            allowsEditing: true,
            aspect: [1, 1],
        });
        if (!result.canceled) setLogoUri(result.assets[0].uri);
    };

    const handleSave = async () => {
        await saveSettings({ companyName, inspectorName, phone, email, logoUri });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleClearAll = () => {
        Alert.alert(
            'Clear All Inspections',
            'This will permanently delete all saved inspections. This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete All',
                    style: 'destructive',
                    onPress: async () => {
                        await saveInspections([]);
                        navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
                    },
                },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                    <MaterialIcons name="arrow-back" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
                <TouchableOpacity style={styles.saveHeaderBtn} onPress={handleSave}>
                    <Text style={styles.saveHeaderText}>{saved ? '✓ Saved' : 'SAVE'}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Logo */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>COMPANY LOGO</Text>
                    <TouchableOpacity style={styles.logoTap} onPress={handleLogoTap}>
                        {logoUri ? (
                            <Image source={{ uri: logoUri }} style={styles.logoImg} />
                        ) : (
                            <View style={styles.logoPlaceholder}>
                                <MaterialIcons name="add-photo-alternate" size={32} color={COLORS.textMuted} />
                                <Text style={styles.logoPlaceholderText}>Tap to add logo</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Company Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>COMPANY INFO</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Company name"
                        placeholderTextColor={COLORS.textMuted}
                        value={companyName}
                        onChangeText={setCompanyName}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Inspector name"
                        placeholderTextColor={COLORS.textMuted}
                        value={inspectorName}
                        onChangeText={setInspectorName}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Phone number"
                        placeholderTextColor={COLORS.textMuted}
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Email address"
                        placeholderTextColor={COLORS.textMuted}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                </View>

                {/* Save button */}
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
                    <MaterialIcons name="save" size={20} color={COLORS.amberDark} />
                    <Text style={styles.saveBtnText}>{saved ? '✓ SAVED' : 'SAVE SETTINGS'}</Text>
                </TouchableOpacity>

                {/* Danger zone */}
                <View style={styles.dangerSection}>
                    <Text style={styles.dangerLabel}>DANGER ZONE</Text>
                    <TouchableOpacity style={styles.dangerBtn} onPress={handleClearAll}>
                        <MaterialIcons name="delete-forever" size={20} color={COLORS.red} />
                        <Text style={styles.dangerBtnText}>CLEAR ALL INSPECTIONS</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: COLORS.background },
    header: {
        height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: SPACING.sm, backgroundColor: COLORS.background,
        borderBottomWidth: 2, borderBottomColor: COLORS.border,
    },
    iconBtn: { padding: SPACING.sm },
    headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.amber, textTransform: 'uppercase' },
    saveHeaderBtn: { paddingHorizontal: 12, paddingVertical: 6 },
    saveHeaderText: { fontSize: 13, fontWeight: '700', color: COLORS.amber, letterSpacing: 1 },
    content: { padding: SPACING.md, gap: 24, paddingBottom: 60 },
    section: { gap: 10 },
    sectionLabel: {
        ...FONT.label, color: COLORS.textMuted,
        borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 8,
    },
    logoTap: {
        width: 110, height: 110, borderRadius: RADIUS.md,
        borderWidth: 1, borderColor: COLORS.border,
        overflow: 'hidden', alignSelf: 'flex-start',
    },
    logoImg: { width: '100%', height: '100%' },
    logoPlaceholder: {
        flex: 1, backgroundColor: COLORS.surface,
        alignItems: 'center', justifyContent: 'center', gap: 6,
    },
    logoPlaceholderText: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center' },
    input: {
        backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
        borderRadius: RADIUS.sm, padding: 14, color: COLORS.textPrimary, fontSize: 16,
    },
    saveBtn: {
        backgroundColor: COLORS.amber, borderRadius: RADIUS.sm,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, paddingVertical: 16,
    },
    saveBtnText: { fontSize: 15, fontWeight: '900', color: COLORS.amberDark, letterSpacing: 1 },
    dangerSection: { gap: 10, marginTop: 8 },
    dangerLabel: {
        ...FONT.label, color: COLORS.red,
        borderBottomWidth: 1, borderBottomColor: COLORS.redBorder, paddingBottom: 8,
    },
    dangerBtn: {
        borderWidth: 1, borderColor: COLORS.redBorder, backgroundColor: COLORS.redBg,
        borderRadius: RADIUS.sm, flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: 8, paddingVertical: 14,
    },
    dangerBtnText: { fontSize: 13, fontWeight: '800', color: COLORS.red, letterSpacing: 1 },
});
