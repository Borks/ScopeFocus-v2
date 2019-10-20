import {
    Range,
    Uri
} from 'vscode';

/**
 * @interface DecorationStore For storing decorations in the cache
 * @property {Uri} uri the URI of the document
 * @property {Range[]} rangesInFocus Array of in focus ranges
 */
interface DecorationStore {
	uri: Uri;
    rangesInFocus: Range[];
    rangesOutOfFocus: Range[];
}


/**
 * Cache to store active decorations when editor changes
 */
var decorationCache: Array<DecorationStore> = [];


export function getEditorCache(uri: Uri): DecorationStore | null {
    for (let decoration of decorationCache) {
        if (decoration.uri.fsPath === uri.fsPath) {
            return decoration;
        }
    }

    return null;
}


export function setEditorCache(uri: Uri, rangesInFocus: Range[], rangesOutOfFocus: Range[]): void {
    for (let decoration of decorationCache) {
        if (decoration.uri.fsPath === uri.fsPath) {
            decoration.rangesInFocus = rangesInFocus;
            decoration.rangesOutOfFocus = rangesOutOfFocus;
            return;
        }
    }

    decorationCache.push({
        uri: uri,
        rangesInFocus: rangesInFocus,
        rangesOutOfFocus: rangesOutOfFocus
    });

    return;
}


export function removeEditorCache(uri: Uri) {
    for (let decoration in decorationCache) {
        if (decorationCache[decoration].uri.fsPath === uri.fsPath) {
            delete decorationCache[decoration];
            return true;
        }
    }
}


export function hasEditorDecorations (uri: Uri): Boolean {
    for (let decoration of decorationCache) {
        if (decoration.uri.fsPath === uri.fsPath) {
            return true;
        }
    }

    return false;
}


export function resetDecorationCache() {
    decorationCache = [];
}