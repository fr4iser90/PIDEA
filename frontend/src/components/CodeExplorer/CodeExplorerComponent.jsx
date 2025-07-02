import React, { useState, useEffect } from 'react';

const CodeExplorerComponent = ({ eventBus }) => {
  const [currentFile, setCurrentFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!eventBus) return;

    const handleFileSelected = (data) => {
      console.log('[CodeExplorer] Event received: code-explorer:file:selected', data);
      loadFile(data.file);
    };

    eventBus.on('code-explorer:file:selected', handleFileSelected);

    return () => {
      eventBus.off('code-explorer:file:selected', handleFileSelected);
    };
  }, [eventBus]);

  const loadFile = async (file) => {
    try {
      setIsLoading(true);
      setError(null);
      
      setCurrentFile(file);
      
      // Load file content from API
      const response = await fetch(`/api/files/content?path=${encodeURIComponent(file.path)}`);
      const result = await response.json();
      console.log('[CodeExplorer] API-Result:', result);
      
      if (result.success) {
        setCurrentFile({
          ...file,
          content: result.data.content
        });
        console.log('[CodeExplorer] Set currentFile.content:', result.data.content);
      } else {
        setError(`Fehler beim Laden der Datei: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to load file:', error);
      setError('Fehler beim Laden der Datei');
    } finally {
      setIsLoading(false);
    }
  };

  const getLanguageClass = (file) => {
    if (!file || !file.name || !file.name.includes('.')) return '';
    const ext = file.name.split('.').pop().toLowerCase();
    const map = {
      js: 'javascript',
      ts: 'typescript',
      py: 'python',
      md: 'markdown',
      yml: 'yaml',
      sh: 'bash',
      c: 'c',
      cpp: 'cpp',
      h: 'cpp',
      java: 'java',
      json: 'json',
      html: 'xml',
      css: 'css',
      xml: 'xml',
      log: 'plaintext',
      txt: 'plaintext'
    };
    return 'language-' + (map[ext] || ext);
  };

  const handleToggleChat = () => {
    eventBus?.emit('code-explorer:toggle-chat');
  };

  if (error) {
    return (
      <div className="code-explorer-container">
        <div className="code-explorer-layout">
          <div className="code-explorer-editor">
            <div className="editor-header">
              <span className="file-name">Fehler</span>
              <div className="editor-actions">
                <button onClick={handleToggleChat} title="Chat öffnen/schließen">💬</button>
              </div>
            </div>
            <div className="editor-content">
              <div className="error-message">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="code-explorer-container">
      <div className="code-explorer-layout">
        <div className="code-explorer-editor" id="codeEditor">
          <div className="editor-header">
            <span className="file-name">
              {currentFile ? currentFile.name : 'Keine Datei ausgewählt'}
            </span>
            <div className="editor-actions">
              <button 
                id="toggleExplorerChat" 
                onClick={handleToggleChat}
                title="Chat öffnen/schließen"
              >
                💬
              </button>
            </div>
          </div>
          <div className="editor-content">
            {isLoading ? (
              <div className="loading">Lade Datei...</div>
            ) : (
              <pre>
                <code 
                  id="codeContent" 
                  className={getLanguageClass(currentFile)}
                >
                  {currentFile ? currentFile.content : 'Wählen Sie eine Datei aus dem Projektbaum aus.'}
                </code>
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeExplorerComponent; 