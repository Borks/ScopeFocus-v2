import {
	ExtensionContext,
	Position,
	Range,
	TextEditor,
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


/**
 * @function activate Activate the extension
 */
export function activate(context: ExtensionContext) {

	let activateCommand = commands.registerCommand('extension.focus', () => {
		setDecorationRanges();
		applyDecorations();
	});

	let deactivateCommand = commands.registerCommand('extension.defocus', () => {
		resetDecorations(true);
	});

	let focusSelectionCommand = commands.registerCommand('extension.focusSelection' , () => {
		if (!window.activeTextEditor) { return false; }

		let range: Range = window.activeTextEditor.selection;
		addRangeToFocus(range);
		setDecorationRanges();
		applyDecorations();
	});

	let defocusSelectionCommand = commands.registerCommand('extension.defocusSelection' , () => {
		if (!window.activeTextEditor) { return false; }
		let defocusPos: Range = window.activeTextEditor.selection;
		removeRangeFromFocus(defocusPos);
	});

	let defocusAllCommand = commands.registerCommand('extension.defocusAll', () => {
		resetDecorations(true);
	});

	context.subscriptions.push(focusSelectionCommand);
	context.subscriptions.push(defocusSelectionCommand);
	context.subscriptions.push(activateCommand);
	context.subscriptions.push(deactivateCommand);
	context.subscriptions.push(defocusAllCommand);
}


/**
 * Calculate and set the out of focus ranges.
 */
function setDecorationRanges() : Range[] | boolean {
	if (!window.activeTextEditor) { return false; }

	let document = window.activeTextEditor.document;
	rangesOutOfFocus = [];

	let offsets = getRangeOffsets();
	console.table(offsets);

	let posA: Position = new Position(0, 0);

	for (let index = 0; index < offsets.length; index = index + 2) {
		let posB: Position = document.positionAt(offsets[index]);

		let outOfFocusRange: Range = new Range(posA, posB);
		rangesOutOfFocus.push(outOfFocusRange);

		if (index + 1 < offsets.length) {
			posA = document.positionAt(offsets[index + 1]);
		}
	}

	if (offsets.length > 0) {
		let outOfFocusRange: Range = new Range(
			document.positionAt(offsets[offsets.length-1]),
			document.lineAt(document.lineCount - 1).range.end
		);

		rangesOutOfFocus.push(outOfFocusRange);
	}

	return rangesOutOfFocus;
}


function getRangeOffsets() {
	if (!window.activeTextEditor) { return []; }

	let document = window.activeTextEditor.document;

	let offsets: number[] = [];

	rangesInFocus.map(range => {
		offsets.push(document.offsetAt(range.start));
		offsets.push(document.offsetAt(range.end));
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
			let combinedRange: Range = rangesInFocus[existingFocus].union(range);
			delete rangesInFocus[existingFocus];
			rangesInFocus.push(combinedRange);

			return;
		}
	}

	rangesInFocus.push(range);
}


/**
 * @function removeRangeFromFocus Remove a range from being in focus
 * @param {Range} range Range to check for intersections with
 * Also reapplies decorations
 */
function removeRangeFromFocus(range: Range) {
	for (let rangeIndex in rangesInFocus) {
		if (rangesInFocus[rangeIndex].intersection(range)) {
			delete rangesInFocus[rangeIndex];
			setDecorationRanges();
			applyDecorations();
		}
	}
}


/**
 * @function applyDecorations Reset the decorations applied to the document
 */
function applyDecorations() {
	if (!window.activeTextEditor) { return false; }

	resetDecorations();
	const outOfFocus: TextEditorDecorationType = window.createTextEditorDecorationType(OUT_OF_FOCUS_DECORATION);
	window.activeTextEditor.setDecorations(outOfFocus, rangesOutOfFocus);

	activeDecorations.push(outOfFocus);
}


function resetDecorations(full: Boolean = false) {
	for (const decoration of activeDecorations) {
		decoration.dispose();
	}

	activeDecorations = [];

	if (full) {
		rangesInFocus = [];
		rangesOutOfFocus = [];
	}
}


export function deactivate() {
	resetDecorations();
}

