/**
 * Centralized path configuration for Mengko Agents.
 *
 * Supports multi-instance development via MENGKO_CONFIG_DIR environment variable.
 * When running from a numbered folder (e.g., mengko-agent-1), the detect-instance.sh
 * script sets MENGKO_CONFIG_DIR to ~/.mengko-agent-1, allowing multiple instances to run
 * simultaneously with separate configurations.
 *
 * Default (non-numbered folders): ~/.mengko-agent/
 * Instance 1 (-1 suffix): ~/.mengko-agent-1/
 * Instance 2 (-2 suffix): ~/.mengko-agent-2/
 *
 * @legacy Also supports CRAFT_CONFIG_DIR for backward compatibility
 */

import { homedir } from 'os';
import { join } from 'path';

// Allow override via environment variable for multi-instance dev
// Supports both MENGKO_CONFIG_DIR (new) and CRAFT_CONFIG_DIR (legacy)
// Falls back to default ~/.mengko-agent/ for production and non-numbered dev folders
export const CONFIG_DIR = process.env.MENGKO_CONFIG_DIR
  || process.env.CRAFT_CONFIG_DIR
  || join(homedir(), '.mengko-agent');