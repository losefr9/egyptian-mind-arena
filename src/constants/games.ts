// Game IDs from database - المصدر الوحيد للحقيقة
export const GAME_IDS = {
  XO: '0820413a-dc12-465d-b7e8-3a4431b5a20f',
  DOMINO: 'e5f8c9a1-2b3d-4e5f-6a7b-8c9d0e1f2a3b',
  CHESS: '4490b8f4-b127-41f9-ae20-33c3af269421',
  LUDO: '7901ff9f-8a1e-4d2b-b763-06245033e62f'
} as const;

// Game names for display
export const GAME_NAMES = {
  [GAME_IDS.XO]: 'XO Game',
  [GAME_IDS.DOMINO]: 'دومينو',
  [GAME_IDS.CHESS]: 'شطرنج',
  [GAME_IDS.LUDO]: 'لودو'
} as const;
