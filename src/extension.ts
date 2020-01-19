import {
	ExtensionContext,
	Position,
	Range,
	TextEditor,
	TextEditorDecorationType,
	TextEditorSelectionChangeEvent,
	Uri,
	commands,
	window,
	workspace
} from 'vscode';
import {
	getEditorCache,
	resetDecorationCache,
	setEditorCache
} from './cache';

/**
 * Extension configuration
 */
var EXTENSION_CONFIGURATION = workspace.getConfiguration('scopefocus');


/**
 * Should focus currently be enabled
 */
var focusEnabled: Boolean = true;


/**
 * Ranges that should be in focus
 */
var rangesInFocus: Range[] = [];


/**
 * Range that follow the cursor
 */
var cursorFocusRange: Range;


/**
 * Ranges that are out of focus
 */
var rangesOutOfFocus: Range[] = [];


/**
 * Decorations currently applied on editors
 */
var activeDecorations: TextEditorDecorationType[] = [];


/**
 * initialize Decoration opacity value from settings
 * Includes weird workaround to get around unknown type issue when loading string from conf.
 */
let opacity: string = parseFloat(EXTENSION_CONFIGURATION.get('opacity', "0.06")).toString();
var OUT_OF_FOCUS_DECORATION = { 'opacity': opacity };


/**
 * @function activate Activate the extension, register the commands
 */
export function activate(context: ExtensionContext) {

	/* -------------------------------------------------------------------------- */
	/*                                  COMMANDS                                  */
	/* -------------------------------------------------------------------------- */
	let activateCommand = commands.registerCommand('extension.focus', () => {
		focusEnabled = true;
		setDecorationRanges();
		applyDecorations();
	});
	context.subscriptions.push(activateCommand);


	let deactivateCommand = commands.registerCommand('extension.defocus', () => {
		focusEnabled = false;
		resetDecorations();
	});
	context.subscriptions.push(deactivateCommand);


	let toggleCommand = commands.registerTextEditorCommand('extension.toggle', () => {
		focusEnabled = !focusEnabled;

		if (!focusEnabled) {
			resetDecorations();
		} else {
			setDecorationRanges();
			applyDecorations();
		}
	});
	context.subscriptions.push(toggleCommand);


	let focusSelectionCommand = commands.registerCommand('extension.focusSelection' , () => {
		if (!window.activeTextEditor) { return false; }

		focusEnabled = true;
		addRangeToFocus(window.activeTextEditor.selection);
		setDecorationRanges();
		applyDecorations();
	});
	context.subscriptions.push(focusSelectionCommand);


	let defocusSelectionCommand = commands.registerCommand('extension.defocusSelection' , () => {
		if (!window.activeTextEditor) { return false; }

		removeRangeFromFocus(window.activeTextEditor.selection);
	});
	context.subscriptions.push(defocusSelectionCommand);


	let defocusAllCommand = commands.registerCommand('extension.defocusAll', () => {
		resetDecorations(true);
		resetDecorationCache();
	});
	context.subscriptions.push(defocusAllCommand);


	/* -------------------------------------------------------------------------- */
	/*                                  WATCHERS                                  */
	/* -------------------------------------------------------------------------- */

	/**
	 * Reload configuration if it changes
	 */
	let configurationWatcher = workspace.onDidChangeConfiguration(() => {
		// Load new configuration
		EXTENSION_CONFIGURATION = workspace.getConfiguration('scopefocus');


		// Stupid workaround to get around unknown type issue.
		// Recreate decoration struct
		opacity = parseFloat(EXTENSION_CONFIGURATION.get('opacity', "0.06")).toString();
		OUT_OF_FOCUS_DECORATION = { 'opacity': opacity };

		// Reapply new decorations
		applyDecorations();
	});
	context.subscriptions.push(configurationWatcher);


	/**
	 * Reapply correct ranges if active editor changes
	 */
	let editorWatcher = window.onDidChangeActiveTextEditor((editor: TextEditor | undefined) => {
		if (editor === undefined) { return; }

		let documentUri = editor.document.uri;
		let editorCache = getEditorCache(documentUri);

		rangesInFocus = editorCache.rangesInFocus;
		rangesOutOfFocus = editorCache.rangesOutOfFocus;
		applyDecorations(getEditorByUri(documentUri));
	});
	context.subscriptions.push(editorWatcher);


	/**
	 * Focus type functionality
	 */
	let selectionWatcher = window.onDidChangeTextEditorSelection((event: TextEditorSelectionChangeEvent) => {
		if (!window.activeTextEditor) { return; }

		// Check that there is only one selection.
		// Should support more in the future but for now good enough
		if (event.selections.length !== 1) { return; }

		// Set focus depending on setting of focusType
		let focusType: string = EXTENSION_CONFIGURATION.get('focusType', 'soft');
		switch (focusType) {
			case 'padded':
				setCursorFocusRange(event.selections[0]);
				break;
			case 'soft':
				checkSoftModeCursorPosition(event.selections[0]);
				break;
			case 'hard':
				break;
		}

	});
	context.subscriptions.push(selectionWatcher);
}

/**
 * @function checkSoftModeCursorPosition
 * Enable or disable focus mode depending on cursor position and selection
 *
 */
function checkSoftModeCursorPosition(cursorRange: Range): void {
	// Check that the cursor is not in an already focused area
	let cursorInFocus: boolean = false;

	for (let range of rangesInFocus) {
		if (range.contains(cursorRange)) {
			cursorInFocus = true;
		}
	}
}


/**
 * @function setCursorFocusRange
 * In case of padded focus type apply cursor focus range
 * @param {Range} cursorRange cursor position
 * @returns {void}
 */
function setCursorFocusRange(cursorRange: Range): void {
	if (!window.activeTextEditor) { return; }
	let document = window.activeTextEditor.document;

	// Check that the cursor is not in an already focused area
	for (let range of rangesInFocus) {
		if (range.contains(cursorRange)) {
			cursorFocusRange = new Range(0,0,0,0);
			setDecorationRanges();
			applyDecorations();
			return;
		}
	}

	// If it is an actual selection (not cursor position), dont use padding
	let padding: number = EXTENSION_CONFIGURATION.get('linePadding', 0);
	if (!cursorRange.start.isEqual(cursorRange.end)) { padding = 0; }

	// Create ranges
	let newRange: Range  = new Range(
		new Position(cursorRange.start.line - padding, 0),
		document.lineAt(cursorRange.end.line + padding).range.end
	);

	// Check for intersections with existing focused areas
	for (let rangeInFocus of rangesInFocus) {
		if (rangeInFocus.intersection(newRange)) {
			// new Range should be the combination of 2
			if (cursorRange.start.isBefore(rangeInFocus.start)) {
				newRange = new Range(newRange.start, rangeInFocus.start);
			} else if (cursorRange.end.isAfter(rangeInFocus.end)) {
				newRange = new Range(rangeInFocus.end, newRange.end);
			}
		}
	}

	// Apply
	cursorFocusRange = newRange;
	setDecorationRanges();
	applyDecorations();
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

	/**
	 * Push every in focus ranges anchor offsets to an array
	 */
	rangesInFocus.map(range => {
		offsets.push(document.offsetAt(range.start));
		offsets.push(document.offsetAt(range.end));
	});

	// Add ranges from cursor range
	if (cursorFocusRange) {
		offsets.push(document.offsetAt(cursorFocusRange.start));
		offsets.push(document.offsetAt(cursorFocusRange.end));
	}

	/**
	 * Sort offsets in ascending order
	 */
	offsets = offsets.sort((a,b) => {return a-b;});

	return offsets;
}


/**
 * @function addRangeToFocus Add a range to be in focus
 * @param range Range to be added
 */
function addRangeToFocus(range: Range): void {
	if (!window.activeTextEditor) { return; }

	/**
	 * Check to see if range can be merged or is more specific
	 */
	rangesInFocus = rangesInFocus.filter((rangeInFocus, index) => {
		let removeRange: Boolean = false;
		if (!window.activeTextEditor) { return; }

		/**
		 * If the range is equal to an existing range,
		 * then focus the full lines
		 * - Acts as a double click feature to quickly select and focus on area without
		 * measuring full lines.
		 */
		if (rangeInFocus.isEqual(range)) {
			removeRange = true;
			range = new Range(
				new Position(range.start.line, 0),
				window.activeTextEditor.document.lineAt(range.end.line).range.end
			);
		}

		/**
		 * If an existing focused area encompasses the new range or the other way around,
		 * then the new range is more specific. Therefore focus only on that
		 */
		if (rangeInFocus.contains(range) || range.contains(rangeInFocus)) {
			removeRange = true;

			// .intersection() also returns true in case of contains
			// so return early here.
			return !removeRange;
		}

		/**
		 * If the new range intersects with an existing range, combine them.
		 */
		if (rangesInFocus[index].intersection(range)) {
			range = rangeInFocus.union(range);
			removeRange = true;
		}

		return !removeRange;
	});

	/**
	 * If the new range is a single character, then focus on the line
	 */
	if (range.start.compareTo(range.end) === 0) {
		range = window.activeTextEditor.document.lineAt(range.end.line).range;
	}

	// Reset the cursor range so that offsets get calculated correctly.
	cursorFocusRange = new Range(0,0,0,0);

	/**
	 * Apply the new range
	 */
	rangesInFocus.push(range);

	setDecorationRanges();
	setEditorCache(window.activeTextEditor.document.uri, rangesInFocus, rangesOutOfFocus);
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

			if (window.activeTextEditor) {
				setEditorCache(window.activeTextEditor.document.uri, rangesInFocus, rangesOutOfFocus);
			}
		}
	}
}


function getEditorByUri(uri: Uri): TextEditor | undefined {
	for (let editor of window.visibleTextEditors) {
		if (uri.fsPath === editor.document.uri.fsPath) {
			return editor;
		}
	}

	return undefined;
}


/**
 * @function applyDecorations Reset the decorations applied to the document
 */
function applyDecorations(editor: TextEditor | undefined = window.activeTextEditor): void {
	if (editor === undefined || !focusEnabled) { return; }

	const outOfFocus: TextEditorDecorationType = window.createTextEditorDecorationType(OUT_OF_FOCUS_DECORATION);
	editor.setDecorations(outOfFocus, rangesOutOfFocus);

	resetDecorations();
	activeDecorations.push(outOfFocus);
}


/**
 * @function resetDecorations Remove the applied decorations
 * @param fullReset [false]  Also reset the stored data ranges
 */
function resetDecorations(fullReset: Boolean = false) {
	for (const decoration of activeDecorations) {
		decoration.dispose();
	}

	activeDecorations = [];

	if (fullReset) {
		rangesInFocus = [];
		rangesOutOfFocus = [];
	}
}


export function deactivate() {
	resetDecorations(true);
}

