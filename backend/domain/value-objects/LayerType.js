/**
 * LayerType - Value Object for Layer Types
 * Defines the standard architectural layer types in the system
 */

class LayerType {
  constructor(value) {
    if (!LayerType.isValid(value)) {
      throw new Error(`Invalid layer type: ${value}`);
    }
    this.value = value;
  }

  static DOMAIN = "domain";
  static APPLICATION = "application";
  static INFRASTRUCTURE = "infrastructure";
  static PRESENTATION = "presentation";

  static getAllTypes() {
    return [
      LayerType.DOMAIN,
      LayerType.APPLICATION,
      LayerType.INFRASTRUCTURE,
      LayerType.PRESENTATION,
    ];
  }

  static isValid(value) {
    return LayerType.getAllTypes().includes(value);
  }

  static getDefault() {
    return LayerType.DOMAIN;
  }

  equals(other) {
    return other instanceof LayerType && this.value === other.value;
  }

  toString() {
    return this.value;
  }

  getDescription() {
    const descriptions = {
      [LayerType.DOMAIN]: "Core business logic and domain entities",
      [LayerType.APPLICATION]: "Application services and use cases",
      [LayerType.INFRASTRUCTURE]:
        "Database, external services, and technical concerns",
      [LayerType.PRESENTATION]: "User interface and API controllers",
    };
    return descriptions[this.value] || "Unknown layer type";
  }

  getOrderIndex() {
    const orderIndices = {
      [LayerType.DOMAIN]: 1,
      [LayerType.APPLICATION]: 2,
      [LayerType.INFRASTRUCTURE]: 3,
      [LayerType.PRESENTATION]: 4,
    };
    return orderIndices[this.value] || 0;
  }

  getDependencies() {
    const dependencies = {
      [LayerType.DOMAIN]: [],
      [LayerType.APPLICATION]: [LayerType.DOMAIN],
      [LayerType.INFRASTRUCTURE]: [LayerType.DOMAIN, LayerType.APPLICATION],
      [LayerType.PRESENTATION]: [
        LayerType.APPLICATION,
        LayerType.INFRASTRUCTURE,
      ],
    };
    return dependencies[this.value] || [];
  }

  canDependOn(targetLayerType) {
    if (!(targetLayerType instanceof LayerType)) {
      targetLayerType = new LayerType(targetLayerType);
    }
    return this.getDependencies().includes(targetLayerType.value);
  }

  getTaskCategories() {
    const categories = {
      [LayerType.DOMAIN]: ["domain", "entity", "value-object", "service"],
      [LayerType.APPLICATION]: ["application", "service", "handler", "command"],
      [LayerType.INFRASTRUCTURE]: [
        "infrastructure",
        "repository",
        "database",
        "external",
      ],
      [LayerType.PRESENTATION]: ["presentation", "controller", "api", "ui"],
    };
    return categories[this.value] || [];
  }

  getTaskTypes() {
    const types = {
      [LayerType.DOMAIN]: ["feature", "refactor", "analysis"],
      [LayerType.APPLICATION]: ["feature", "refactor", "testing"],
      [LayerType.INFRASTRUCTURE]: [
        "feature",
        "refactor",
        "testing",
        "deployment",
      ],
      [LayerType.PRESENTATION]: ["feature", "refactor", "testing", "ui"],
    };
    return types[this.value] || [];
  }
}

module.exports = LayerType;
