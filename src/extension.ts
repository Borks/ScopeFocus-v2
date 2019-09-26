import * as vscode from 'vscode';

import Range from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	console.info("ScopeFocus loaded");

	let activateCommand = vscode.commands.registerCommand('extension.focus', () => {
		vscode.window.showInformationMessage('Focusing');
	});

	let deactivateCommand = vscode.commands.registerCommand('extension.defocus', () => {
		vscode.window.showInformationMessage('Defocusing');
	});

	context.subscriptions.push(activateCommand);
	context.subscriptions.push(deactivateCommand);
}

/**
 * Apply focus for a specific range
 *
 * @param {Range} range Range in active editor to focus on
 */
function focusOnRange(range: Range) {

}

export function deactivate() {}

