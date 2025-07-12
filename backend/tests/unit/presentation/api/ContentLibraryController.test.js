const ContentLibraryController = require('@api/ContentLibraryController');
const fs = require('fs').promises;
const path = require('path');

// Mock fs.promises
jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    readFile: jest.fn()
  }
}));

describe('ContentLibraryController', () => {
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

  // Die Datei wird in mehrere kleinere Testdateien aufgeteilt, wie oben beschrieben.
});