// Mirrors the server-side RoomRank ordinal + ICU-family exemption used by GetDischargeTpaSplitHandler
// (EasyHMSAPI.Application.Handlers.QueryHandlers) — same pattern as IpdConstants.WhoChecklistItems
// being mirrored client-side in SurgeryCasePanel.tsx. Keep the two in sync if the rule ever changes.
const ROOM_RANK: Record<string, number> = {
    GENERAL: 1,
    SEMI_PRIVATE: 2,
    PRIVATE: 3,
};

const ICU_FAMILY = new Set(['ICU', 'NICU', 'PICU', 'HDU', 'CCU', 'ICCU']);

export const isIcuFamilyWard = (wardType?: string | null): boolean =>
    !!wardType && ICU_FAMILY.has(wardType.trim().toUpperCase());

/**
 * Warn-only bed-entitlement check: true when the picked ward ranks above the patient's entitled
 * room category. ICU-family wards are never flagged (clinical necessity, not a room upgrade).
 * Returns false whenever either side is unset/unranked — never warns on data it can't compare.
 */
export const isAboveEntitlement = (wardType?: string | null, entitledRoomCategory?: string | null): boolean => {
    if (!wardType || !entitledRoomCategory) return false;
    if (isIcuFamilyWard(wardType)) return false;
    const actualRank = ROOM_RANK[wardType.trim().toUpperCase()];
    const entitledRank = ROOM_RANK[entitledRoomCategory.trim().toUpperCase()];
    if (!actualRank || !entitledRank) return false;
    return actualRank > entitledRank;
};
