import {
	ExtensionContext,
	Position,
	Range,
	TextEditorDecorationType,
	commands,
	window
} from 'vscode';

/**
 *  Decorations to apply to out of focus ranges.
 */
const OUT_OF_FOCUS_DECORATION = { 'opacity': '0.1' };


/**
 * Ranges that should be in focus
 */
var rangesInFocus: Range[] = [];


/**
 * Ranges that are out of focus
 */
var rangesOutOfFocus: Range[] = [];


/**
 * Decorations currently applied on editors
 */
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

	let editor = window.activeTextEditor.document;

	let offsets = getRangeOffsets();
	console.table(offsets);

	let posA: Position = new Position(0, 0);

	for (let index = 0; index < offsets.length; index = index + 2) {
		let posB: Position = editor.positionAt(offsets[index]);
		let outOfFocusRange: Range = new Range(posA, posB);

		if (index + 1 < offsets.length) {
			posA = editor.positionAt(offsets[index + 1]);
		}

		rangesOutOfFocus.push(outOfFocusRange);
	}

	if (offsets.length > 0) {
		let outOfFocusRange: Range = new Range(
			editor.positionAt(offsets[offsets.length-1]),
			editor.lineAt(editor.lineCount - 1).range.end
		);

		rangesOutOfFocus.push(outOfFocusRange);
	}

	return rangesOutOfFocus;
}


function getRangeOffsets() {
	if (!window.activeTextEditor) { return []; }

	let editor = window.activeTextEditor.document;

	let offsets: number[] = [];

	rangesOutOfFocus = [];

	rangesInFocus.map(range => {
		offsets.push(editor.offsetAt(range.start));
		offsets.push(editor.offsetAt(range.end));
	});

	offsets = offsets.sort();

	return offsets;
}


function addRangeToFocus(range: Range) {
	if (!window.activeTextEditor) { return false; }

	/**
	 * Check to see if range can be merged with another
	 */
	for (let existingFocus in rangesInFocus) {
		if (rangesInFocus[existingFocus].intersection(range)) {
			let newRange: Range = rangesInFocus[existingFocus].union(range);
			delete rangesInFocus[existingFocus];
			rangesInFocus.push(newRange);
			return;
		}
	}

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

