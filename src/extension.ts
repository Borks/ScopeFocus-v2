import {
	ExtensionContext,
	Position,
	Range,
	TextEditor,
	TextEditorDecorationType,
	commands,
	window,
	workspace
} from 'vscode';

// Decorations to apply to out of focus ranges.
const OUT_OF_FOCUS_DECORATION = { 'opacity': '0.1' };


// Ranges that should be in focus
const rangesInFocus: Object = {};

// Ranges by URI that are out of focus
const rangesOutOfFocus: Object = {};


export function activate(context: ExtensionContext) {
	console.info("ScopeFocus loaded");

	let activateCommand = commands.registerCommand('extension.focus', () => {
		console.info('Focusing');
	});

	let deactivateCommand = commands.registerCommand('extension.defocus', () => {
		console.info('Defocusing');
		resetDecorations();
	});

	let focusSelectionCommand = commands.registerCommand('extension.focusSelection' , () => {
		console.info('Setting range into focus');
	});

	let defocusSelectionCommand = commands.registerCommand('extension.defocusSelection' , () => {
		console.info('Removing range from focus');
	});

	context.subscriptions.push(focusSelectionCommand);
	context.subscriptions.push(defocusSelectionCommand);
	context.subscriptions.push(activateCommand);
	context.subscriptions.push(deactivateCommand);
}


function resetDecorations() {
}


/**
 * Apply focus for a specific range
 *
 * @param {Range} range Range in active editor to focus on
 */
function focusOnRange(range: Range) {

}

export function deactivate() {
	resetDecorations();
}

