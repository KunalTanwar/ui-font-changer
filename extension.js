const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const appRoot = vscode.env.appRoot;

const workbenchCssPath = path.join(appRoot, 'out', 'vs', 'workbench', 'workbench.desktop.main.css');
const workbenchJsPath = path.join(appRoot, 'out', 'vs', 'workbench', 'workbench.desktop.main.js');
const markdownCssPath = path.join(appRoot, 'extensions', 'markdown-language-features', 'media', 'markdown.css');

function checkPermissions(filePath) {
    try {
        fs.accessSync(filePath, fs.constants.R_OK | fs.constants.W_OK);
        return true; // User has read and write permissions
    } catch (error) {
        console.error(`Error checking permissions for ${filePath}: ${error}`);
        return false; // User does not have required permissions
    }
}

async function createBackup(filePath) {
    const backupPath = `${filePath}.backup`;

    // Check if a backup file already exists
    try {
        if (!fs.existsSync(backupPath)) {
            /**
             * Instead of using `fs.copyFileSync`, consider using `fs.createReadStream` and `fs.createWriteStream` for potentially large files. This can help avoid memory issues.
             */
            const readStream = fs.createReadStream(filePath);
            const writeStream = fs.createWriteStream(backupPath);

            if (checkPermissions(filePath)) {
                await readStream.pipe(writeStream);
            }
        }
    } catch (error) {
        console.error(`Error in creating backup for ${filePath}: ${error.message}`);
    }
}

function restoreFromBackup(filePath) {
    const backupPath = `${filePath}.backup`;
        
    try {
        if (fs.existsSync(backupPath)) {
            fs.copyFileSync(backupPath, filePath);
            vscode.window.showInformationMessage(`Settings restored, Restart VS Code to see changes.`);
        } else {
            vscode.window.showInformationMessage(`Backup files not found`);
        }
    } catch (error) {
        console.log(`Error restoring from backup for ${filePath}: ${error}`)
    }
}

function activate(context) {
    const changeFont = 'ui-font-changer.modifyFiles';
    const restoreSystem = 'ui-font-changer.restoreSettings';

    const modifyDisposable = vscode.commands.registerCommand(changeFont, async () => {

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

            // const jsFileContents = fs.readFileSync(workbenchJsPath, 'utf-8');
            // const updatedJsContent = jsFileContents.replace(/e\.\$_Iqb=I[^\W]?\.\$j\?["']([^"']*)["']/g, (match, fontFamilies) => {
            // const fontArray = fontFamilies.split(',').map(font => font.trim());
            // fontArray[0] = `"${fontName}"`;
            // return `e.$_Iqb=I.$j?'${fontArray.join(', ')}, "`;
            // });

            // fs.writeFileSync(workbenchJsPath, updatedJsContent, 'utf-8');
            
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
            vscode.window.showInformationMessage('Font changed, Restart VS Code to see changes');
        }
    });

    const restoreDisposable = vscode.commands.registerCommand(restoreSystem, () => {
        // Restore files from backups
        restoreFromBackup(workbenchCssPath);
        restoreFromBackup(workbenchJsPath);
        restoreFromBackup(markdownCssPath);
        vscode.window.showInformationMessage('System fonts restored, restart VS Code to see changes');
    });

    context.subscriptions.push(modifyDisposable, restoreDisposable);
}

exports.activate = activate;
