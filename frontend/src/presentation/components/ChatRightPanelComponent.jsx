import React, { useState, useEffect } from 'react';

function ChatRightPanelComponent({ eventBus }) {
  const [currentTab, setCurrentTab] = useState('chat');
  const [isVisible, setIsVisible] = useState(true);

  // EventBus-Listener (hier nur als Platzhalter, da keine dynamischen Daten im Original)
  useEffect(() => {
    if (!eventBus) return;
    // Hier könnten weitere Event-Listener hinzugefügt werden
  }, [eventBus]);

  const handleTabSwitch = (tab) => setCurrentTab(tab);
  const handleTogglePanel = () => setIsVisible(v => !v);
  const handleQuickPrompt = (prompt) => eventBus.emit('chat-right-panel:quick-prompt', { prompt });

  // Tab-Inhalte
  const renderChatTab = () => (
    <div className="chat-tab">
      <div className="chat-info">
        <h4>Chat Info</h4>
        <div className="info-item">
          <span className="label">Nachrichten:</span>
          <span className="value" id="messageCount">0</span>
        </div>
        <div className="info-item">
          <span className="label">Zeichen:</span>
          <span className="value" id="charCount">0</span>
        </div>
        <div className="info-item">
          <span className="label">Start:</span>
          <span className="value" id="chatStart">-</span>
        </div>
      </div>
      <div className="quick-prompts">
        <h4>Schnell-Prompts</h4>
        <div className="prompt-list">
          <button className="prompt-btn" onClick={() => handleQuickPrompt('Erkläre mir das kurz')}>💡 Kurze Erklärung</button>
          <button className="prompt-btn" onClick={() => handleQuickPrompt('Zeige mir ein Beispiel')}>📝 Beispiel</button>
          <button className="prompt-btn" onClick={() => handleQuickPrompt('Debugge diesen Code')}>🐛 Debug</button>
          <button className="prompt-btn" onClick={() => handleQuickPrompt('Optimiere diesen Code')}>⚡ Optimieren</button>
          <button className="prompt-btn" onClick={() => handleQuickPrompt('Schreibe Tests für diesen Code')}>🧪 Tests</button>
          <button className="prompt-btn" onClick={() => handleQuickPrompt('Dokumentiere diesen Code')}>📚 Dokumentation</button>
        </div>
      </div>
    </div>
  );

  const renderFilesTab = () => (
    <div className="files-tab">
      <div className="file-upload">
        <h4>Dateien hochladen</h4>
        <div className="upload-area" id="uploadArea">
          <input type="file" id="fileInput" multiple style={{ display: 'none' }} />
          <div className="upload-placeholder">
            <span>📁 Dateien hier ablegen oder klicken</span>
          </div>
        </div>
      </div>
      <div className="attached-files">
        <h4>Angehängte Dateien</h4>
        <div className="file-list" id="fileList">
          <div className="no-files">Keine Dateien angehängt</div>
        </div>
      </div>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="settings-tab">
      <div className="setting-group">
        <h4>Chat-Einstellungen</h4>
        <div className="setting-item">
          <label htmlFor="autoScroll">Auto-Scroll</label>
          <input type="checkbox" id="autoScroll" defaultChecked />
        </div>
        <div className="setting-item">
          <label htmlFor="typingIndicator">Typing Indicator</label>
          <input type="checkbox" id="typingIndicator" defaultChecked />
        </div>
        <div className="setting-item">
          <label htmlFor="messageSound">Nachrichten-Sound</label>
          <input type="checkbox" id="messageSound" />
        </div>
        <div className="setting-item">
          <label htmlFor="markdownRendering">Markdown Rendering</label>
          <input type="checkbox" id="markdownRendering" defaultChecked />
        </div>
      </div>
      <div className="setting-group">
        <h4>Theme</h4>
        <div className="theme-options">
          <button className="theme-btn active" data-theme="dark">🌙 Dark</button>
          <button className="theme-btn" data-theme="light">☀️ Light</button>
          <button className="theme-btn" data-theme="auto">🔄 Auto</button>
        </div>
      </div>
    </div>
  );

  if (!isVisible) return null;

  return (
    <div className="chat-right-panel-content">
      <div className="panel-header">
        <div className="panel-tabs">
          <button className={`tab-btn${currentTab === 'chat' ? ' active' : ''}`} data-tab="chat" onClick={() => handleTabSwitch('chat')}>💬 Chat</button>
          <button className={`tab-btn${currentTab === 'files' ? ' active' : ''}`} data-tab="files" onClick={() => handleTabSwitch('files')}>📁 Files</button>
          <button className={`tab-btn${currentTab === 'settings' ? ' active' : ''}`} data-tab="settings" onClick={() => handleTabSwitch('settings')}>⚙️</button>
        </div>
        <button id="toggleChatPanelBtn" className="btn-icon" title="Panel ein-/ausblenden" onClick={handleTogglePanel}>◀</button>
      </div>
      <div className="panel-content">
        {currentTab === 'chat' && renderChatTab()}
        {currentTab === 'files' && renderFilesTab()}
        {currentTab === 'settings' && renderSettingsTab()}
      </div>
    </div>
  );
}

export default ChatRightPanelComponent; 