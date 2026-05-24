import type { Role } from '@/lib/domain/enums';

export function getEngName(sessionId: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(`wa-eng-name-${sessionId}`);
}

export function setEngName(sessionId: string, name: string) {
  localStorage.setItem(`wa-eng-name-${sessionId}`, name);
}

export function getEngRole(sessionId: string): Role {
  if (typeof window === 'undefined') return 'IC';
  return (localStorage.getItem(`wa-eng-role-${sessionId}`) as Role) || 'IC';
}

export function setEngRole(sessionId: string, role: Role) {
  localStorage.setItem(`wa-eng-role-${sessionId}`, role);
}

export function getFacilitatorToken(sessionId: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(`wa-facilitator-token-${sessionId}`);
}

export function setFacilitatorToken(sessionId: string, token: string) {
  localStorage.setItem(`wa-facilitator-token-${sessionId}`, token);
}
