import {
	ExtensionContext,
	Position,
	Range,
	TextEditor,
	TextEditorDecorationType,
	commands,
	window
} from 'vscode';

const OUT_OF_FOCUS_DECORATION = {
	'opacity': '0.1',
};

var activeDecorations: TextEditorDecorationType[] = [];

function resetDecorations() {
	for (const decoration of activeDecorations) {
		decoration.dispose();
	}
}

export function activate(context: ExtensionContext) {
	console.info("ScopeFocus loaded");

	let activateCommand = commands.registerCommand('extension.focus', () => {
		console.info('Focusing');
	});

	let deactivateCommand = commands.registerCommand('extension.defocus', () => {
		console.info('Defocusing');
		resetDecorations();
	});

	let focusSelection = commands.registerCommand('extension.focusSelection' , () => {
		console.log("Focusing on selection");
	});



	if (window.activeTextEditor) {

		focusOnRange(window.activeTextEditor);

		let changeWatcher = window.onDidChangeTextEditorSelection( () => {
			focusOnRange(window.activeTextEditor);
		});

		context.subscriptions.push(changeWatcher);
	}

	context.subscriptions.push(focusSelection);
	context.subscriptions.push(activateCommand);
	context.subscriptions.push(deactivateCommand);
}

function focusSelection() {
	console.log("Yes");
}

/**
 * Apply focus for a specific range
 *
 * @param {Range} range Range in active editor to focus on
 */
function focusOnRange(editor: TextEditor | undefined) {
	if (editor) {

		resetDecorations();

		// Get range of new focus area (Currently active line )
		let activeLine = editor.selection.anchor.line + 1;
		let startRange: Range = new Range(new Position(0,0), new Position(activeLine - 1, 0));
		let endRange: Range = new Range(new Position(activeLine, 0), new Position(editor.document.lineCount, 0));

		// Create and enable decoration
		var outOfFocus: TextEditorDecorationType = window.createTextEditorDecorationType(OUT_OF_FOCUS_DECORATION);

		activeDecorations.push(outOfFocus);
		editor.setDecorations(outOfFocus, [startRange, endRange]);
	}

}

export function deactivate() {
	resetDecorations();
}

