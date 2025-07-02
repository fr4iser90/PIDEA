# VS Code Extension Patterns

## Overview
VS Code extensions provide powerful ways to enhance the editor's functionality. This guide covers essential patterns for building robust VS Code extensions.

## Extension Structure

### Package.json Configuration
```json
{
  "name": "my-vscode-extension",
  "displayName": "My VS Code Extension",
  "description": "A powerful extension for VS Code",
  "version": "0.0.1",
  "engines": {
    "vscode": "^1.74.0"
  },
  "categories": [
    "Other"
  ],
  "activationEvents": [
    "onCommand:myExtension.helloWorld",
    "onLanguage:javascript",
    "onView:myExtensionView"
  ],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "myExtension.helloWorld",
        "title": "Hello World"
      }
    ],
    "menus": {
      "commandPalette": [
        {
          "command": "myExtension.helloWorld"
        }
      ],
      "editor/context": [
        {
          "command": "myExtension.helloWorld",
          "when": "editorLangId == javascript"
        }
      ]
    },
    "keybindings": [
      {
        "command": "myExtension.helloWorld",
        "key": "ctrl+shift+h",
        "mac": "cmd+shift+h"
      }
    ],
    "views": {
      "explorer": [
        {
          "id": "myExtensionView",
          "name": "My Extension View"
        }
      ]
    },
    "viewsContainers": {
      "activitybar": [
        {
          "id": "myExtension",
          "title": "My Extension",
          "icon": "resources/icon.svg"
        }
      ]
    },
    "configuration": {
      "title": "My Extension",
      "properties": {
        "myExtension.enableFeature": {
          "type": "boolean",
          "default": true,
          "description": "Enable the main feature"
        },
        "myExtension.maxItems": {
          "type": "number",
          "default": 100,
          "description": "Maximum number of items to show"
        }
      }
    }
  },
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "pretest": "npm run compile && npm run lint",
    "lint": "eslint src --ext ts",
    "test": "node ./out/test/runTest.js"
  },
  "devDependencies": {
    "@types/vscode": "^1.74.0",
    "@types/node": "16.x",
    "@typescript-eslint/eslint-plugin": "^5.42.0",
    "@typescript-eslint/parser": "^5.42.0",
    "eslint": "^8.26.0",
    "typescript": "^4.8.4"
  }
}
```

## Core Extension Class

### Main Extension File
```typescript
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "my-vscode-extension" is now active!');

    // Register commands
    let disposable = vscode.commands.registerCommand('myExtension.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from My Extension!');
    });

    context.subscriptions.push(disposable);

    // Register providers
    const provider = new MyProvider();
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            { language: 'javascript' },
            provider,
            '.'
        )
    );

    // Register webview
    const webviewProvider = new MyWebviewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'myExtensionView',
            webviewProvider
        )
    );

    // Register status bar item
    const statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    statusBarItem.text = '$(check) My Extension';
    statusBarItem.tooltip = 'Click to open My Extension';
    statusBarItem.command = 'myExtension.helloWorld';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
}

export function deactivate() {
    // Cleanup code here
}
```

## Command Patterns

### Simple Command
```typescript
class HelloWorldCommand {
    static register(context: vscode.ExtensionContext): vscode.Disposable {
        return vscode.commands.registerCommand('myExtension.helloWorld', () => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const document = editor.document;
                const selection = editor.selection;
                const word = document.getText(selection);
                
                vscode.window.showInformationMessage(`Selected text: ${word}`);
            }
        });
    }
}
```

### Command with Arguments
```typescript
class ProcessFileCommand {
    static register(context: vscode.ExtensionContext): vscode.Disposable {
        return vscode.commands.registerCommand('myExtension.processFile', async (uri: vscode.Uri) => {
            try {
                const document = await vscode.workspace.openTextDocument(uri);
                const text = document.getText();
                
                // Process the file content
                const processedText = this.processContent(text);
                
                // Create a new document with processed content
                const newDocument = await vscode.workspace.openTextDocument({
                    content: processedText,
                    language: document.languageId
                });
                
                await vscode.window.showTextDocument(newDocument);
                
            } catch (error) {
                vscode.window.showErrorMessage(`Error processing file: ${error.message}`);
            }
        });
    }
    
    private static processContent(content: string): string {
        // Add your processing logic here
        return content.toUpperCase();
    }
}
```

## Language Server Integration

### Language Server Client
```typescript
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    TransportKind
} from 'vscode-languageclient/node';

let client: LanguageClient;

export function activateLanguageServer(context: vscode.ExtensionContext) {
    // The server is implemented in node
    const serverModule = context.asAbsolutePath(
        path.join('server', 'out', 'server.js')
    );
    
    // The debug options for the server
    const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    const serverOptions: ServerOptions = {
        run: { module: serverModule, transport: TransportKind.ipc },
        debug: {
            module: serverModule,
            transport: TransportKind.ipc,
            options: debugOptions
        }
    };

    // Options to control the language client
    const clientOptions: LanguageClientOptions = {
        // Register the server for plain text documents
        documentSelector: [
            { scheme: 'file', language: 'plaintext' }
        ],
        synchronize: {
            // Notify the server about file changes to .clientrc files contained in the workspace
            fileEvents: vscode.workspace.createFileSystemWatcher('**/.clientrc')
        }
    };

    // Create the language client and start the client.
    client = new LanguageClient(
        'languageServerExample',
        'Language Server Example',
        serverOptions,
        clientOptions
    );

    // Start the client. This will also launch the server
    client.start();
}

export function deactivateLanguageServer(): Thenable<void> | undefined {
    if (!client) {
        return undefined;
    }
    return client.stop();
}
```

## Webview Patterns

### Webview Provider
```typescript
class MyWebviewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'myExtensionView';
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
    ) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            // Allow scripts in the webview
            enableScripts: true,

            localResourceRoots: [
                this._extensionUri
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'colorSelected':
                    {
                        vscode.window.activeTextEditor?.insertSnippet(
                            new vscode.SnippetString(`#${data.value}`)
                        );
                        return;
                    }
            }
        });
    }

    public addColor() {
        if (this._view) {
            this._view.show?.(true); // `show` is deprecated but still works
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        // Get the local path to the script and uri for loading it in the webview
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js')
        );

        // Do the same for the stylesheet
        const styleResetUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css')
        );
        const styleVSCodeUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css')
        );
        const styleMainUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css')
        );

        // Use a nonce to only allow specific scripts to be run
        const nonce = getNonce();

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
                <link href="${styleResetUri}" rel="stylesheet">
                <link href="${styleVSCodeUri}" rel="stylesheet">
                <link href="${styleMainUri}" rel="stylesheet">
                <title>Cat Colors</title>
            </head>
            <body>
                <ul class="color-list">
                    <li><button class="color-button" data-color="red">Red</button></li>
                    <li><button class="color-button" data-color="blue">Blue</button></li>
                    <li><button class="color-button" data-color="green">Green</button></li>
                </ul>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
```

## Completion Provider

### Custom Completion Items
```typescript
class MyCompletionProvider implements vscode.CompletionItemProvider {
    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem>> {
        
        const completionItems: vscode.CompletionItem[] = [];

        // Create a completion item
        const snippetCompletion = new vscode.CompletionItem('log');
        snippetCompletion.insertText = new vscode.SnippetString('console.log($1);');
        snippetCompletion.documentation = new vscode.MarkdownString('Insert a `console.log` statement');
        snippetCompletion.kind = vscode.CompletionItemKind.Snippet;
        completionItems.push(snippetCompletion);

        // Add more completion items
        const functionCompletion = new vscode.CompletionItem('function');
        functionCompletion.insertText = new vscode.SnippetString(
            'function ${1:functionName}(${2:parameters}) {\n\t${3:// body}\n}'
        );
        functionCompletion.documentation = new vscode.MarkdownString('Create a new function');
        functionCompletion.kind = vscode.CompletionItemKind.Snippet;
        completionItems.push(functionCompletion);

        return completionItems;
    }
}
```

## Hover Provider

### Custom Hover Information
```typescript
class MyHoverProvider implements vscode.HoverProvider {
    provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Hover> {
        
        const range = document.getWordRangeAtPosition(position);
        const word = document.getText(range);

        // Define hover content for specific words
        const hoverContent = new vscode.MarkdownString();
        
        switch (word.toLowerCase()) {
            case 'todo':
                hoverContent.appendMarkdown('**TODO:** A task that needs to be completed\n\n');
                hoverContent.appendMarkdown('Use this to mark incomplete tasks in your code.');
                break;
            case 'fixme':
                hoverContent.appendMarkdown('**FIXME:** A bug that needs to be fixed\n\n');
                hoverContent.appendMarkdown('Use this to mark bugs or issues in your code.');
                break;
            case 'hack':
                hoverContent.appendMarkdown('**HACK:** A temporary solution\n\n');
                hoverContent.appendMarkdown('Use this to mark temporary or hacky solutions.');
                break;
            default:
                return null;
        }

        return new vscode.Hover(hoverContent, range);
    }
}
```

## Diagnostic Provider

### Custom Diagnostics
```typescript
class MyDiagnosticProvider {
    private diagnosticCollection: vscode.DiagnosticCollection;

    constructor() {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('myExtension');
    }

    public updateDiagnostics(document: vscode.TextDocument): void {
        const diagnostics: vscode.Diagnostic[] = [];

        const text = document.getText();
        const pattern = /\b[A-Z]{2,}\b/g;
        let match;

        while ((match = pattern.exec(text)) !== null) {
            const startPos = document.positionAt(match.index);
            const endPos = document.positionAt(match.index + match[0].length);
            const range = new vscode.Range(startPos, endPos);

            const diagnostic = new vscode.Diagnostic(
                range,
                'Consider using camelCase instead of UPPERCASE',
                vscode.DiagnosticSeverity.Warning
            );

            diagnostic.source = 'My Extension';
            diagnostics.push(diagnostic);
        }

        this.diagnosticCollection.set(document.uri, diagnostics);
    }

    public dispose(): void {
        this.diagnosticCollection.dispose();
    }
}
```

## Configuration Management

### Settings Management
```typescript
class ConfigurationManager {
    private static readonly SECTION = 'myExtension';

    static getEnableFeature(): boolean {
        return vscode.workspace.getConfiguration(this.SECTION).get('enableFeature', true);
    }

    static getMaxItems(): number {
        return vscode.workspace.getConfiguration(this.SECTION).get('maxItems', 100);
    }

    static async setEnableFeature(value: boolean): Promise<void> {
        await vscode.workspace.getConfiguration(this.SECTION).update('enableFeature', value);
    }

    static onDidChangeConfiguration(callback: () => void): vscode.Disposable {
        return vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration(this.SECTION)) {
                callback();
            }
        });
    }
}
```

## Workspace Management

### File System Operations
```typescript
class WorkspaceManager {
    static async createFile(path: string, content: string): Promise<vscode.Uri> {
        const uri = vscode.Uri.file(path);
        
        try {
            await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
            return uri;
        } catch (error) {
            throw new Error(`Failed to create file: ${error.message}`);
        }
    }

    static async readFile(uri: vscode.Uri): Promise<string> {
        try {
            const content = await vscode.workspace.fs.readFile(uri);
            return Buffer.from(content).toString('utf8');
        } catch (error) {
            throw new Error(`Failed to read file: ${error.message}`);
        }
    }

    static async findFiles(pattern: string): Promise<vscode.Uri[]> {
        return await vscode.workspace.findFiles(pattern);
    }

    static async getWorkspaceFolders(): Promise<vscode.WorkspaceFolder[]> {
        return vscode.workspace.workspaceFolders || [];
    }
}
```

## Testing

### Extension Tests
```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('Sample test', () => {
        assert.strictEqual(-1, [1, 2, 3].indexOf(5));
        assert.strictEqual(-1, [1, 2, 3].indexOf(0));
    });

    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('myExtension.id'));
    });

    test('Should activate', async () => {
        const ext = vscode.extensions.getExtension('myExtension.id');
        await ext?.activate();
        assert.strictEqual(ext?.isActive, true);
    });
});
```

## Performance Optimization

### Efficient Event Handling
```typescript
class EventManager {
    private disposables: vscode.Disposable[] = [];

    constructor() {
        // Debounce file change events
        let timeout: NodeJS.Timeout;
        this.disposables.push(
            vscode.workspace.onDidChangeTextDocument(event => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    this.handleDocumentChange(event);
                }, 300);
            })
        );
    }

    private handleDocumentChange(event: vscode.TextDocumentChangeEvent) {
        // Handle document changes efficiently
        console.log('Document changed:', event.document.fileName);
    }

    dispose() {
        this.disposables.forEach(d => d.dispose());
    }
}
```

## Error Handling

### Robust Error Handling
```typescript
class ErrorHandler {
    static async handleError(error: Error, context: string): Promise<void> {
        console.error(`Error in ${context}:`, error);

        // Show user-friendly error message
        const message = this.getUserFriendlyMessage(error);
        await vscode.window.showErrorMessage(message);

        // Log detailed error for debugging
        this.logError(error, context);
    }

    private static getUserFriendlyMessage(error: Error): string {
        // Map technical errors to user-friendly messages
        if (error.message.includes('ENOENT')) {
            return 'File not found. Please check the file path.';
        }
        if (error.message.includes('EACCES')) {
            return 'Permission denied. Please check file permissions.';
        }
        return 'An unexpected error occurred. Please try again.';
    }

    private static logError(error: Error, context: string): void {
        // Log error to output channel or file
        console.error(`[${context}] ${error.stack}`);
    }
}
```
