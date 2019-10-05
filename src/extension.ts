import {
	ExtensionContext,
	Position,
	Range,
	TextEditor,
	commands,
	window
} from 'vscode';

export function activate(context: ExtensionContext) {
	console.info("ScopeFocus loaded");

	let activateCommand = commands.registerCommand('extension.focus', () => {
		console.info('Focusing');
	});

	let deactivateCommand = commands.registerCommand('extension.defocus', () => {
		console.info('Defocusing');
	});

	if (window.activeTextEditor) {
		let changeWatcher = window.onDidChangeTextEditorSelection( () => {
			focusOnRange(window.activeTextEditor);
		});

		context.subscriptions.push(changeWatcher);
	}

	context.subscriptions.push(activateCommand);
	context.subscriptions.push(deactivateCommand);
}

/**
 * Apply focus for a specific range
 *
 * @param {Range} range Range in active editor to focus on
 */
function focusOnRange(editor: TextEditor | undefined) {

	// If ---
	if (editor) {
		let activeLine = editor.selection.anchor.line;
		let startRange: Range = new Range(new Position(0,0), new Position(activeLine - 1, 0));
		let endRange: Range = new Range(new Position(activeLine + 1,0), new Position(600, 0));

		console.log(startRange, endRange);
	}
}

export function deactivate() {}

