/**
 * AnalysisCategory Value Object
 * Represents the category of analysis with validation
 */
export class AnalysisCategory {
  constructor(value) {
    if (!value || typeof value !== 'string') {
      throw new Error('AnalysisCategory must be a non-empty string');
    }
    
    if (!this.isValidCategory(value)) {
      throw new Error(`Invalid analysis category: ${value}`);
    }
    
    this._value = value;
  }

  get value() {
    return this._value;
  }

  equals(other) {
    return other instanceof AnalysisCategory && this._value === other._value;
  }

  toString() {
    return this._value;
  }

  isValidCategory(value) {
    const validCategories = [
      'security',
      'performance',
      'architecture',
      'codeQuality',
      'dependencies',
      'manifest',
      'techStack'
    ];
    return validCategories.includes(value);
  }

  static SECURITY = new AnalysisCategory('security');
  static PERFORMANCE = new AnalysisCategory('performance');
  static ARCHITECTURE = new AnalysisCategory('architecture');
  static CODE_QUALITY = new AnalysisCategory('codeQuality');
  static DEPENDENCIES = new AnalysisCategory('dependencies');
  static MANIFEST = new AnalysisCategory('manifest');
  static TECH_STACK = new AnalysisCategory('techStack');

  static fromString(value) {
    return new AnalysisCategory(value);
  }

  static getAll() {
    return [
      AnalysisCategory.SECURITY,
      AnalysisCategory.PERFORMANCE,
      AnalysisCategory.ARCHITECTURE,
      AnalysisCategory.CODE_QUALITY,
      AnalysisCategory.DEPENDENCIES,
      AnalysisCategory.MANIFEST,
      AnalysisCategory.TECH_STACK
    ];
  }
}
