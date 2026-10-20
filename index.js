import { getContext, renderExtensionTemplateAsync } from '../../../extensions.js';
import { SlashCommand } from '../../../slash-commands/SlashCommand.js';
import { ARGUMENT_TYPE, SlashCommandArgument, SlashCommandNamedArgument } from '../../../slash-commands/SlashCommandArgument.js';
import { SlashCommandParser } from '../../../slash-commands/SlashCommandParser.js';
import { insertIntoChat } from './src/apply.js';
import { activeCharacter, generateScenes, listCharacters } from './src/generate.js';
import { openOpeningScenesModal } from './src/modal.js';
import { COUNTS, LENGTHS, POVS, VIBES, byId } from './src/prompt.js';
import { EXTENSION_FOLDER, getSettings } from './src/store.js';

const MENU_ICON = 'fa-feather-pointed';
const MENU_LABEL = 'Opening Scenes';

/* -------------------------------------------------------------- settings UI */

function initSettingsPanel() {
    const panel = document.querySelector('.os-settings');
    if (!panel) {
        return;
    }

    panel.querySelector('#os-settings-open')?.addEventListener('click', () => openOpeningScenesModal());
}

/* --------------------------------------------------------------- wand menu */

function addWandMenuItem() {
    const menu = document.getElementById('extensionsMenu');
    if (!menu || document.getElementById('os-wand-item')) {
        return Boolean(menu);
    }

    const item = document.createElement('div');
    item.id = 'os-wand-item';
    item.className = 'os-wand-item';
    item.setAttribute('role', 'button');
    item.tabIndex = 0;
    item.innerHTML = `
        <div class="extensionsMenuExtensionButton fa-solid ${MENU_ICON}" aria-hidden="true"></div>
        <span>${MENU_LABEL}</span>`;

    const trigger = () => openOpeningScenesModal();
    item.addEventListener('click', trigger);
    item.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            trigger();
        }
    });

    menu.append(item);
    return true;
}

/** The wand menu is injected at runtime, so retry until it shows up. */
function waitForWandMenu(attempt = 0) {
    if (addWandMenuItem() || attempt > 60) {
        return;
    }
    window.setTimeout(() => waitForWandMenu(attempt + 1), 250);
}

/* ----------------------------------------------------------- slash command */

function resolveCharacter(name) {
    const characters = listCharacters();
    if (!name) {
        return activeCharacter() ?? characters[0] ?? null;
    }

    const needle = String(name).toLowerCase();
    return characters.find(character => character.name?.toLowerCase() === needle)
        ?? characters.find(character => character.name?.toLowerCase().includes(needle))
        ?? null;
}

async function openingSceneCommand(named = {}, unnamed = '') {
    const settings = getSettings();
    const character = resolveCharacter(unnamed);

    if (!character) {
        toastr.error('Could not find that character.', 'Opening Scenes');
        return '';
    }

    const count = Number(named.count ?? 1);
    const scenes = await generateScenes({
        character,
        vibeId: byId(VIBES, named.vibe ?? settings.vibe).id,
        lengthId: byId(LENGTHS, named.length ?? settings.length).id,
        povId: byId(POVS, named.pov ?? settings.pov).id,
        count: COUNTS.includes(count) ? count : 1,
        direction: named.direction ?? '',
        extraInstructions: settings.extraInstructions,
    });

    const text = named.insert ? scenes[0].text : scenes.map(scene => scene.text).join('\n\n---\n\n');

    if (named.insert) {
        await insertIntoChat(character, text);
        toastr.success(`Inserted a new opening for ${character.name}.`, 'Opening Scenes');
        return '';
    }

    return text;
}

function registerSlashCommand() {
    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'opening',
        callback: openingSceneCommand,
        returns: 'the generated opening text (or nothing when inserted into the chat)',
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({
                description: 'character name (defaults to the open chat)',
                typeList: [ARGUMENT_TYPE.STRING],
                isRequired: false,
            }),
        ],
        namedArgumentList: [
            SlashCommandNamedArgument.fromProps({
                name: 'vibe',
                description: `one of: ${VIBES.map(vibe => vibe.id).join(', ')}`,
                typeList: [ARGUMENT_TYPE.STRING],
                isRequired: false,
            }),
            SlashCommandNamedArgument.fromProps({
                name: 'length',
                description: `one of: ${LENGTHS.map(length => length.id).join(', ')}`,
                typeList: [ARGUMENT_TYPE.STRING],
                isRequired: false,
            }),
            SlashCommandNamedArgument.fromProps({
                name: 'pov',
                description: `one of: ${POVS.map(pov => pov.id).join(', ')}`,
                typeList: [ARGUMENT_TYPE.STRING],
                isRequired: false,
            }),
            SlashCommandNamedArgument.fromProps({
                name: 'count',
                description: 'how many variants (1-4)',
                typeList: [ARGUMENT_TYPE.NUMBER],
                isRequired: false,
            }),
            SlashCommandNamedArgument.fromProps({
                name: 'direction',
                description: 'extra free-form direction',
                typeList: [ARGUMENT_TYPE.STRING],
                isRequired: false,
            }),
            SlashCommandNamedArgument.fromProps({
                name: 'insert',
                description: 'insert the result into the open chat instead of returning it',
                typeList: [ARGUMENT_TYPE.BOOLEAN],
                isRequired: false,
            }),
        ],
        helpString: `
            <div>Generate a fresh opening message for a character card.</div>
            <div><code>/opening vibe=conflict length=short count=2</code></div>
            <div><code>/opening Aria insert=true</code></div>
        `,
    }));
}

/* ------------------------------------------------- character edit panel */

function openForEditedCharacter() {
    const context = getContext();
    const isCreating = document.getElementById('form_create')?.getAttribute('actiontype') === 'createcharacter';
    const character = context.characters?.[context.characterId];

    if (isCreating || !character?.avatar) {
        toastr.info('Save the character first — then its opening scene can be written.', 'Opening Scenes');
        return;
    }

    openOpeningScenesModal({ characterId: character.avatar });
}

/** Adds a feather button next to Advanced Definitions in the character editor. */
function addCharacterEditorButton() {
    const block = document.querySelector('.form_create_bottom_buttons_block');
    if (!block || document.getElementById('os-editor-button')) {
        return;
    }

    const button = document.createElement('div');
    button.id = 'os-editor-button';
    button.className = `menu_button fa-solid ${MENU_ICON}`;
    button.setAttribute('role', 'button');
    button.tabIndex = 0;
    button.title = 'Opening Scenes — write a first message for this character';
    button.setAttribute('aria-label', 'Write an opening message for this character');

    button.addEventListener('click', openForEditedCharacter);
    button.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openForEditedCharacter();
        }
    });

    const advanced = document.getElementById('advanced_div');
    if (advanced && advanced.parentElement === block) {
        advanced.after(button);
    } else {
        block.prepend(button);
    }
}

/* -------------------------------------------------------------------- boot */

async function bootstrap() {
    getSettings();

    try {
        const panelHtml = await renderExtensionTemplateAsync(EXTENSION_FOLDER, 'settings');
        document.querySelector('#extensions_settings')?.insertAdjacentHTML('beforeend', panelHtml);
        initSettingsPanel();
    } catch (error) {
        console.error('[Opening Scenes] Could not render the settings panel', error);
    }

    addCharacterEditorButton();
    waitForWandMenu();
    registerSlashCommand();
}

jQuery(() => {
    bootstrap().catch(error => console.error('[Opening Scenes] Failed to start', error));
});

export { MENU_LABEL };
