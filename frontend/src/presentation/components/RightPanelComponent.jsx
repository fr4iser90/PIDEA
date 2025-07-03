import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiCall, API_CONFIG } from '@infrastructure/repositories/APIChatRepository.jsx';
import ChatMessage from '@domain/entities/ChatMessage.jsx';
import FrameworkPanelComponent from './chat/FrameworkPanelComponent.jsx';
import '@css/framework-panel.css';
import useAuthStore from '@infrastructure/stores/AuthStore.jsx';

function RightPanelComponent({ eventBus, messages = [] }) {
  const [activeTab, setActiveTab] = useState('chat');
  const [isVisible, setIsVisible] = useState(true);
  const [quickPrompts, setQuickPrompts] = useState([]);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [settings, setSettings] = useState({});
  const [inputValue, setInputValue] = useState('');
  const containerRef = useRef(null);
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    console.log('RightPanelComponent useEffect running, eventBus:', !!eventBus);
    setupEventListeners();
    loadPanelData();
    return () => {
      if (eventBus) {
        console.log('Cleaning up right panel event listeners');
        eventBus.off('right-panel-toggle', handleToggle);
        eventBus.off('files-attached', handleFilesAttached);
        eventBus.off('files-removed', handleFilesRemoved);
        eventBus.off('settings-updated', handleSettingsUpdate);
        eventBus.off('quick-prompt-selected', handleQuickPromptSelected);
      }
    };
  }, [eventBus]);

  const setupEventListeners = () => {
    if (eventBus) {
      console.log('Setting up right panel event listeners');
      eventBus.on('right-panel-toggle', handleToggle);
      eventBus.on('files-attached', handleFilesAttached);
      eventBus.on('files-removed', handleFilesRemoved);
      eventBus.on('settings-updated', handleSettingsUpdate);
      eventBus.on('quick-prompt-selected', handleQuickPromptSelected);
      console.log('Right panel event listeners set up');
    } else {
      console.log('No eventBus provided to RightPanelComponent');
    }
  };

  const loadPanelData = async () => {
    if (!isAuthenticated) return;
    try {
      // Load quick prompts
      const promptsData = await apiCall(API_CONFIG.endpoints.prompts.quick);
      if (promptsData.success) {
        setQuickPrompts(promptsData.prompts || []);
      }
      // Load settings
      const settingsData = await apiCall(API_CONFIG.endpoints.settings);
      if (settingsData.success) {
        setSettings(settingsData.settings || {});
      }
    } catch (error) {
      console.error('❌ Failed to load panel data:', error);
    }
  };

  const handleToggle = useCallback(() => {
    console.log('Right panel toggle called, current state:', isVisible);
    setIsVisible(prev => {
      const newState = !prev;
      console.log('Right panel new state:', newState);
      return newState;
    });
  }, [isVisible]);
  const handleFilesAttached = useCallback((files) => setAttachedFiles(prevFiles => [...prevFiles, ...files]), []);
  const handleFilesRemoved = useCallback((fileIds) => setAttachedFiles(prevFiles => prevFiles.filter(f => !fileIds.includes(f.id))), []);
  const handleSettingsUpdate = useCallback((newSettings) => setSettings(newSettings), []);
  const handleQuickPromptSelected = useCallback((prompt) => { if (eventBus) { eventBus.emit('prompt-selected', { prompt }); } }, [eventBus]);
  const handleTabChange = (tab) => setActiveTab(tab);
  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const fileData = files.map(file => ({ id: Date.now() + Math.random(), name: file.name, size: file.size, type: file.type, file: file }));
    handleFilesAttached(fileData);
  };
  const handleFileRemove = (fileId) => handleFilesRemoved([fileId]);
  const handleSettingChange = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    if (eventBus) { eventBus.emit('setting-changed', { key, value }); }
  };
  const handleThemeChange = (theme) => {
    handleSettingChange('theme', theme);
    document.body.className = theme === 'light' ? 'light-theme' : '';
  };
  const handleRightPanelSend = () => {
    if (!inputValue.trim()) return;
    if (eventBus) { eventBus.emit('right-panel-message', { message: inputValue }); }
    setInputValue('');
  };
  const handleInputKeyPress = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleRightPanelSend(); } };
  const formatFileSize = (bytes) => { if (bytes === 0) return '0 Bytes'; const k = 1024; const sizes = ['Bytes', 'KB', 'MB', 'GB']; const i = Math.floor(Math.log(bytes) / Math.log(k)); return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]; };
  const renderChatTab = () => (
    <div className="chat-tab">
      <div className="quick-prompts">
        <h4>Quick Prompts</h4>
        <div className="prompt-list">
          {quickPrompts.map(prompt => (
            <button key={prompt.id} onClick={() => handleQuickPromptSelected(prompt)} className="prompt-btn">{prompt.title}</button>
          ))}
        </div>
      </div>
    </div>
  );
  const renderFilesTab = () => (
    <div className="files-tab">
      <div className="file-upload">
        <h4>Upload Files</h4>
        <div className="upload-area" onClick={() => document.getElementById('fileInput').click()}>
          <div className="upload-placeholder">Click to upload files or drag and drop</div>
        </div>
        <input id="fileInput" type="file" multiple onChange={handleFileUpload} style={{ display: 'none' }} />
      </div>
      <div className="attached-files">
        <h4>Attached Files</h4>
        {attachedFiles.length === 0 ? (
          <div className="no-files">No files attached</div>
        ) : (
          <div className="file-list">
            {attachedFiles.map(file => (
              <div key={file.id} className="file-item">
                <span className="file-icon">📎</span>
                <span className="file-name">{file.name}</span>
                <span className="file-size">{formatFileSize(file.size)}</span>
                <button onClick={() => handleFileRemove(file.id)} className="file-remove-btn" title="Remove file">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
  const renderSettingsTab = () => (
    <div className="settings-tab">
      <div className="setting-group">
        <h4>Appearance</h4>
        <div className="setting-item">
          <label>Theme:</label>
          <div className="theme-options">
            <button onClick={() => handleThemeChange('dark')} className={`theme-btn ${settings.theme === 'dark' ? 'active' : ''}`}>Dark</button>
            <button onClick={() => handleThemeChange('light')} className={`theme-btn ${settings.theme === 'light' ? 'active' : ''}`}>Light</button>
          </div>
        </div>
      </div>
      <div className="setting-group">
        <h4>Chat Settings</h4>
        <div className="setting-item">
          <label>Auto-scroll to bottom:</label>
          <input type="checkbox" checked={settings.autoScroll || false} onChange={(e) => handleSettingChange('autoScroll', e.target.checked)} />
        </div>
        <div className="setting-item">
          <label>Show timestamps:</label>
          <input type="checkbox" checked={settings.showTimestamps !== false} onChange={(e) => handleSettingChange('showTimestamps', e.target.checked)} />
        </div>
      </div>
    </div>
  );
  const renderFrameworksTab = () => (
    <div className="frameworks-tab">
      <FrameworkPanelComponent />
    </div>
  );
  return (
    <div ref={containerRef} className="chat-right-panel" style={{ display: isVisible ? 'flex' : 'none' }}>
      <div className="chat-right-panel-content">
        <div className="panel-header">
          <div className="panel-tabs">
            <button onClick={() => handleTabChange('chat')} className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}>Chat</button>
            <button onClick={() => handleTabChange('files')} className={`tab-btn ${activeTab === 'files' ? 'active' : ''}`}>Files</button>
            <button onClick={() => handleTabChange('settings')} className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}>Settings</button>
            <button onClick={() => handleTabChange('frameworks')} className={`tab-btn ${activeTab === 'frameworks' ? 'active' : ''}`}>Frameworks</button>
          </div>
          <button onClick={handleToggle} className="btn-icon" title="Toggle Right Panel">✕</button>
        </div>
        <div className="panel-content">
          {activeTab === 'chat' && renderChatTab()}
          {activeTab === 'files' && renderFilesTab()}
          {activeTab === 'settings' && renderSettingsTab()}
          {activeTab === 'frameworks' && renderFrameworksTab()}
        </div>
        <div className="right-panel-input-area">
          <textarea id="rightPanelMsgInput" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyPress={handleInputKeyPress} placeholder="Quick message..." />
          <button id="rightPanelSendBtn" onClick={handleRightPanelSend} disabled={!inputValue.trim()}>Send</button>
        </div>
      </div>
    </div>
  );
}

export default RightPanelComponent; 