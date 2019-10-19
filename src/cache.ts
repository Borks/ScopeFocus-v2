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
}


/**
 * Cache to store active decorations when editor changes
 */
var decorationCache: Array<DecorationStore> = [];


export function getEditorDecorations(uri: Uri): Range[] {
    for (let decoration of decorationCache) {
        if (decoration.uri === uri) {
            return decoration.rangesInFocus;
        }
    }

    return [];
}


export function setEditorDecorations(uri: Uri, ranges: Range[]): void {
    for (let decoration of decorationCache) {
        if (decoration.uri === uri) {
            decoration.rangesInFocus = ranges;
            return;
        }
    }

    decorationCache.push({
        uri: uri,
        rangesInFocus: ranges
    });
}


export function removeEditorDecorations(uri: Uri) {
    for (let decoration in decorationCache) {
        if (decorationCache[decoration].uri === uri) {
            delete decorationCache[decoration];
            return true;
        }
    }
}


export function hasEditorDecorations (uri: Uri): Boolean {
    for (let decoration of decorationCache) {
        if (decoration.uri === uri) {
            return true;
        }
    }

    return false;
}


export function resetDecorationCache() {
    decorationCache = [];
}