/**
 * Pure utility functions for dashboard navigation.
 * No React dependencies — these are used by Sidebar, TopBar, and tests.
 */

/**
 * Extracts up to 2 uppercase initials from the first and last word of a full name.
 * Returns "?" for empty or whitespace-only input.
 * For single-word names, the result is exactly 1 character.
 */
export function getInitials(fullName: string): string {
  const trimmed = fullName.trim();
  if (trimmed.length === 0) {
    return '?';
  }

  const words = trimmed.split(/\s+/);
  const first = words[0][0].toUpperCase();

  if (words.length === 1) {
    return first;
  }

  const last = words[words.length - 1][0].toUpperCase();
  return first + last;
}

/**
 * Truncates a name to maxLength characters and appends "…" if it exceeds the limit.
 * Returns the name unchanged if it fits within maxLength.
 * Default maxLength is 20.
 */
export function truncateName(name: string, maxLength: number = 20): string {
  if (name.length <= maxLength) {
    return name;
  }
  return name.slice(0, maxLength) + '…';
}

/**
 * Returns true if the current path starts with the given route prefix.
 * Used to determine which navigation item is active.
 */
export function isActiveRoute(currentPath: string, routePrefix: string): boolean {
  return currentPath.startsWith(routePrefix);
}
