import React, { useState } from 'react';

const FrameworkModalComponent = ({ framework, onClose }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(framework ? getFrameworkContent(framework.name) : '');

  if (!framework) return null;

  function getFrameworkContent(name) {
    if (name === 'doc-general.md') return '# General Framework\n\n- Accessibility\n- Performance';
    if (name === 'doc-code.md') return '# Code Framework\n\n- Clean Code\n- Tests';
    return '# Custom Framework\n\n- Custom Rules';
  }

  const handleEdit = () => {
    if (isEditing) {
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  };

  const handleDelete = () => {
    if (window.confirm('Framework wirklich löschen?')) {
      onClose();
    }
  };

  return (
    <div className="framework-modal-overlay">
      <div className="framework-modal">
        <div className="framework-modal-header">
          <span>{framework.name}</span>
          <button id="closeFrameworkModal" onClick={onClose}>×</button>
        </div>
        <div className="framework-modal-content">
          {isEditing ? (
            <textarea id="frameworkEditArea" rows={16} value={content} onChange={e => setContent(e.target.value)} />
          ) : (
            <pre>{content}</pre>
          )}
        </div>
        <div className="framework-modal-actions">
          <button id="editFrameworkBtn" onClick={handleEdit}>{isEditing ? 'Speichern' : 'Bearbeiten'}</button>
          <button id="deleteFrameworkBtn" onClick={handleDelete}>Löschen</button>
        </div>
      </div>
    </div>
  );
};

export default FrameworkModalComponent; 