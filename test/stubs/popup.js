// Stub of SillyTavern's scripts/popup.js, reproducing the DOM the CSS targets.

export const POPUP_TYPE = { TEXT: 1, CONFIRM: 2, INPUT: 3, DISPLAY: 4 };
export const POPUP_RESULT = { AFFIRMATIVE: 1, NEGATIVE: 0, CANCELLED: null };

export class Popup {
    constructor(content, type, inputValue = '', options = {}) {
        this.type = type;
        this.options = options;
        this.onClose = null;
        this.onOpen = null;
        this.result = null;

        this.dlg = document.createElement('dialog');
        this.dlg.className = 'popup';
        if (options.wide) this.dlg.classList.add('wide_dialogue_popup');
        if (options.large) this.dlg.classList.add('large_dialogue_popup');

        this.dlg.innerHTML = `
            <div class="popup-body">
                <div class="popup-content"></div>
                <div class="popup-controls">
                    <div class="popup-button-ok menu_button">OK</div>
                    <div class="popup-button-cancel menu_button">Cancel</div>
                </div>
                <div class="popup-button-close fa-solid fa-xmark" title="Close"></div>
            </div>`;

        this.content = this.dlg.querySelector('.popup-content');

        if (typeof content === 'string') {
            this.content.innerHTML = content;
        } else if (content) {
            this.content.append(content);
        }

        this.dlg.querySelector('.popup-button-close').addEventListener('click', () => this.complete(POPUP_RESULT.CANCELLED));
        this.dlg.querySelector('.popup-button-ok').addEventListener('click', () => this.complete(POPUP_RESULT.AFFIRMATIVE));
    }

    show() {
        document.body.append(this.dlg);
        this.dlg.showModal();
        if (this.onOpen) this.onOpen(this);
        this._promise = new Promise(resolve => { this._resolve = resolve; });
        return this._promise;
    }

    complete(result) {
        this.result = result;
        if (this.onClose) this.onClose(this);
        this.dlg.close();
        this.dlg.remove();
        this._resolve?.(result);
        return Promise.resolve(result);
    }

    close() {
        return this.complete(POPUP_RESULT.CANCELLED);
    }
}

export async function callGenericPopup(content, type, inputValue = '', options = {}) {
    if (type === POPUP_TYPE.CONFIRM) {
        window.__confirmCalls = window.__confirmCalls ?? [];
        window.__confirmCalls.push(typeof content === 'string' ? content : content?.textContent);
        return true;
    }
    return true;
}
