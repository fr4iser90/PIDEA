/**
 * SidebarRight - Manages the right sidebar/panel for tasks, auto features, and content library
 * 
 * This component provides a dedicated right sidebar/panel for:
 * - Task management (create, view, execute)
 * - Auto features (VibeCoder, analysis, refactoring)
 * - Content library (frameworks, prompts, templates)
 * - Analysis results and settings
 * - Event-driven communication with other components
 * 
 * @class SidebarRight
 */
import React, { useState } from 'react';
import AnalysisPanelComponent from './chat/sidebar-right/AnalysisPanelComponent.jsx';
import AutoPanelComponent from './chat/sidebar-right/AutoPanelComponent.jsx';
import FrameworksPanelComponent from './chat/sidebar-right/FrameworksPanelComponent.jsx';
import PromptsPanelComponent from './chat/sidebar-right/PromptsPanelComponent.jsx';
import TemplatesPanelComponent from './chat/sidebar-right/TemplatesPanelComponent.jsx';
import TasksPanelComponent from './chat/sidebar-right/TasksPanelComponent.jsx';
import '@/css/global/sidebar-right.css';

function SidebarRight({ eventBus, attachedPrompts, setAttachedPrompts, activePort }) {
  const [currentTab, setCurrentTab] = useState('tasks');
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="sidebar-right-content">
      <div className="panel-header">
        <div className="panel-tabs">
          <button className={`tab-btn${currentTab === 'tasks' ? ' active' : ''}`} onClick={() => setCurrentTab('tasks')}>🗂️ Tasks</button>
          <button className={`tab-btn${currentTab === 'auto' ? ' active' : ''}`} onClick={() => setCurrentTab('auto')}>🤖 Auto</button>
          <button className={`tab-btn${currentTab === 'frameworks' ? ' active' : ''}`} onClick={() => setCurrentTab('frameworks')}>🧩 Frameworks</button>
          <button className={`tab-btn${currentTab === 'prompts' ? ' active' : ''}`} onClick={() => setCurrentTab('prompts')}>💬 Prompts</button>
          <button className={`tab-btn${currentTab === 'templates' ? ' active' : ''}`} onClick={() => setCurrentTab('templates')}>📋 Templates</button>
          <button className={`tab-btn${currentTab === 'analysis' ? ' active' : ''}`} onClick={() => setCurrentTab('analysis')}>📊 Analysis</button>
          <button className={`tab-btn${currentTab === 'settings' ? ' active' : ''}`} onClick={() => setCurrentTab('settings')}>⚙️ Settings</button>
        </div>
        <button id="toggleSidebarRightBtn" className="btn-icon" title="Panel ein-/ausblenden" onClick={() => setIsVisible(v => !v)}>◀</button>
      </div>
      <div className="panel-content">
        {currentTab === 'tasks' && <TasksPanelComponent eventBus={eventBus} activePort={activePort} />}
        {currentTab === 'auto' && <AutoPanelComponent eventBus={eventBus} />}
        {currentTab === 'frameworks' && <FrameworksPanelComponent />}
        {currentTab === 'prompts' && <PromptsPanelComponent attachedPrompts={attachedPrompts} setAttachedPrompts={setAttachedPrompts} />}
        {currentTab === 'templates' && <TemplatesPanelComponent />}
        {currentTab === 'analysis' && <AnalysisPanelComponent />}
        {currentTab === 'settings' && <div className="settings-tab">Settings Panel (TODO)</div>}
      </div>
    </div>
  );
}

export default SidebarRight; 