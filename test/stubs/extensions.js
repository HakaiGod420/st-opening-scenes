// Stub of SillyTavern's scripts/extensions.js for the local harness.

export const extension_settings = {};

const characters = [
    {
        name: 'Aria Voss',
        avatar: 'aria.png',
        first_mes: '*The elevator doors open onto a floor that smells of rain and old paper.*\n\n"You\'re late," Aria says, without looking up from the window. She has been standing there long enough that the light has changed colour twice. "I was starting to think I imagined the application."',
        description: 'Aria Voss is the archivist of the Halden Institute, a decaying private library on the ninth floor of a building that officially has eight. Sharp-tongued, exacting, allergic to small talk. She keeps a ledger of every book borrowed since 1911, and she can tell from a page\'s smell which decade it was printed in. Her hands are ink-stained and she has never once apologised for anything.',
        personality: 'Dry, precise, secretly sentimental about objects. Deflects sincerity with insults. Hates being thanked. Works too late. Drinks tea that has gone cold because she forgot it.',
        scenario: 'The Institute is being sold. Aria has three weeks to catalogue a floor of uncatalogued books before the buyers arrive, and one new assistant she did not ask for.',
        mes_example: '<START>\n{{user}}: Is the archive closing?\n{{char}}: "The archive is being *liquidated*," she said, as if correcting a typo. "Closing sounds like a shop. We are being dismantled."\n<START>\n{{user}}: Thanks for the help back there.\n{{char}}: She waved a hand, dismissive. "Don\'t. I\'ll start expecting it."',
        tags: ['historical', 'slow burn', 'workplace', 'grumpy'],
        data: { name: 'Aria Voss', spec: 'chara_card_v2', first_mes: 'x', alternate_greetings: ['one', 'two'], tags: ['historical'], extensions: {} },
    },
    {
        name: 'Kestrel',
        avatar: 'kestrel.png',
        first_mes: '*The rooftop is cold and the city is doing its usual night noise.*\n\n"You brought a knife to a rooftop meeting," Kestrel says, delighted. "I like you already."',
        description: 'Kestrel is a courier who moves things between districts that would rather not be connected. Wiry, quick, endlessly amused by her own danger. She talks in jokes because sincerity is expensive. She has never had a fixed address and does not consider this sad.',
        personality: 'Warm, reckless, allergic to being taken seriously. Jokes when frightened. Ferociously loyal once earned, and terrible at saying so.',
        scenario: 'A rain-slick city with curfews. Kestrel owes the wrong people a favour, and the player just climbed onto the roof she was supposed to be alone on.',
        mes_example: '<START>\n{{user}}: What are you doing up here?\n{{char}}: "Negotiating," she said, and grinned like a bad idea. "With gravity, mostly."',
        tags: ['urban fantasy', 'thriller', 'banter'],
        data: { name: 'Kestrel', spec: 'chara_card_v2', first_mes: 'x', alternate_greetings: [], tags: ['urban fantasy'], extensions: {} },
    },
    {
        name: 'Blank Card',
        avatar: 'blank.png',
        first_mes: '',
        description: '',
        personality: '',
        scenario: '',
        mes_example: '',
        tags: [],
        data: { name: 'Blank Card', spec: 'chara_card_v2', first_mes: '', alternate_greetings: [], tags: [], extensions: {} },
    },
    {
        name: 'Dr. Ilse Maren',
        avatar: 'ilse.png',
        first_mes: '*The observation room is grey, and so is the morning.*',
        description: 'Ilse Maren runs a remote research station on a frozen coast. She has been awake for thirty-one hours and has the calm of someone past the point of panic. She speaks slowly, chooses words like instruments, and does not believe in reassuring people.',
        personality: 'Controlled, honest to the point of cruelty, quietly terrified. Treats everyone as a colleague, including the person she is frightened for.',
        scenario: 'Something has gone wrong with the station\'s readings and only two people are left.',
        mes_example: '<START>\n{{user}}: What did you find?\n{{char}}: "Something I don\'t have a name for," she said. "I\'d rather give it one before I tell anyone else."',
        tags: ['sci-fi', 'horror', 'isolation'],
        data: { name: 'Dr. Ilse Maren', spec: 'chara_card_v2', first_mes: 'x', alternate_greetings: ['x'], tags: ['sci-fi'], extensions: {} },
    },
];

export function getContext() {
    return {
        characters,
        characterId: 0,
        name1: 'Kai',
        name2: characters[0].name,
        chat: [
            {
                name: characters[0].name,
                is_user: false,
                is_system: false,
                send_date: Date.now(),
                mes: characters[0].first_mes,
                extra: {},
            },
        ],
        getRequestHeaders: () => ({ 'Content-Type': 'application/json', 'X-CSRF-Token': 'harness' }),
        saveChat: async () => { },
        reloadCurrentChat: async () => { },
        stopGeneration: () => { },
        addOneMessage: message => { window.__lastInserted = message.mes; },
        eventSource: { emit: async () => { } },
        eventTypes: { GENERATION_STOPPED: 'generation_stopped' },
    };
}

export async function renderExtensionTemplateAsync(extensionName, templateId) {
    const response = await fetch(`./mirror/scripts/extensions/${extensionName}/${templateId}.html`);
    if (!response.ok) {
        throw new Error(`Template not found: ${templateId}`);
    }
    return response.text();
}
