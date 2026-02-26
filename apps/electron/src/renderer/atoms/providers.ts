/**
 * Providers Atom
 *
 * Stores the currently selected LLM connection slug in the Providers panel.
 * ProvidersListPanel (middle panel) writes to this; ProvidersSettingsPage (right panel) reads from it.
 */

import { atom } from 'jotai'

/** The currently selected connection slug in the Providers navigator panel. */
export const selectedProviderSlugAtom = atom<string | null>(null)

/** Holds the openWizard function registered by ProvidersListPanel so AppShell header button can call it. */
export const addProviderCallbackAtom = atom<(() => void) | null>(null)
