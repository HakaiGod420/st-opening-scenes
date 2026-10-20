import { getContext } from '../../../../extensions.js';
import { generateQuietPrompt, generateRaw } from '../../../../../script.js';
import { SYSTEM_PROMPT, buildPrompt, characterSheet, parseScenes, responseBudget } from './prompt.js';

/**
 * Characters that can be generated for.
 * @returns {object[]}
 */
export function listCharacters() {
    const context = getContext();
    return (context.characters ?? []).filter(character => character && character.avatar && character.name);
}

export function activeCharacter() {
    const context = getContext();
    const active = context.characters?.[context.characterId];
    return active && active.avatar ? active : null;
}

export function isActiveCharacter(character) {
    const active = activeCharacter();
    return Boolean(active && character && active.avatar === character.avatar);
}

/**
 * Generates opening scenes for a character.
 *
 * For the character currently loaded in chat we use `generateQuietPrompt`, so
 * the model keeps the live card context (world info, persona, chat history).
 * For any other character we use `generateRaw` with a fully self-contained
 * prompt, because quiet prompts would otherwise be written *through* the
 * currently selected character's card.
 *
 * @param {object} params
 * @param {object} params.character
 * @param {string} params.vibeId
 * @param {string} params.lengthId
 * @param {string} params.povId
 * @param {number} params.count
 * @param {string} [params.direction]
 * @param {string} [params.extraInstructions]
 * @param {string[]} [params.avoid]
 * @returns {Promise<{text: string, title: string, words: number}[]>}
 */
export async function generateScenes({ character, vibeId, lengthId, povId, count, direction = '', extraInstructions = '', avoid = [] }) {
    const context = getContext();
    const sheet = characterSheet(character);

    if (!sheet.description && !sheet.personality && !sheet.scenario) {
        throw new Error('This character card is empty — there is nothing to write from.');
    }

    const prompt = buildPrompt({
        sheet,
        vibeId,
        lengthId,
        povId,
        count,
        direction,
        extraInstructions,
        userName: context.name1 ?? '',
        avoid,
    });

    const responseLength = responseBudget(count, lengthId);
    const quietName = sheet.name || null;

    let raw;
    if (isActiveCharacter(character)) {
        raw = await generateQuietPrompt({
            quietPrompt: prompt,
            quietName,
            responseLength,
            skipWIAN: false,
        });
    } else {
        raw = await generateRaw({
            prompt,
            systemPrompt: SYSTEM_PROMPT,
            responseLength,
        });
    }

    const scenes = parseScenes(raw, { expected: count, charName: sheet.name });

    if (!scenes.length) {
        throw new Error('The model returned nothing usable. Try again, or check the connection.');
    }

    return scenes;
}
