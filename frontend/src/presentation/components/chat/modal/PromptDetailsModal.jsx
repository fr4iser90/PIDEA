import React from 'react';
import '@/scss/components/_prompt-details-modal.scss';;

function PromptDetailsModal({ open, onClose, title, content }) {
  if (!open) return null;
  
  return (
    <div className="prompt-details-modal-overlay">
      <div className="prompt-details-modal">
        <div className="prompt-modal-header">
          <h3 className="prompt-modal-title">{title || 'Prompt Details'}</h3>
          <button className="prompt-modal-close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="prompt-modal-content">
          <pre className="prompt-content">{content || 'No content available'}</pre>
        </div>
      </div>
    </div>
  );
}

export default PromptDetailsModal;
