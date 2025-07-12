const ContentLibraryController = require('@api/ContentLibraryController');
const fs = require('fs').promises;

jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    readFile: jest.fn()
  }
}));

describe('ContentLibraryController Templates', () => {
  let controller;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    controller = new ContentLibraryController();
    mockReq = { params: {}, query: {} };
    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
  });

  // getFrameworkTemplates
  // ... (kopiere alle Tests für getFrameworkTemplates)

  // getTemplates
  // ... (kopiere alle Tests für getTemplates)

  // getTemplatesByCategory
  // ... (kopiere alle Tests für getTemplatesByCategory)

  // getTemplateFile
  // ... (kopiere alle Tests für getTemplateFile)

  // getFrameworkTemplateFile
  // ... (kopiere alle Tests für getFrameworkTemplateFile)
}); 