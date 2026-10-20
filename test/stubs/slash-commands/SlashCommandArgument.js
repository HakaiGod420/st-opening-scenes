// Stubs of SillyTavern's slash-command modules for the local harness.
// Enough surface for the extension to register `/opening` and be callable.

export const ARGUMENT_TYPE = {
    STRING: 'string',
    NUMBER: 'number',
    RANGE: 'range',
    BOOLEAN: 'bool',
    VARIABLE_NAME: 'varname',
    CLOSURE: 'closure',
    SUBCOMMAND: 'subcommand',
    LIST: 'list',
    DICTIONARY: 'dictionary',
};

export class SlashCommandArgument {
    static fromProps(props) {
        return { ...props, __kind: 'argument' };
    }
}

export class SlashCommandNamedArgument {
    static fromProps(props) {
        return { ...props, __kind: 'named' };
    }
}
