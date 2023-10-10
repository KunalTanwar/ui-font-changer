const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const appRoot = vscode.env.appRoot;

const workbenchCssPath = path.join(appRoot, 'out', 'vs', 'workbench', 'workbench.desktop.main.css');
const workbenchJsPath = path.join(appRoot, 'out', 'vs', 'workbench', 'workbench.desktop.main.js');
const markdownCssPath = path.join(appRoot, 'extensions', 'markdown-language-features', 'media', 'markdown.css');

function createBackup(filePath) {
    const backupPath = `${filePath}.backup`;
    fs.copyFileSync(filePath, backupPath);
}

function restoreFromBackup(filePath) {
    const backupPath = `${filePath}.backup`;

    if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, filePath);
        vscode.window.showInformationMessage(`Settings restored from ${backupPath}. Close and reopen VS Code to see changes.`);
    } else {
        vscode.window.showErrorMessage(`No backup found for ${filePath}`);
    }
}

function activate(context) {
    const changeFont = 'ui-font-changer.modifyFiles';
    const restoreSystem = 'ui-font-changer.restoreSettings';

    const modifyDisposable = vscode.commands.registerCommand(changeFont, async () => {
        // Create backups before making changes
        createBackup(workbenchCssPath);
        createBackup(workbenchJsPath);
        createBackup(markdownCssPath);

        const fontName = await vscode.window.showInputBox({
            placeHolder: "Enter the name of the font",
            prompt: 'Type the name of the font you want to use as your UI font'
        });

        if (!fontName) {
            vscode.window.showInformationMessage('You did not enter any font name, no changes applied');
        } else {

            // Update workbench.desktop.main.css file
            const cssFileContent = fs.readFileSync(workbenchCssPath, 'utf-8');
            const modifiedCssContent = cssFileContent.replace(/\.windows\s*{\s*font-family\s*:\s*(.*?)(;|$)/g, (match, fontFamilies) => {
                const fontArray = fontFamilies.split(',').map(font => font.trim());
                fontArray.unshift(`"${fontName}"`);
                return `.windows { font-family: ${fontArray.join(', ')};`;
            });

            fs.writeFileSync(workbenchCssPath, modifiedCssContent, 'utf-8');

            // Update workbench.desktop.main.js file
            const jsFileContent = fs.readFileSync(workbenchJsPath, 'utf-8');
            const modifiedJsContent = jsFileContent.replace(/:host-context\(\.windows\) {\s*font-family:\s*(.*?)(;|$)/g, (match, fontFamilies) => {
                const fontArray = fontFamilies.split(',').map(font => font.trim());
                fontArray.unshift(`"${fontName}"`);
                return `:host-context(.windows) { font-family: ${fontArray.join(', ')};`;
            });

            fs.writeFileSync(workbenchJsPath, modifiedJsContent, 'utf-8');

            // Update markdown.css file
            const markdownCssFileContent = fs.readFileSync(markdownCssPath, 'utf-8');

            let modifiedMarkdownCssContent = markdownCssFileContent;


            // Check if --markdown-font-family is present
            if (markdownCssFileContent.includes('--markdown-font-family')) {
                modifiedMarkdownCssContent = markdownCssFileContent.replace(/html,\s*body\s*{\s*font-family\s*:\s*["']?(.*?)(["';)]|,$)/g, (match, fontFamilies) => {
                    const fontArray = fontFamilies.split(',').map(font => font.trim());
                    fontArray[0] = `"${fontName}"`;
                    return `html, body { font-family: ${fontArray.join(', ')};`;
                });
            } else {
                // If --markdown-font-family is not present, replace directly
                modifiedMarkdownCssContent = markdownCssFileContent.replace(/html,\s*body\s*{\s*font-family\s*:\s*["']?(.*?)(["';)]|,$)/g, (match, fontFamilies) => {
                    const fontArray = fontFamilies.split(',').map(font => font.trim());
                    fontArray[0] = `"${fontName}"`;
                    return `html, body { font-family: ${fontArray.join(', ')}`;
                });
            }

            fs.writeFileSync(markdownCssPath, modifiedMarkdownCssContent, 'utf-8');
            vscode.window.showInformationMessage('Font changed, close and reopen VS Code to see changes');
        }
    });

    const restoreDisposable = vscode.commands.registerCommand(restoreSystem, () => {
        // Restore files from backups
        restoreFromBackup(workbenchCssPath);
        restoreFromBackup(workbenchJsPath);
        restoreFromBackup(markdownCssPath);


    });
    context.subscriptions.push(modifyDisposable, restoreDisposable);
}


exports.activate = activate;