// Factory functions for building the default Inspection data model

const makeItem = (name) => ({
    id: `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    status: 'none', // 'none' | 'ok' | 'issue' | 'na'
    note: '',
    photos: [],
});

const makeRoom = (name, itemNames) => ({
    id: `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    items: itemNames.map(makeItem),
});

export const DEFAULT_ROOM_DEFINITIONS = [
    { name: 'Living Room', items: ['Walls & Ceiling', 'Flooring', 'Windows', 'Lights & Switches', 'Doors'] },
    { name: 'Kitchen', items: ['Countertops', 'Cabinets', 'Sink & Faucet', 'Appliances', 'Flooring'] },
    { name: 'Bedroom', items: ['Walls & Ceiling', 'Flooring', 'Windows', 'Closet', 'Lights'] },
    { name: 'Bathroom', items: ['Toilet', 'Shower/Tub', 'Sink & Faucet', 'Tiles', 'Ventilation'] },
    { name: 'Exterior', items: ['Front Door', 'Mailbox', 'Parking/Garage', 'Garden/Yard'] },
];

export function buildDefaultRooms(selectedNames) {
    return DEFAULT_ROOM_DEFINITIONS
        .filter((def) => selectedNames.includes(def.name))
        .map((def) => makeRoom(def.name, def.items));
}

export function buildCustomRoom(name) {
    return makeRoom(name, ['General Condition', 'Cleanliness', 'Damage']);
}

export function createInspection({ address, type, inspector, selectedRoomNames }) {
    const now = new Date();
    const date = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return {
        id: String(Date.now()),
        address,
        type,
        inspector,
        date,
        rooms: buildDefaultRooms(selectedRoomNames),
        status: 'in-progress',
    };
}
