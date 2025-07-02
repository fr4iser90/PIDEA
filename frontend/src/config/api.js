// Central API configuration
const API_CONFIG = {
  baseURL: process.env.NODE_ENV === 'production' 
    ? 'http://localhost:3000' 
    : 'http://localhost:3000',
  wsURL: process.env.NODE_ENV === 'production'
    ? 'ws://localhost:3000'
    : 'ws://localhost:3000'
};

export default API_CONFIG; 