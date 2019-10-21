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
	 * Focus follows cursor mode.
	 */
	let selectionWatcher = window.onDidChangeTextEditorSelection((event: TextEditorSelectionChangeEvent) => {

	});
	context.subscriptions.push(selectionWatcher);
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
function addRangeToFocus(range: Range): void | boolean {
	if (!window.activeTextEditor) { return false; }

	/**
	 * Check to see if range can be merged or is more specific
	 */
	for (let index in rangesInFocus) {

		/**
		 * If the range is equal to an existing range,
		 * then focus the full lines
		 * - Acts as a double click feature to quickly select and focus on area without
		 * measuring full lines.
		 */
		if (rangesInFocus[index].isEqual(range)) {
			delete rangesInFocus[index];
			let newRange: Range = new Range(
				new Position(range.start.line, 0),
				window.activeTextEditor.document.lineAt(range.end.line).range.end
			);

			rangesInFocus.push(newRange);
			setDecorationRanges();
			setEditorCache(window.activeTextEditor.document.uri, rangesInFocus, rangesOutOfFocus);

			return;
		}

		/**
		 * If an existing focused area encompasses the new range, then the new range is
		 * more specific. Therefore focus only on that
		 */
		if (rangesInFocus[index].contains(range)) {
			delete rangesInFocus[index];
			rangesInFocus.push(range);
			setDecorationRanges();
			setEditorCache(window.activeTextEditor.document.uri, rangesInFocus, rangesOutOfFocus);

			return;
		}

		/**
		 * If the new range intersects with an existing range, combine them.
		 */
		if (rangesInFocus[index].intersection(range)) {
			let combinedRange: Range = rangesInFocus[index].union(range);
			delete rangesInFocus[index];
			rangesInFocus.push(combinedRange);
			setDecorationRanges();
			setEditorCache(window.activeTextEditor.document.uri, rangesInFocus, rangesOutOfFocus);

			return;
		}

	}

	/**
	 * If the new range is a single character, then focus on the line
	 */
	if (range.start.compareTo(range.end) === 0) {
		let lineRange: Range = window.activeTextEditor.document.lineAt(range.end.line).range;
		rangesInFocus.push(lineRange);
		setDecorationRanges();
		setEditorCache(window.activeTextEditor.document.uri, rangesInFocus, rangesOutOfFocus);

		return;
	}


	/**
	 * Just a new range to focus on
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

