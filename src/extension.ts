import {
	ExtensionContext,
	Position,
	Range,
	TextEditorDecorationType,
	commands,
	window
} from 'vscode';

// Decorations to apply to out of focus ranges.
const OUT_OF_FOCUS_DECORATION = { 'opacity': '0.1' };


/**
 * Ranges that should be in focus
 */
var rangesInFocus: Range[] = [];


/**
 * Ranges that are out of focus
 */
var rangesOutOfFocus: Range[] = [];


var activeDecorations: TextEditorDecorationType[] = [];


export function activate(context: ExtensionContext) {
	console.info("ScopeFocus loaded");

	let activateCommand = commands.registerCommand('extension.focus', () => {
		console.info('Focusing');
		setDecorationRanges();
	});

	let deactivateCommand = commands.registerCommand('extension.defocus', () => {
		console.info('Defocusing');
		rangesInFocus = [];
		rangesOutOfFocus = [];
		resetDecorations();
	});

	let focusSelectionCommand = commands.registerCommand('extension.focusSelection' , () => {
		console.info('Setting range into focus');

		if (!window.activeTextEditor) { return false; }

		let range: Range = window.activeTextEditor.selection;
		addRangeToFocus(range);
		setDecorationRanges();
		applyDecorations();
	});

	let defocusSelectionCommand = commands.registerCommand('extension.defocusSelection' , () => {
		console.info('Removing range from focus');
	});

	context.subscriptions.push(focusSelectionCommand);
	context.subscriptions.push(defocusSelectionCommand);
	context.subscriptions.push(activateCommand);
	context.subscriptions.push(deactivateCommand);
}


function setDecorationRanges() {
	if (!window.activeTextEditor) { return false; }

	console.info("Setting decorations");

	let editor = window.activeTextEditor.document;

	let offsets: number[] = [];

	rangesOutOfFocus = [];

	rangesInFocus.map(range => {
		offsets.push(editor.offsetAt(range.start));
		offsets.push(editor.offsetAt(range.end));
	});

	offsets = offsets.sort();
	console.table(offsets);

	let posA: Position = new Position(0, 0);

	for (let index = 0; index < offsets.length; index = index + 2) {
		let posB: Position = editor.positionAt(offsets[index]);
		let outOfFocusRange: Range = new Range(posA, posB);
		console.log(outOfFocusRange);

		if (index + 1 < offsets.length) {
			posA = editor.positionAt(offsets[index + 1]);
		}

		rangesOutOfFocus.push(outOfFocusRange);
	}

	if (offsets.length > 0) {
		console.log('hey');
		let outOfFocusRange: Range = new Range(
			editor.positionAt(offsets[offsets.length-1]),
			editor.lineAt(editor.lineCount - 1).range.end
		);

		rangesOutOfFocus.push(outOfFocusRange);
	}

	console.log("Ranges out of focus:", rangesOutOfFocus);
	return rangesOutOfFocus;
}


function addRangeToFocus(range: Range) {
	if (!window.activeTextEditor) { return false; }

	rangesInFocus.push(range);
}

function removeRangeFromFocus(position: Position) {

}


function applyDecorations() {
	if (!window.activeTextEditor) { return false; }

	resetDecorations();

	const outOfFocus: TextEditorDecorationType = window.createTextEditorDecorationType(OUT_OF_FOCUS_DECORATION);

	window.activeTextEditor.setDecorations(outOfFocus, rangesOutOfFocus);

	activeDecorations.push(outOfFocus);
}


function resetDecorations() {
	for (const decoration of activeDecorations) {
		decoration.dispose();
	}
	activeDecorations = [];
}


export function deactivate() {
	resetDecorations();
}

