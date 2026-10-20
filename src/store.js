import { extension_settings } from '../../../../extensions.js';
import { saveSettingsDebounced } from '../../../../../script.js';

export const EXTENSION_NAME = 'st-opening-scenes';
export const EXTENSION_FOLDER = `third-party/${EXTENSION_NAME}`;

/** Key used inside SillyTavern's `extension_settings` object. */
export const MODULE_NAME = 'openingScenes';

export const DEFAULT_SETTINGS = Object.freeze({
    vibe: 'auto',
    length: 'medium',
    pov: 'second',
    count: 2,
    direction: '',
    extraInstructions: '',
    lastAvatar: '',
});

/**
 * Returns the live settings object, filling in anything missing.
 * @returns {typeof DEFAULT_SETTINGS}
 */
export function getSettings() {
    if (!extension_settings[MODULE_NAME] || typeof extension_settings[MODULE_NAME] !== 'object' || Array.isArray(extension_settings[MODULE_NAME])) {
        extension_settings[MODULE_NAME] = {};
    }

    const settings = extension_settings[MODULE_NAME];

    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
        if (settings[key] === undefined) {
            settings[key] = value;
        }
    }

    return settings;
}

/**
 * Merges a patch into the settings and schedules a save.
 * @param {Partial<typeof DEFAULT_SETTINGS>} patch
 */
export function patchSettings(patch) {
    Object.assign(getSettings(), patch);
    saveSettingsDebounced();
}

/** Validates a persisted value against a list of allowed ids. */
export function pickId(value, list, fallback) {
    return Array.isArray(list) && list.some(item => item.id === value) ? value : fallback;
}
