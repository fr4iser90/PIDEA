import React from 'react';

function PromptDetailsModal({ open, onClose, title, content }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-gray-900 rounded-lg shadow-lg max-w-lg w-full p-6 relative">
        <button className="absolute top-2 right-2 text-gray-400 hover:text-white text-xl" onClick={onClose}>&times;</button>
        <h3 className="font-bold text-lg mb-4 text-blue-300">{title}</h3>
        <pre className="whitespace-pre-wrap text-sm text-gray-200 max-h-96 overflow-y-auto">{content}</pre>
      </div>
    </div>
  );
}

export default PromptDetailsModal;
