class GetChatHistoryQuery {
  constructor(sessionId = null, limit = 100, offset = 0) {
    this.sessionId = sessionId;
    this.limit = limit;
    this.offset = offset;
  }

  validate() {
    if (this.limit < 1 || this.limit > 1000) {
      throw new Error('Limit must be between 1 and 1000');
    }
    
    if (this.offset < 0) {
      throw new Error('Offset must be non-negative');
    }
  }
}

module.exports = GetChatHistoryQuery; 