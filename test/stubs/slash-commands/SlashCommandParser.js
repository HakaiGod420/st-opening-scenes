// Stub of SillyTavern's SlashCommandParser for the harness.

export class SlashCommandParser {
    static commands = new Map();

    static addCommandObject(command) {
        if (command?.name) {
            SlashCommandParser.commands.set(command.name, command);
        }
        return command;
    }
}
