/**
 * Centralized branding assets for Mengko Agents
 * Used by OAuth callback pages
 */

export const MENGKO_LOGO = [
  '  ████   ████  ██████ █████ ████  ██████ ██████',
  '  █   █ █   █  █      █     █   █ █      █    █',
  '  █   █ █   █  █      █     █   █ █      █    █',
  '  ████   ████  ████   ████  ████  ████   ████',
  '  █      █   █ █      █     █  █  █      █ █',
  '  █      █   █ █      █     █   █ █      █  █',
  '  █      █   █ ██████ █████ █   █ ██████ █   █',
] as const;

/** Logo as a single string for HTML templates */
export const MENGKO_LOGO_HTML = MENGKO_LOGO.map((line) => line.trimEnd()).join('\n');

/** @deprecated Use MENGKO_LOGO_HTML instead */
export const CRAFT_LOGO_HTML = MENGKO_LOGO_HTML;

/** Session viewer base URL */
export const VIEWER_URL = 'https://agents.mengko.ai';
