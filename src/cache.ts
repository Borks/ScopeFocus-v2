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


export function getEditorDecorations(uri: Uri) {

}


export function setEditorDecorations(uri: Uri) {

}


export function hasEditorDecorations (uri: Uri) {

}