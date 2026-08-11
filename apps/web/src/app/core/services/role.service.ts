import { Injectable, signal } from '@angular/core';

export type UserRole = 'admin' | 'reviewer';

const STORAGE_KEY = 'review-grader-role';

/**
 * Client-side-only role gate, not real auth - this app runs as one shared
 * trusted-LAN instance with no login. Picking a role just changes which
 * nav items/pages are visible; the API has no server-side role checks.
 */
@Injectable({ providedIn: 'root' })
export class RoleService {
  readonly role = signal<UserRole | null>(this.readStored());

  setRole(role: UserRole) {
    localStorage.setItem(STORAGE_KEY, role);
    this.role.set(role);
  }

  /** Reopens the role chooser without clearing the stored preference - a
   * fresh pick via setRole() overwrites it again. */
  reopenChooser() {
    this.role.set(null);
  }

  private readStored(): UserRole | null {
    if (typeof localStorage === 'undefined') return null;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'admin' || stored === 'reviewer' ? stored : null;
  }
}
