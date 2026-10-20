// Stub of SillyTavern's script.js exports used by the extension.

import { extension_settings } from './scripts/extensions.js';

export function saveSettingsDebounced() {
    window.__saved = JSON.parse(JSON.stringify(extension_settings));
}

const A = `*The rain has been going for an hour and the loading dock is slick with it.*\n\nAria is standing under the awning with a cardboard box against her hip, watching the water come off the roof in a sheet. She has not brought an umbrella. She has brought, instead, a precise and visible annoyance.\n\n"You're the one they sent," she says. It isn't a question, and she doesn't look away from the rain. "Good. The lift is broken, the boxes are waterlogged, and I have been told this is my problem now."\n\nShe turns then, finally, and her eyes go over you once — quick, cataloguing, the way she looks at a mis-shelved book.\n\n"Are you going to stand there dripping, or are you going to help me carry?"`;

const B = `*The reading room is dark except for one lamp, and the lamp is failing.*\n\nAria has three books open in front of her in a fan, and she is reading all of them at once, which she would deny. When the door clicks she doesn't startle. She just closes the nearest volume with a finger still in it.\n\n"Nine forty," she says. "The Institute closed to the public at six."\n\nShe looks up, and there is something almost like relief in it before she buries it.\n\n"Since you're here — sit down. I need someone to tell me whether I'm being sentimental about a book."\n\nShe pushes it across the table toward you, and waits.`;

const C = `*The archive smells of dust and rain at the same time, which means a window is open somewhere on the ninth floor.*\n\n"You should know," Aria says from up the ladder, "that the last assistant lasted eleven days."\n\nShe descends two rungs, ledger under one arm, and considers you with the flat interest of someone deciding whether a thing is worth keeping.\n\n"The buyers come in three weeks. After that, none of this exists. So I'll tell you the same thing I told them: I am not interested in being rescued, and I am *very* interested in being useful."\n\nShe holds out the ledger, and it is heavier than it looks.\n\n"Well?"`;

const SEP = '\n\n<<<SCENE>>>\n\n';

export async function generateQuietPrompt({ quietPrompt = '', responseLength = null } = {}) {
    window.__lastPrompt = quietPrompt;
    window.__lastMode = 'quiet';
    window.__lastResponseLength = responseLength;
    await new Promise(resolve => setTimeout(resolve, 900));
    return A + SEP + B + SEP + C;
}

export async function generateRaw({ prompt = '', systemPrompt = '', responseLength = null } = {}) {
    window.__lastPrompt = prompt;
    window.__lastSystemPrompt = systemPrompt;
    window.__lastMode = 'raw';
    window.__lastResponseLength = responseLength;
    await new Promise(resolve => setTimeout(resolve, 900));
    return A + SEP + B + SEP + C;
}
