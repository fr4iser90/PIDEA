import React, { useState, useEffect } from 'react';

const ChatRightPanelComponent = ({ eventBus }) => {
  const [currentTab, setCurrentTab] = useState('chat');
  const [stats, setStats] = useState({});
  const [files, setFiles] = useState([]);

  useEffect(() => {
    eventBus.on('chat-right-panel:stats:updated', (data) => setStats(data.stats));
    eventBus.on('chat-right-panel:files:updated', (data) => setFiles(data.files));
  }, [eventBus]);

  const handleFileUpload = (files) => {
    eventBus.emit('chat-right-panel:files:uploaded', { files });
  };

  const handleTheme = (theme) => {
    eventBus.emit('chat-right-panel:theme:changed', { theme });
  };

  return (
    <div className="chat-right-panel-content">
      <div className="panel-header">
        <div className="panel-tabs">
          <button className={`tab-btn${currentTab === 'chat' ? ' active' : ''}`} data-tab="chat" onClick={() => setCurrentTab('chat')}>💬 Chat</button>
          <button className={`tab-btn${currentTab === 'files' ? ' active' : ''}`} data-tab="files" onClick={() => setCurrentTab('files')}>📁 Files</button>
          <button className={`tab-btn${currentTab === 'settings' ? ' active' : ''}`} data-tab="settings" onClick={() => setCurrentTab('settings')}>⚙️</button>
        </div>
        <button id="toggleChatPanelBtn" className="btn-icon" title="Panel ein-/ausblenden">◀</button>
      </div>
      <div className="panel-content">
        {currentTab === 'chat' && (
          <div className="chat-tab">
            <div className="chat-info">
              <h4>Chat Info</h4>
              <div className="info-item"><span className="label">Nachrichten:</span><span className="value" id="messageCount">{stats.messageCount || 0}</span></div>
              <div className="info-item"><span className="label">Zeichen:</span><span className="value" id="charCount">{stats.charCount || 0}</span></div>
              <div className="info-item"><span className="label">Start:</span><span className="value" id="chatStart">{stats.startTime || '-'}</span></div>
            </div>
            <div className="quick-prompts">
              <h4>Schnell-Prompts</h4>
              <div className="prompt-list">
                <button className="prompt-btn" data-prompt="Erkläre mir das kurz" onClick={() => eventBus.emit('chat-right-panel:quick-prompt', { prompt: 'Erkläre mir das kurz' })}>💡 Kurze Erklärung</button>
                <button className="prompt-btn" data-prompt="Zeige mir ein Beispiel" onClick={() => eventBus.emit('chat-right-panel:quick-prompt', { prompt: 'Zeige mir ein Beispiel' })}>📝 Beispiel</button>
                <button className="prompt-btn" data-prompt="Debugge diesen Code" onClick={() => eventBus.emit('chat-right-panel:quick-prompt', { prompt: 'Debugge diesen Code' })}>🐛 Debug</button>
                <button className="prompt-btn" data-prompt="Optimiere diesen Code" onClick={() => eventBus.emit('chat-right-panel:quick-prompt', { prompt: 'Optimiere diesen Code' })}>⚡ Optimieren</button>
                <button className="prompt-btn" data-prompt="Schreibe Tests für diesen Code" onClick={() => eventBus.emit('chat-right-panel:quick-prompt', { prompt: 'Schreibe Tests für diesen Code' })}>🧪 Tests</button>
                <button className="prompt-btn" data-prompt="Dokumentiere diesen Code" onClick={() => eventBus.emit('chat-right-panel:quick-prompt', { prompt: 'Dokumentiere diesen Code' })}>📚 Dokumentation</button>
              </div>
            </div>
          </div>
        )}
        {currentTab === 'files' && (
          <div className="files-tab">
            <div className="file-upload">
              <h4>Dateien hochladen</h4>
              <div className="upload-area" id="uploadArea" onClick={() => document.getElementById('fileInput').click()}>
                <input type="file" id="fileInput" multiple style={{ display: 'none' }} onChange={e => handleFileUpload(Array.from(e.target.files))} />
                <div className="upload-placeholder"><span>📁 Dateien hier ablegen oder klicken</span></div>
              </div>
            </div>
            <div className="attached-files">
              <h4>Angehängte Dateien</h4>
              <div className="file-list" id="fileList">
                {files.length === 0 ? <div className="no-files">Keine Dateien angehängt</div> : files.map(file => (
                  <div className="file-item" key={file.name}>
                    <span className="file-icon">📄</span>
                    <span className="file-name">{file.name}</span>
                    <button className="file-remove-btn" data-file={file.name} title="Entfernen" onClick={() => eventBus.emit('chat-right-panel:file:remove', { fileName: file.name })}>×</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {currentTab === 'settings' && (
          <div className="settings-tab">
            <div className="setting-group">
              <h4>Chat-Einstellungen</h4>
              <div className="setting-item"><label htmlFor="autoScroll">Auto-Scroll</label><input type="checkbox" id="autoScroll" defaultChecked /></div>
              <div className="setting-item"><label htmlFor="typingIndicator">Typing Indicator</label><input type="checkbox" id="typingIndicator" defaultChecked /></div>
              <div className="setting-item"><label htmlFor="messageSound">Nachrichten-Sound</label><input type="checkbox" id="messageSound" /></div>
              <div className="setting-item"><label htmlFor="markdownRendering">Markdown Rendering</label><input type="checkbox" id="markdownRendering" defaultChecked /></div>
            </div>
            <div className="setting-group">
              <h4>Theme</h4>
              <div className="theme-options">
                <button className="theme-btn active" data-theme="dark" onClick={() => handleTheme('dark')}>🌙 Dark</button>
                <button className="theme-btn" data-theme="light" onClick={() => handleTheme('light')}>☀️ Light</button>
                <button className="theme-btn" data-theme="auto" onClick={() => handleTheme('auto')}>🔄 Auto</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatRightPanelComponent;
export { ChatRightPanelComponent }; 