import {
	ExtensionContext,
	Position,
	Range,
	TextEditorDecorationType,
	commands,
	window,
	workspace
} from 'vscode';

/**
 * Extension configuration
 */
const EXTENSION_CONFIGURATION = workspace.getConfiguration('scopefocus');


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
 * @function activate Activate the extension, register the commands
 */
export function activate(context: ExtensionContext) {

	let activateCommand = commands.registerCommand('extension.focus', () => {
		setDecorationRanges();
		applyDecorations();
	});
	context.subscriptions.push(activateCommand);


	let deactivateCommand = commands.registerCommand('extension.defocus', () => {
		resetDecorations(true);
	});
	context.subscriptions.push(deactivateCommand);


	let focusSelectionCommand = commands.registerCommand('extension.focusSelection' , () => {
		if (!window.activeTextEditor) { return false; }

		let range: Range = window.activeTextEditor.selection;
		addRangeToFocus(range);
		setDecorationRanges();
		applyDecorations();
	});
	context.subscriptions.push(focusSelectionCommand);


	let defocusSelectionCommand = commands.registerCommand('extension.defocusSelection' , () => {
		if (!window.activeTextEditor) { return false; }
		let defocusPos: Range = window.activeTextEditor.selection;
		removeRangeFromFocus(defocusPos);
	});
	context.subscriptions.push(defocusSelectionCommand);


	let defocusAllCommand = commands.registerCommand('extension.defocusAll', () => {
		resetDecorations(true);
	});
	context.subscriptions.push(defocusAllCommand);
}


/**
 * @function setDecorationRanges Calculate and set the out of focus ranges.
 * @returns Array of ranges, which should be decorated as being out of focus
 */
function setDecorationRanges() : Range[] | boolean {
	if (!window.activeTextEditor) { return false; }

	let document = window.activeTextEditor.document;
	let offsets = getRangeOffsets();

	rangesOutOfFocus = [];

	/**
	 * Set the ranges between every other offset point.
	 * Starting from the document beginning.
	 */
	let posA: Position = new Position(0, 0);
	for (let index = 0; index < offsets.length; index = index + 2) {
		let posB: Position = document.positionAt(offsets[index]);

		let outOfFocusRange: Range = new Range(posA, posB);
		rangesOutOfFocus.push(outOfFocusRange);

		if (index + 1 < offsets.length) {
			posA = document.positionAt(offsets[index + 1]);
		}
	}

	/**
	 * Set the range from the last offset point to the end of the document
	 */
	if (offsets.length > 0) {
		let outOfFocusRange: Range = new Range(
			document.positionAt(offsets[offsets.length-1]),
			document.lineAt(document.lineCount - 1).range.end
		);

		rangesOutOfFocus.push(outOfFocusRange);
	}

	return rangesOutOfFocus;
}


/**
 * @function getRangeOffsets Convert the in focus ranges to offset numbers
 * @returns {number[]} Array of numbers, symbolising offsets in editor, in sorted order.
 */
function getRangeOffsets(): number[] {
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


/**
 * @function addRangeToFocus Add a range to be in focus
 * @param range Range to be added
 */
function addRangeToFocus(range: Range): void | boolean {
	if (!window.activeTextEditor) { return false; }

	/**
	 * Check to see if range can be merged or is more specific
	 */
	for (let index in rangesInFocus) {

		/**
		 * If an existing focused area encompasses the new range, then the new range is
		 * more specific. Therefore focus only on that
		 */
		if (rangesInFocus[index].contains(range)) {
			delete rangesInFocus[index];
			rangesInFocus.push(range);

			return;
		}

		/**
		 * If the new range intersects with an existing range, combine them.
		 */
		if (rangesInFocus[index].intersection(range)) {
			let combinedRange: Range = rangesInFocus[index].union(range);
			delete rangesInFocus[index];
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
function removeRangeFromFocus(range: Range): void {
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
function applyDecorations(): void | boolean {
	if (!window.activeTextEditor) { return false; }
	let OUT_OF_FOCUS_DECORATION = { 'opacity': '0.1' };

	let opacity: string | undefined = EXTENSION_CONFIGURATION.get('opacity');
	if (opacity) { OUT_OF_FOCUS_DECORATION = { 'opacity': opacity }; }

	resetDecorations();
	const outOfFocus: TextEditorDecorationType = window.createTextEditorDecorationType(OUT_OF_FOCUS_DECORATION);
	window.activeTextEditor.setDecorations(outOfFocus, rangesOutOfFocus);

	activeDecorations.push(outOfFocus);
}


/**
 * @function resetDecorations Remove the applied decorations
 * @param full [full=false]  Also reset the stored data ranges
 */
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

