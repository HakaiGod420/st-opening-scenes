// Parser/prompt unit tests. Copies the module to .mjs so plain node can import it.
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
mkdirSync(join(here, 'tmp'), { recursive: true });
copyFileSync(join(here, '..', 'src', 'prompt.js'), join(here, 'tmp', 'prompt.mjs'));

const { parseScenes, buildPrompt, characterSheet, deriveTitle, countWords, responseBudget } =
    await import(`./tmp/prompt.mjs?v=${Date.now()}`);

let failures = 0;
function check(name, condition, detail = '') {
    if (condition) {
        console.log(`  ok   ${name}`);
    } else {
        failures += 1;
        console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
    }
}

console.log('\nparseScenes');

{
    const out = parseScenes('First scene here.\n\n<<<SCENE>>>\n\nSecond scene here.', { expected: 2 });
    check('explicit separators', out.length === 2 && out[1].text.startsWith('Second'), JSON.stringify(out.map(s => s.text)));
}

{
    const out = parseScenes('One.\n\n<<<SCENE>>>\n\nTwo.\n\n<<<SCENE>>>\n\nThree.', { expected: 2 });
    check('extras beyond requested count are dropped', out.length === 2, JSON.stringify(out.map(s => s.text)));
}

{
    const out = parseScenes('One.\n\n<<<SCENE>>>\n\nTwo.', { expected: 3 });
    check('fewer scenes than requested are kept', out.length === 2, JSON.stringify(out.map(s => s.text)));
}

{
    const out = parseScenes('Scene 1: The rain came down.\n\nScene 2: The lamp died.', { expected: 2 });
    check('numbered labels', out.length === 2 && !/^Scene 2/.test(out[1].text), JSON.stringify(out.map(s => s.text)));
}

{
    const out = parseScenes('The door was open.\n\n---\n\nShe was already inside.', { expected: 2 });
    check('dash separators', out.length === 2, JSON.stringify(out.map(s => s.text)));
}

{
    const out = parseScenes('<thought>planning the scene</thought>\n\nShe looked up slowly and said nothing at all.', { expected: 1 });
    check('reasoning stripped', out.length === 1 && !out[0].text.includes('thought'), out[0]?.text);
}

{
    const out = parseScenes('```\nTitle: Rain\n\nAria did not turn around.\n```', { expected: 1 });
    check('code fence + title line', out.length === 1 && !/Title:/.test(out[0].text) && !out[0].text.includes('```'), out[0]?.text);
}

{
    const out = parseScenes('"You are late," she said, and did not look up.\n\nNote: this scene leans cold.', { expected: 1 });
    check('trailing note removed', out.length === 1 && !/Note:/.test(out[0].text), out[0]?.text);
    check('opening dialogue quote kept', out[0].text.startsWith('"You are late'), out[0]?.text);
}

{
    const out = parseScenes('“The whole scene is quoted, start to finish.”', { expected: 1 });
    check('full-wrap quotes stripped', !out[0].text.startsWith('“') && !out[0].text.endsWith('”'), out[0]?.text);
}

{
    const out = parseScenes('Aria: The lights were off.\n\nShe had been waiting.', { expected: 1, charName: 'Aria' });
    check('speaker prefix stripped', out[0]?.text.startsWith('The lights'), out[0]?.text);
}

{
    const out = parseScenes('', { expected: 1 });
    check('empty input', out.length === 0);
}

{
    const long = 'word '.repeat(400);
    const out = parseScenes(long, { expected: 1 });
    check('long single scene kept whole', out.length === 1 && out[0].words === 400, String(out[0]?.words));
}

console.log('\nhelpers');

check('title is short', deriveTitle('The rain had been falling for an hour on the loading dock.').length <= 56, deriveTitle('The rain had been falling for an hour on the loading dock.'));
check('word count', countWords('one two three') === 3);
check('budget grows with count', responseBudget(3, 'long') > responseBudget(1, 'short'), `${responseBudget(3, 'long')} vs ${responseBudget(1, 'short')}`);

console.log('\nbuildPrompt');

const character = {
    name: 'Aria',
    first_mes: 'The elevator doors open.',
    description: 'An archivist.',
    personality: 'Dry.',
    scenario: 'A dying library.',
    mes_example: '',
    data: { alternate_greetings: ['a'] },
};

{
    const prompt = buildPrompt({
        sheet: characterSheet(character),
        vibeId: 'conflict',
        lengthId: 'short',
        povId: 'third',
        count: 2,
        direction: 'start at night',
        userName: 'Kai',
    });

    check('has sheet', prompt.includes('Name: Aria'));
    check('has existing opening guard', prompt.includes('EXISTING OPENING'));
    check('has vibe brief', prompt.includes('Something is already wrong'));
    check('has direction', prompt.includes('start at night'));
    check('has player name', prompt.includes('Kai'));
    check('separator instruction matches count', /scene, separator, scene\. No titles/.test(prompt), prompt.slice(-160));
    check('word target present', prompt.includes('80–120 words'));
}

{
    const prompt = buildPrompt({
        sheet: characterSheet({ name: 'Bare', description: 'Only a description.' }),
        vibeId: 'auto',
        lengthId: 'medium',
        povId: 'second',
        count: 1,
    });

    check('no opening guard without first_mes', !prompt.includes('EXISTING OPENING'));
    check('single-scene wording', prompt.includes('Write ONE opening message'));
    check('no separator for single', !prompt.includes('<<<SCENE>>>'));
}

{
    const sheet = characterSheet({ name: 'X', description: 'a'.repeat(5000), data: {} });
    check('description clipped', sheet.description.length <= 2601, String(sheet.description.length));
}

{
    writeFileSync(join(here, 'tmp', 'prompt-sample.txt'), buildPrompt({
        sheet: characterSheet(character),
        vibeId: 'auto',
        lengthId: 'medium',
        povId: 'second',
        count: 2,
        userName: 'Kai',
    }));
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}\n`);
process.exit(failures === 0 ? 0 : 1);
