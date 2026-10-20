/**
 * Prompt construction for opening-scene generation.
 *
 * The model is asked for plain prose, separated by a sentinel line. JSON was
 * deliberately avoided: long multi-paragraph strings are where small/quantised
 * models break escaping, and a broken JSON blob loses the whole batch.
 */

export const SCENE_SEPARATOR = '<<<SCENE>>>';

export const VIBES = [
    {
        id: 'auto',
        label: 'Auto',
        icon: 'fa-wand-magic-sparkles',
        brief: 'Pick whatever situation, tone and pacing suits this character best. Favour something specific and unexpected over a generic "hello".',
    },
    {
        id: 'intimate',
        label: 'Intimate',
        icon: 'fa-heart',
        brief: 'Quiet intimacy: close physical proximity, small gestures, charged silence. The attraction is implied, never announced.',
    },
    {
        id: 'conflict',
        label: 'Conflict',
        icon: 'fa-bolt',
        brief: 'Something is already wrong. Friction, an accusation, a standoff, a threat — the player walks into a problem that involves them.',
    },
    {
        id: 'warm',
        label: 'Warm',
        icon: 'fa-mug-hot',
        brief: 'Warm and ordinary: domesticity, easy familiarity, gentle humour, emotional texture. Safety that feels earned.',
    },
    {
        id: 'mystery',
        label: 'Mystery',
        icon: 'fa-magnifying-glass',
        brief: 'Something is off. An unresolved question hangs in the air and the character knows more than they are saying.',
    },
    {
        id: 'action',
        label: 'Action',
        icon: 'fa-fire',
        brief: 'In motion from the first line: urgency, danger, a chase, a fight, a countdown already running.',
    },
    {
        id: 'comedy',
        label: 'Comedy',
        icon: 'fa-masks-theater',
        brief: 'Comedic friction. The character\'s flaws become the joke, timing is deadpan, and the situation escalates past the point of dignity.',
    },
    {
        id: 'angst',
        label: 'Angst',
        icon: 'fa-cloud-rain',
        brief: 'Emotional aftermath: longing, grief, guilt, a wound still open. Restraint over melodrama.',
    },
    {
        id: 'spicy',
        label: 'Spicy',
        icon: 'fa-pepper-hot',
        brief: 'Adult tension is present and acknowledged, but kept suggestive and in-character. Fade before anything explicit.',
    },
];

export const LENGTHS = [
    { id: 'short', label: 'Short', words: 105, hint: '80–120 words', tokens: 260 },
    { id: 'medium', label: 'Medium', words: 175, hint: '140–210 words', tokens: 420 },
    { id: 'long', label: 'Long', words: 285, hint: '240–330 words', tokens: 680 },
];

export const POVS = [
    {
        id: 'second',
        label: 'Second person',
        short: '2nd',
        hint: '“You step inside…”',
        brief: 'Narrate in second person. The player is "you"; they see, hear and feel the scene but their thoughts and actions are never written for them.',
    },
    {
        id: 'first',
        label: 'First person',
        short: '1st',
        hint: '“I don’t look up.”',
        brief: 'Narrate in first person from the character\'s own point of view. The player is "you" as seen by the character.',
    },
    {
        id: 'third',
        label: 'Third person',
        short: '3rd',
        hint: '“She doesn’t look up.”',
        brief: 'Narrate in close third person limited to the character. The player is "you" as seen from outside.',
    },
];

export const COUNTS = [1, 2, 3, 4];

export function byId(list, id) {
    return list.find(item => item.id === id) ?? list[0];
}

export const SYSTEM_PROMPT = `You write opening messages ("first messages") for SillyTavern character cards.

You are not chatting with anyone. You are composing the first beat of a scene: the moment the player character arrives, or the moment this character notices them.

CRAFT RULES
1. Present tense. Prose with dialogue, not a script. No headings, no bullet points, no scene numbers, no titles, no summary, no OOC or meta commentary.
2. Write the character's actions, voice, body language and the surrounding world. Never narrate the player's thoughts, feelings, decisions, history or dialogue. The player is "you" and only perceives what can be seen, heard, smelled or felt.
3. Ground the scene in concrete sensory detail: place, light, temperature, sound, texture. No floating heads in white rooms.
4. Keep the character's exact register — vocabulary, rhythm, verbal tics, formality, slang. If the example dialogue is clipped, stay clipped. If it is florid, be florid.
5. Show the traits; never restate the character sheet. No "she was known for her sharp tongue" — let the tongue be sharp.
6. End on an open hook the player has to answer: a question, an offered hand, a door closing, a name spoken. No resolution, no choice list.
7. Do not mention being an AI, do not apologise, do not explain what you wrote, do not add notes after the scene.`;

const LIMITS = {
    description: 2600,
    personality: 900,
    scenario: 1400,
    examples: 1500,
    creatorNotes: 700,
    depthPrompt: 500,
};

function clip(text, limit) {
    const value = String(text ?? '').trim();
    if (value.length <= limit) {
        return value;
    }
    return `${value.slice(0, limit).trimEnd()}…`;
}

/**
 * Normalises a SillyTavern character object (V1 or V2 shape) into a flat sheet.
 * @param {object} character
 */
export function characterSheet(character) {
    const data = character?.data ?? {};
    const first = (...values) => values.find(value => typeof value === 'string' && value.trim())?.trim() ?? '';

    const tags = data.tags ?? character?.tags ?? [];

    return {
        name: first(character?.name, data.name),
        description: clip(first(character?.description, data.description), LIMITS.description),
        personality: clip(first(character?.personality, data.personality), LIMITS.personality),
        scenario: clip(first(character?.scenario, data.scenario), LIMITS.scenario),
        examples: clip(first(character?.mes_example, data.mes_example), LIMITS.examples),
        creatorNotes: clip(first(data.creator_notes), LIMITS.creatorNotes),
        depthPrompt: clip(first(data?.extensions?.depth_prompt?.prompt), LIMITS.depthPrompt),
        tags: Array.isArray(tags) ? tags.filter(Boolean).map(String).join(', ') : '',
        firstMes: first(character?.first_mes, data.first_mes),
        alternates: Array.isArray(data.alternate_greetings) ? data.alternate_greetings.filter(Boolean).length : 0,
    };
}

function sheetBlock(sheet) {
    const rows = [
        ['Name', sheet.name],
        ['Description', sheet.description],
        ['Personality', sheet.personality],
        ['Scenario', sheet.scenario],
        ['Example dialogue', sheet.examples],
        ['Author notes', sheet.creatorNotes],
        ['Narration notes', sheet.depthPrompt],
        ['Tags', sheet.tags],
    ].filter(([, value]) => value);

    return rows.map(([label, value]) => (value.length > 80 ? `${label}:\n${value}` : `${label}: ${value}`)).join('\n\n');
}

/**
 * Builds the user-side prompt.
 * @param {object} params
 * @param {object} params.sheet Result of {@link characterSheet}
 * @param {string} params.vibeId
 * @param {string} params.lengthId
 * @param {string} params.povId
 * @param {number} params.count
 * @param {string} [params.direction] Free-form extra direction from the user
 * @param {string} [params.extraInstructions] Standing instructions from settings
 * @param {string} [params.userName] Player persona name, if any
 * @param {string[]} [params.avoid] Texts the model should diverge from
 */
export function buildPrompt({ sheet, vibeId, lengthId, povId, count, direction = '', extraInstructions = '', userName = '', avoid = [] }) {
    const vibe = byId(VIBES, vibeId);
    const length = byId(LENGTHS, lengthId);
    const pov = byId(POVS, povId);
    const total = Math.max(1, Math.min(COUNTS[COUNTS.length - 1], Number(count) || 1));

    const parts = [];

    parts.push('=== CHARACTER SHEET ===');
    parts.push(sheetBlock(sheet));
    parts.push('=== END CHARACTER SHEET ===');

    if (userName) {
        parts.push(`The player character is named ${userName}. Address them as "you".`);
    }

    if (sheet.firstMes) {
        parts.push(
            '=== EXISTING OPENING (do not imitate) ===\n' +
            `${clip(sheet.firstMes, 1200)}\n` +
            '=== END EXISTING OPENING ===\n' +
            'The card already opens like the text above. Write something clearly different: a different place, a different moment, a different first line. Reusing its imagery, its first sentence or its structure is a failure.',
        );
    }

    if (Array.isArray(avoid) && avoid.length) {
        const list = avoid.map(text => `- ${clip(text, 240)}`).join('\n');
        parts.push(`=== ALREADY WRITTEN — DO NOT REUSE ===\n${list}`);
    }

    const briefLines = [
        '=== SCENE BRIEF ===',
        `Vibe: ${vibe.label}. ${vibe.brief}`,
        `Perspective: ${pov.brief}`,
        `Length: about ${length.words} words (${length.hint}). Getting the length roughly right matters.`,
    ];

    if (direction.trim()) {
        briefLines.push(`Extra direction from the player (follow it, it outranks the vibe): ${direction.trim()}`);
    }

    if (extraInstructions.trim()) {
        briefLines.push(`Standing style notes: ${extraInstructions.trim()}`);
    }

    parts.push(briefLines.join('\n'));

    if (total === 1) {
        parts.push('Write ONE opening message now. Output the scene text only.');
    } else {
        parts.push(
            `Write ${total} DIFFERENT opening messages for this character. Each one must use a different situation, time of day, place and first line — not the same scene rephrased. All obey the craft rules.`,
        );
        parts.push(`Put this exact line on its own between the scenes (and nowhere else):\n${SCENE_SEPARATOR}`);
        parts.push(`Output order: ${Array.from({ length: total }, () => 'scene').join(', separator, ')}. No titles, no numbering, no commentary.`);
    }

    return parts.join('\n\n');
}

/** Token budget for the reply, with headroom for the separator chatter. */
export function responseBudget(count, lengthId) {
    const length = byId(LENGTHS, lengthId);
    return Math.min(6000, Math.round(Math.max(1, count) * (length.tokens + 120) + 120));
}

const SCENE_LABEL = /^(?:scene|opening|variant|option|message)\s*\d*\s*[:\-–—]\s*/i;
const TITLE_LINE = /^(?:title|name)\s*[:\-–—]\s*.*\n/i;
const TRAILING_NOTE = /\n+(?:note|explanation|this scene|hope this|let me know|feel free)[\s\S]*$/i;

function cleanScene(raw, charName = '') {
    let text = String(raw ?? '').trim();
    if (!text) {
        return '';
    }

    text = text.replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/, '').trim();
    text = text.replace(/<\/?(?:thought|thinking|reasoning)>[\s\S]*?<\/(?:thought|thinking|reasoning)>/gi, '').trim();
    text = text.replace(TRAILING_NOTE, '').trim();

    // Drop a leading "Title: ..." line and "Scene 2:" style labels.
    text = text.replace(TITLE_LINE, '').trim();
    text = text.replace(SCENE_LABEL, '').trim();

    // Drop a repeated speaker prefix like "Aria:" / "Aria —".
    if (charName) {
        const escaped = charName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        text = text.replace(new RegExp(`^${escaped}\\s*[:\\-–—]\\s*`, 'i'), '').trim();
    }

    // Strip wrapping quotes if the whole scene is quoted.
    if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith('“') && text.endsWith('”'))) {
        text = text.slice(1, -1).trim();
    }

    return text;
}

function splitNumbered(text) {
    const matches = [...text.matchAll(/^[ \t]*(?:\*\*)?(?:scene|opening|variant|option)\s*\d+(?:\*\*)?[ \t]*(?:[:\-–—.)])?[ \t]*/gim)];
    if (matches.length < 2) {
        return [];
    }

    return matches.map((match, index) => {
        const start = match.index + match[0].length;
        const end = index + 1 < matches.length ? matches[index + 1].index : text.length;
        return text.slice(start, end);
    });
}

/** First sentence, trimmed to something that fits on one line. */
export function deriveTitle(text) {
    const flat = String(text ?? '')
        .replace(/\*+/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const sentence = flat.split(/(?<=[.!?…])\s/).find(part => part.length > 12) ?? flat;
    const title = sentence.replace(/^["“'`]|["”'`]$/g, '').replace(/[.!?…,;:]+$/, '').trim();
    const shortened = title.length > 52 ? `${title.slice(0, 52).replace(/[\s,;:-]+\S*$/, '')}…` : title;

    return shortened || 'Opening';
}

export function countWords(text) {
    return (String(text ?? '').match(/\S+/g) ?? []).length;
}

/**
 * Turns raw model output into scene objects.
 * @param {string} raw
 * @param {object} [options]
 * @param {number} [options.expected] How many scenes were requested
 * @param {string} [options.charName]
 * @returns {{text: string, title: string, words: number}[]}
 */
export function parseScenes(raw, { expected = 1, charName = '' } = {}) {
    const source = String(raw ?? '').trim();
    if (!source) {
        return [];
    }

    let chunks = [];

    if (source.includes(SCENE_SEPARATOR)) {
        chunks = source.split(SCENE_SEPARATOR);
    } else if (/^\s*(?:-{3,}|={3,}|\*{3,})\s*$/m.test(source)) {
        chunks = source.split(/\n\s*(?:-{3,}|={3,}|\*{3,})\s*\n/);
    } else {
        const numbered = splitNumbered(source);
        if (numbered.length > 1) {
            chunks = numbered;
        }
    }

    let scenes = chunks.map(chunk => cleanScene(chunk, charName)).filter(Boolean);

    // A model that ignored the separator and answered with prose is still usable.
    if (scenes.length === 0) {
        const single = cleanScene(source, charName);
        scenes = single ? [single] : [];
    }

    return scenes.slice(0, Math.max(expected, 1)).map(text => ({
        text,
        title: deriveTitle(text),
        words: countWords(text),
    }));
}
