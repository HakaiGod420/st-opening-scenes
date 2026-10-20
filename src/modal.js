import { getContext, renderExtensionTemplateAsync } from '../../../../extensions.js';
import { POPUP_RESULT, POPUP_TYPE, Popup, callGenericPopup } from '../../../../popup.js';
import { applyAlternateGreeting, applyFirstMessage, copyText, insertIntoChat } from './apply.js';
import { generateScenes, listCharacters } from './generate.js';
import { COUNTS, LENGTHS, POVS, VIBES, byId, countWords } from './prompt.js';
import { EXTENSION_FOLDER, getSettings, patchSettings, pickId } from './store.js';

const AVATAR_BASE = '/characters/';

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function encodePath(path) {
    return String(path ?? '').split('/').map(encodeURIComponent).join('/');
}

/** Minimal inline markdown so *action* and **emphasis** read the way ST shows them. */
function inlineHtml(text) {
    return escapeHtml(text)
        .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
        .replace(/(^|[\s(„“"'])\*([^*\n]+)\*/g, '$1<em>$2</em>');
}

function proseHtml(text) {
    return String(text ?? '')
        .split(/\n{2,}/)
        .map(paragraph => `<p>${inlineHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
        .join('');
}

function compactNumber(value) {
    if (value >= 1000) {
        return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`;
    }
    return String(value);
}

function cardFootprint(character) {
    const data = character.data ?? {};
    const size = [character.description, character.personality, character.scenario]
        .filter(Boolean)
        .join(' ').length;
    const alts = Array.isArray(data.alternate_greetings) ? data.alternate_greetings.filter(Boolean).length : 0;
    const bits = [];
    if (size) bits.push(`${compactNumber(size)} chars`);
    if (character.first_mes) bits.push('first message');
    if (alts) bits.push(`${alts} alternate${alts === 1 ? '' : 's'}`);
    return bits.join(' · ');
}

let openPopup = null;

export async function openOpeningScenesModal({ characterId = null } = {}) {
    if (openPopup) {
        return;
    }

    const characters = listCharacters();

    if (!characters.length) {
        toastr.warning('No characters found. Import or create a character first.', 'Opening Scenes');
        return;
    }

    const settings = getSettings();
    const context = getContext();
    const fallback = characters[context.characterId] ?? characters[0];

    const initial =
        characters.find(item => item.avatar === characterId) ??
        characters.find(item => item.avatar === settings.lastAvatar) ??
        (fallback?.avatar ? fallback : characters[0]);

    const html = await renderExtensionTemplateAsync(EXTENSION_FOLDER, 'modal');

    const popup = new Popup(html, POPUP_TYPE.TEXT, '', {
        wide: true,
        large: true,
        allowVerticalScrolling: true,
        okButton: false,
        cancelButton: false,
        animation: 'fast',
    });

    popup.dlg.classList.add('os-popup');
    popup.dlg.setAttribute('aria-label', 'Opening Scenes');
    openPopup = popup;

    const root = popup.content.querySelector('.os-app');
    const el = {
        root,
        avatar: root.querySelector('#os-avatar'),
        name: root.querySelector('#os-char-name'),
        sub: root.querySelector('#os-char-sub'),
        select: root.querySelector('#os-char-select'),
        vibes: root.querySelector('#os-vibes'),
        vibeHint: root.querySelector('#os-vibe-hint'),
        more: root.querySelector('#os-more'),
        moreValue: root.querySelector('#os-more-value'),
        length: root.querySelector('#os-length'),
        pov: root.querySelector('#os-pov'),
        count: root.querySelector('#os-count'),
        direction: root.querySelector('#os-direction'),
        extra: root.querySelector('#os-extra'),
        close: root.querySelector('#os-close'),
        generate: root.querySelector('#os-generate'),
        generateLabel: root.querySelector('#os-generate-label'),
        stop: root.querySelector('#os-stop'),
        status: root.querySelector('#os-status'),
        results: root.querySelector('#os-results'),
    };

    const state = {
        avatar: initial.avatar,
        results: [],
        generating: false,
        reloading: null,
        error: '',
        closed: false,
    };

    const currentCharacter = () => characters.find(item => item.avatar === state.avatar) ?? characters[0];

    /* ---------------------------------------------------------------- header */

    function renderAvatar(character) {
        el.avatar.innerHTML = '';
        el.avatar.classList.remove('is-fallback');

        if (!character.avatar) {
            el.avatar.classList.add('is-fallback');
            el.avatar.textContent = (character.name ?? '?').slice(0, 1).toUpperCase();
            return;
        }

        const img = new Image();
        img.alt = '';
        img.decoding = 'async';
        img.src = `${AVATAR_BASE}${encodePath(character.avatar)}`;
        img.addEventListener('error', () => {
            el.avatar.innerHTML = '';
            el.avatar.classList.add('is-fallback');
            el.avatar.textContent = (character.name ?? '?').slice(0, 1).toUpperCase();
        });
        el.avatar.append(img);
    }

    function renderHeader() {
        const character = currentCharacter();
        el.name.textContent = character.name || 'Unnamed';
        el.sub.textContent = cardFootprint(character);
        renderAvatar(character);
        el.select.value = state.avatar;
    }

    function renderSelect() {
        el.select.innerHTML = characters
            .map(character => `<option value="${escapeHtml(character.avatar)}">${escapeHtml(character.name || 'Unnamed')}</option>`)
            .join('');
        el.select.value = state.avatar;
    }

    /* ------------------------------------------------------------ controls */

    function chipHtml({ id, label, icon }, active) {
        return `<button type="button" class="os-chip${active ? ' is-active' : ''}" data-vibe="${escapeHtml(id)}"
            aria-pressed="${active ? 'true' : 'false'}">
            <i class="fa-solid ${escapeHtml(icon)}" aria-hidden="true"></i>
            <span>${escapeHtml(label)}</span>
        </button>`;
    }

    function renderVibes() {
        el.vibes.innerHTML = VIBES.map(vibe => chipHtml(vibe, vibe.id === settings.vibe)).join('');
        el.vibeHint.textContent = byId(VIBES, settings.vibe).brief;
    }

    function segmentHtml({ id, label, hint }, active, group) {
        const title = hint ? ` title="${escapeHtml(hint)}"` : '';
        return `<button type="button" class="os-segment${active ? ' is-active' : ''}" data-${group}="${escapeHtml(id)}"
            aria-pressed="${active ? 'true' : 'false'}"${title}>${escapeHtml(label)}</button>`;
    }

    function renderOptions() {
        el.length.innerHTML = LENGTHS.map(item => segmentHtml(item, item.id === settings.length, 'length')).join('');
        el.pov.innerHTML = POVS.map(item => segmentHtml(item, item.id === settings.pov, 'pov')).join('');
        el.count.innerHTML = COUNTS
            .map(value => segmentHtml({ id: String(value), label: `${value}` }, value === Number(settings.count), 'count'))
            .join('');

        const length = byId(LENGTHS, settings.length);
        const pov = byId(POVS, settings.pov);
        el.moreValue.textContent = `${length.label} · ${pov.label.toLowerCase()} · ${settings.count} variant${settings.count === 1 ? '' : 's'}`;

        if (el.direction.value !== settings.direction) {
            el.direction.value = settings.direction;
        }

        if (el.extra.value !== settings.extraInstructions) {
            el.extra.value = settings.extraInstructions ?? '';
        }
    }

    function skeletonHtml(index) {
        return `<article class="os-card os-card-skeleton" aria-hidden="true">
            <div class="os-skel os-skel-top"></div>
            <div class="os-skel os-skel-line" style="width: 92%"></div>
            <div class="os-skel os-skel-line" style="width: 86%"></div>
            <div class="os-skel os-skel-line" style="width: 74%"></div>
            <div class="os-skel os-skel-line" style="width: 88%"></div>
            <div class="os-skel os-skel-line" style="width: 52%"></div>
            <div class="os-skel-actions">
                <div class="os-skel os-skel-btn"></div>
                <div class="os-skel os-skel-btn"></div>
            </div>
        </article>`.replace('aria-hidden="true"', `aria-hidden="true" data-skeleton="${index}"`);
    }

    function emptyHtml() {
        return `<div class="os-empty">
            <i class="fa-solid fa-feather" aria-hidden="true"></i>
            <p class="os-empty-title">No openings yet</p>
            <p class="os-empty-text">Pick a vibe and generate. You get a few takes to choose from — keep the one that fits, throw the rest away.</p>
        </div>`;
    }

    function cardHtml(result, index) {
        const applied = result.applied;
        const badge = applied
            ? `<span class="os-card-applied"><i class="fa-solid fa-check" aria-hidden="true"></i>${
                applied === 'first' ? 'first message' : applied === 'alternate' ? 'alternate' : 'in chat'
            }</span>`
            : '';
        const busy = state.reloading === index;

        return `<article class="os-card${busy ? ' is-busy' : ''}" data-index="${index}">
            <div class="os-card-top">
                <span class="os-card-index">${index + 1}</span>
                <h3 class="os-card-title">${escapeHtml(result.title)}</h3>
                <span class="os-card-meta">${result.words}w</span>
            </div>
            ${badge}
            <div class="os-card-body">
                <div class="os-card-text" data-role="text">${proseHtml(result.text)}</div>
                <textarea class="os-card-edit" data-role="edit" rows="8" hidden></textarea>
            </div>
            <div class="os-card-actions">
                <button type="button" class="os-btn os-btn-primary os-btn-sm" data-act="first">
                    <i class="fa-solid fa-star" aria-hidden="true"></i><span>Use as first message</span>
                </button>
                <button type="button" class="os-btn os-btn-sm" data-act="alternate">
                    <i class="fa-solid fa-clone" aria-hidden="true"></i><span>Add as alternate</span>
                </button>
                <button type="button" class="os-btn os-btn-sm" data-act="insert">
                    <i class="fa-solid fa-arrow-turn-down" aria-hidden="true"></i><span>Insert in chat</span>
                </button>
                <span class="os-card-spacer"></span>
                <button type="button" class="os-icon-btn" data-act="edit" title="Edit before applying" aria-label="Edit">
                    <i class="fa-solid fa-pen" aria-hidden="true"></i>
                </button>
                <button type="button" class="os-icon-btn" data-act="copy" title="Copy" aria-label="Copy">
                    <i class="fa-solid fa-copy" aria-hidden="true"></i>
                </button>
                <button type="button" class="os-icon-btn" data-act="again" title="Write a different one" aria-label="Regenerate">
                    <i class="fa-solid fa-rotate" aria-hidden="true"></i>
                </button>
            </div>
        </article>`;
    }

    function renderResults() {
        if (state.generating && !state.results.length) {
            el.results.innerHTML = Array.from({ length: Math.max(1, Number(settings.count)) }, (_, index) => skeletonHtml(index)).join('');
            return;
        }

        if (!state.results.length) {
            el.results.innerHTML = state.error ? errorHtml() : emptyHtml();
            return;
        }

        el.results.innerHTML = state.results.map(cardHtml).join('');
        decorateOverflowingCards();
    }

    /** Adds a "show full scene" control to cards whose text is clamped. */
    function decorateOverflowingCards() {
        requestAnimationFrame(() => {
            el.results.querySelectorAll('.os-card-text').forEach(box => {
                if (box.scrollHeight <= box.clientHeight + 4) {
                    return;
                }

                box.classList.add('is-clamped');

                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'os-card-more';
                button.textContent = 'Show full scene';
                button.addEventListener('click', () => {
                    const expanded = box.classList.toggle('is-expanded');
                    button.textContent = expanded ? 'Collapse' : 'Show full scene';
                });
                box.after(button);
            });
        });
    }

    function errorHtml() {
        return `<div class="os-error">
            <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
            <div>
                <p class="os-error-title">That didn't work</p>
                <p class="os-error-text">${escapeHtml(state.error)}</p>
            </div>
        </div>`;
    }

    function renderStatus() {
        if (state.generating) {
            el.status.textContent = state.reloading !== null
                ? 'Writing a different take…'
                : `Writing ${settings.count} variant${settings.count === 1 ? '' : 's'}…`;
        } else if (state.results.length) {
            const total = state.results.reduce((sum, item) => sum + item.words, 0);
            el.status.textContent = `${state.results.length} take${state.results.length === 1 ? '' : 's'} · ${Math.round(total / state.results.length)} words average`;
        } else if (state.error) {
            el.status.textContent = '';
        } else {
            el.status.textContent = 'Runs on your active connection and its sampling presets.';
        }
    }

    function renderCta() {
        el.generate.disabled = state.generating;
        el.generate.classList.toggle('is-busy', state.generating);
        el.generateLabel.textContent = state.generating
            ? 'Writing…'
            : state.results.length ? 'Generate more' : 'Generate openings';
        el.stop.hidden = !state.generating;
        el.more.classList.toggle('is-locked', state.generating);
    }

    function render() {
        if (state.closed) {
            return;
        }
        renderHeader();
        renderVibes();
        renderOptions();
        renderCta();
        renderStatus();
        renderResults();
    }

    /* ---------------------------------------------------------------- actions */

    async function runGeneration({ reloadIndex = null } = {}) {
        if (state.generating) {
            return;
        }

        const character = currentCharacter();
        state.generating = true;
        state.reloading = reloadIndex;
        state.error = '';
        render();

        try {
            const avoid = reloadIndex !== null
                ? state.results.filter((_, index) => index !== reloadIndex).map(item => item.text)
                : [];

            const scenes = await generateScenes({
                character,
                vibeId: settings.vibe,
                lengthId: settings.length,
                povId: settings.pov,
                count: reloadIndex !== null ? 1 : Number(settings.count),
                direction: settings.direction,
                extraInstructions: settings.extraInstructions,
                avoid,
            });

            if (reloadIndex !== null && state.results[reloadIndex]) {
                state.results[reloadIndex] = scenes[0];
            } else {
                state.results = scenes;
            }
        } catch (error) {
            console.error('[Opening Scenes] Generation failed', error);
            state.error = error?.message ?? String(error);
            if (reloadIndex === null) {
                state.results = [];
            }
            toastr.error(state.error, 'Opening Scenes');
        } finally {
            state.generating = false;
            state.reloading = null;
            render();
        }
    }

    async function handleApply(index, mode) {
        const character = currentCharacter();
        const card = state.results[index];
        if (!card) {
            return;
        }

        try {
            if (mode === 'first') {
                if (character.first_mes?.trim()) {
                    const confirmed = await callGenericPopup(
                        `Replace the first message of <b>${escapeHtml(character.name)}</b>? The current one will be overwritten.`,
                        POPUP_TYPE.CONFIRM,
                        '',
                        { okButton: 'Replace', cancelButton: 'Keep' },
                    );
                    if (!confirmed) {
                        return;
                    }
                }

                const chatUpdated = await applyFirstMessage(character, card.text);
                card.applied = 'first';
                toastr.success(
                    chatUpdated
                        ? 'First message replaced — card and open chat updated.'
                        : 'Saved as the first message. It shows the next time this chat opens fresh.',
                    'Opening Scenes',
                );
            }

            if (mode === 'alternate') {
                const total = await applyAlternateGreeting(character, card.text);
                card.applied = 'alternate';
                toastr.success(`Added to alternate greetings (${total} total).`, 'Opening Scenes');
            }

            if (mode === 'insert') {
                await insertIntoChat(character, card.text);
                card.applied = 'chat';
                toastr.success('Inserted into the open chat.', 'Opening Scenes');
            }

            render();
        } catch (error) {
            console.error('[Opening Scenes] Apply failed', error);
            toastr.error(error?.message ?? String(error), 'Opening Scenes');
        }
    }

    function toggleEdit(card, index) {
        const textArea = card.querySelector('[data-role="edit"]');
        const textBox = card.querySelector('[data-role="text"]');
        const button = card.querySelector('[data-act="edit"]');
        const isEditing = !textArea.hidden;

        if (!isEditing) {
            textArea.value = state.results[index].text;
            textArea.hidden = false;
            textBox.hidden = true;
            card.querySelector('.os-card-more')?.setAttribute('hidden', '');
            button.classList.add('is-active');
            button.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i>';
            button.title = 'Save edit';
            textArea.focus();
            return;
        }

        const next = textArea.value.trim();
        if (next) {
            state.results[index].text = next;
            state.results[index].words = countWords(next);
        }

        textArea.hidden = true;
        textBox.hidden = false;
        button.classList.remove('is-active');
        button.innerHTML = '<i class="fa-solid fa-pen" aria-hidden="true"></i>';
        button.title = 'Edit before applying';
        render();
    }

    /* ----------------------------------------------------------------- events */

    el.select.addEventListener('change', event => {
        state.avatar = event.target.value;
        state.results = [];
        state.error = '';
        patchSettings({ lastAvatar: state.avatar });
        render();
    });

    el.vibes.addEventListener('click', event => {
        const chip = event.target.closest('[data-vibe]');
        if (!chip) {
            return;
        }
        patchSettings({ vibe: pickId(chip.dataset.vibe, VIBES, 'auto') });
        renderVibes();
        renderStatus();
    });

    el.length.addEventListener('click', event => {
        const segment = event.target.closest('[data-length]');
        if (!segment) {
            return;
        }
        patchSettings({ length: pickId(segment.dataset.length, LENGTHS, 'medium') });
        renderOptions();
    });

    el.pov.addEventListener('click', event => {
        const segment = event.target.closest('[data-pov]');
        if (!segment) {
            return;
        }
        patchSettings({ pov: pickId(segment.dataset.pov, POVS, 'second') });
        renderOptions();
    });

    el.count.addEventListener('click', event => {
        const segment = event.target.closest('[data-count]');
        if (!segment) {
            return;
        }
        const value = Number(segment.dataset.count);
        patchSettings({ count: COUNTS.includes(value) ? value : 2 });
        renderOptions();
    });

    el.direction.addEventListener('input', () => {
        patchSettings({ direction: el.direction.value });
    });

    el.extra.addEventListener('input', () => {
        patchSettings({ extraInstructions: el.extra.value });
    });
    el.direction.addEventListener('keydown', event => {
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            runGeneration();
        }
    });

    el.generate.addEventListener('click', () => runGeneration());

    el.close.addEventListener('click', () => {
        popup.complete(POPUP_RESULT.CANCELLED);
    });

    el.stop.addEventListener('click', () => {
        const ctx = getContext();
        try {
            ctx.stopGeneration?.();
            ctx.eventSource?.emit?.(ctx.eventTypes?.GENERATION_STOPPED);
        } catch (error) {
            console.warn('[Opening Scenes] Could not stop generation', error);
        }
    });

    el.results.addEventListener('click', event => {
        const target = event.target.closest('[data-act]');
        const card = event.target.closest('.os-card');
        if (!target || !card || card.dataset.index === undefined) {
            return;
        }

        const index = Number(card.dataset.index);
        const action = target.dataset.act;

        if (action === 'edit') {
            toggleEdit(card, index);
            return;
        }

        if (action === 'copy') {
            const text = state.results[index]?.text ?? '';
            copyText(text).then(ok => {
                if (ok) {
                    toastr.info('Copied to clipboard.', 'Opening Scenes');
                } else {
                    toastr.warning('Clipboard is blocked on this page — select the text and copy it manually.', 'Opening Scenes');
                }
            });
            return;
        }

        if (action === 'again') {
            runGeneration({ reloadIndex: index });
            return;
        }

        handleApply(index, action);
    });

    popup.onClose = () => {
        state.closed = true;
        openPopup = null;
    };

    renderSelect();
    render();
    popup.show();
}
