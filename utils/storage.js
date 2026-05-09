import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
    INSPECTIONS: 'inspections',
    SETTINGS: 'settings',
    ONBOARDED: 'onboarded',
};

const DEFAULT_SETTINGS = {
    companyName: '',
    inspectorName: '',
    phone: '',
    email: '',
    logoUri: null,
};

// ─── Inspections ───────────────────────────────────────────────
export async function loadInspections() {
    try {
        const raw = await AsyncStorage.getItem(KEYS.INSPECTIONS);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.error('loadInspections:', e);
        return [];
    }
}

export async function saveInspections(array) {
    try {
        await AsyncStorage.setItem(KEYS.INSPECTIONS, JSON.stringify(array));
    } catch (e) {
        console.error('saveInspections:', e);
    }
}

export async function updateInspection(id, updated) {
    try {
        const all = await loadInspections();
        const idx = all.findIndex((i) => i.id === id);
        if (idx === -1) {
            all.unshift(updated);
        } else {
            all[idx] = updated;
        }
        await saveInspections(all);
    } catch (e) {
        console.error('updateInspection:', e);
    }
}

export async function deleteInspection(id) {
    try {
        const all = await loadInspections();
        await saveInspections(all.filter((i) => i.id !== id));
    } catch (e) {
        console.error('deleteInspection:', e);
    }
}

export async function getInspectionById(id) {
    const all = await loadInspections();
    return all.find((i) => i.id === id) || null;
}

// ─── Settings ──────────────────────────────────────────────────
export async function loadSettings() {
    try {
        const raw = await AsyncStorage.getItem(KEYS.SETTINGS);
        return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
    } catch (e) {
        console.error('loadSettings:', e);
        return { ...DEFAULT_SETTINGS };
    }
}

export async function saveSettings(settings) {
    try {
        await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
        console.error('saveSettings:', e);
    }
}

// ─── Onboarding ────────────────────────────────────────────────
export async function isOnboarded() {
    try {
        const val = await AsyncStorage.getItem(KEYS.ONBOARDED);
        return val === 'true';
    } catch (e) {
        return false;
    }
}

export async function setOnboarded() {
    try {
        await AsyncStorage.setItem(KEYS.ONBOARDED, 'true');
    } catch (e) {
        console.error('setOnboarded:', e);
    }
}
