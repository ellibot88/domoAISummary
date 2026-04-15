import domo from 'ryuu.js';
import type { DomoUser, UserPersona } from '../types';

export async function getCurrentUser(): Promise<DomoUser> {
  const userId = (domo as any).env?.userId;
  if (!userId) throw new Error('No user context available');
  return domo.get(`/domo/users/v1/${userId}`) as any;
}

function getAttr(user: DomoUser, key: string): string {
  const vals = user.attributes?.[key];
  return vals?.[0] || '';
}

export function buildPersona(user: DomoUser): UserPersona {
  const persona = getAttr(user, 'persona') || user.role || 'Participant';
  const region = getAttr(user, 'region') || 'all';
  const storeIdsRaw = getAttr(user, 'store_ids');
  const storeIds = storeIdsRaw ? storeIdsRaw.split(',').map((s) => s.trim()) : [];
  const focusCategoriesRaw = getAttr(user, 'focus_categories');
  const focusCategories = focusCategoriesRaw
    ? focusCategoriesRaw.split(',').map((s) => s.trim())
    : [];

  return {
    persona: persona.toLowerCase().trim(),
    role: user.role || 'Participant',
    title: user.detail?.title || '',
    region,
    storeIds,
    focusCategories,
    displayName: user.displayName,
  };
}

export function buildPersonaKey(persona: UserPersona, pageId: string): string {
  const p = persona.persona.replace(/\s+/g, '-');
  const r = persona.region.toLowerCase().replace(/\s+/g, '-');
  return `${p}::${r}::${pageId}`;
}
