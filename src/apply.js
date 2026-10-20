import { getContext } from '../../../../extensions.js';

const MERGE_URL = '/api/characters/merge-attributes';

/**
 * Writes a partial update into a character card PNG.
 * SillyTavern deep-merges the payload into the stored V2 card and validates it,
 * so only the touched fields need to be sent.
 * @param {object} character
 * @param {object} update
 */
async function mergeCard(character, update) {
    const context = getContext();
    const response = await fetch(MERGE_URL, {
        method: 'POST',
        headers: context.getRequestHeaders(),
        body: JSON.stringify({ avatar: character.avatar, ...update }),
        cache: 'no-cache',
    });

    if (!response.ok) {
        let detail = `${response.status}`;
        try {
            const body = await response.json();
            detail = body?.message ?? body?.error ?? detail;
        } catch {
            // Non-JSON error body; the status is all we have.
        }
        throw new Error(`Could not save the card (${detail}).`);
    }
}

/** V2 cards keep the card fields under `data`; V1 cards keep them at the root. */
function isV2(character) {
    const data = character?.data;
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return false;
    }
    return Boolean(data.name || data.spec || data.first_mes !== undefined || Array.isArray(data.alternate_greetings));
}

function sameAvatar(a, b) {
    return Boolean(a && b && String(a) === String(b));
}

/**
 * Replaces the greeting already sitting in the open chat.
 * Only safe when that chat is untouched (just the greeting).
 * @returns {Promise<boolean>} whether the open chat was updated
 */
async function syncOpenGreeting(character, text) {
    const context = getContext();
    const active = context.characters?.[context.characterId];

    if (!sameAvatar(active?.avatar, character.avatar)) {
        return false;
    }

    if (!Array.isArray(context.chat) || context.chat.length !== 1 || context.chat[0]?.is_user) {
        return false;
    }

    context.chat[0].mes = text;
    context.chat[0].swipes = undefined;
    context.chat[0].swipe_id = undefined;
    context.chat[0].swipe_info = undefined;

    try {
        await context.saveChat?.();
        await context.reloadCurrentChat?.();
        return true;
    } catch (error) {
        console.warn('[Opening Scenes] Card saved, but the open chat could not be refreshed', error);
        return false;
    }
}

/**
 * Sets the card's first message.
 * @param {object} character
 * @param {string} text
 * @returns {Promise<boolean>} whether the open chat greeting was updated too
 */
export async function applyFirstMessage(character, text) {
    const update = isV2(character) ? { data: { first_mes: text } } : { first_mes: text };
    await mergeCard(character, update);

    character.first_mes = text;
    if (isV2(character)) {
        character.data.first_mes = text;
    }

    return syncOpenGreeting(character, text);
}

/**
 * Appends a greeting to the card's alternate greetings.
 * @param {object} character
 * @param {string} text
 * @returns {Promise<number>} the new number of alternate greetings
 */
export async function applyAlternateGreeting(character, text) {
    const existing = Array.isArray(character?.data?.alternate_greetings)
        ? character.data.alternate_greetings.filter(entry => typeof entry === 'string')
        : [];

    const next = [...existing, text];

    await mergeCard(character, { data: { alternate_greetings: next } });
    character.data = { ...(character.data ?? {}), alternate_greetings: next };

    return next.length;
}

/**
 * Appends the text as a new message in the currently open chat.
 * @param {object} character
 * @param {string} text
 */
export async function insertIntoChat(character, text) {
    const context = getContext();
    const active = context.characters?.[context.characterId];

    if (!sameAvatar(active?.avatar, character.avatar)) {
        throw new Error(`Open ${character.name}'s chat first, then insert.`);
    }

    const message = {
        name: character.name,
        is_user: false,
        is_system: false,
        send_date: Date.now(),
        mes: text,
        extra: {},
    };

    context.chat.push(message);
    context.addOneMessage(message);

    try {
        await context.saveChat?.();
    } catch (error) {
        console.warn('[Opening Scenes] Inserted message could not be saved', error);
    }
}

/** Copies text to the clipboard, with a fallback for plain-http LAN origins. */
export async function copyText(text) {
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch {
        // Fall through to the legacy path (insecure origin, denied permission).
    }

    try {
        const area = document.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.top = '-1000px';
        document.body.append(area);
        area.select();
        const ok = document.execCommand('copy');
        area.remove();
        return ok;
    } catch {
        return false;
    }
}
