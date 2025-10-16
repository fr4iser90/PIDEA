/**
 * PortConfiguration Value Object
 * Represents IDE port configuration with validation
 */
export class PortConfiguration {
  constructor(port, host = 'localhost') {
    if (!port || typeof port !== 'number' || port < 1 || port > 65535) {
      throw new Error('Port must be a valid number between 1 and 65535');
    }
    
    if (!host || typeof host !== 'string') {
      throw new Error('Host must be a non-empty string');
    }
    
    this._port = port;
    this._host = host;
  }

  get port() {
    return this._port;
  }

  get host() {
    return this._host;
  }

  get url() {
    return `http://${this._host}:${this._port}`;
  }

  equals(other) {
    return other instanceof PortConfiguration && 
           this._port === other._port && 
           this._host === other._host;
  }

  toString() {
    return `${this._host}:${this._port}`;
  }

  static fromString(configString) {
    const [host, port] = configString.split(':');
    return new PortConfiguration(parseInt(port), host);
  }

  static fromObject(config) {
    return new PortConfiguration(config.port, config.host);
  }
}
