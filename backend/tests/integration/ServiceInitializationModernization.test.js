/**
 * Service Initialization Modernization - Integration Test
 * Tests the integration of modern service management components
 */
const { getServiceContainer } = require("../infrastructure/dependency-injection/ServiceContainer");
const ServiceLogger = require("@logging/ServiceLogger");

describe("Service Initialization Modernization Integration", () => {
  let serviceContainer;
  let logger;

  beforeAll(() => {
    logger = new ServiceLogger("ServiceInitializationTest");
    serviceContainer = getServiceContainer();
  });

  afterAll(async () => {
    await serviceContainer.gracefulShutdown();
  });

  test("should initialize modern service management components", () => {
    expect(serviceContainer.lazyLoader).toBeDefined();
    expect(serviceContainer.healthMonitor).toBeDefined();
    expect(serviceContainer.metrics).toBeDefined();
    expect(serviceContainer.serviceFactory).toBeDefined();
    expect(serviceContainer.serviceDiscovery).toBeDefined();
    expect(serviceContainer.lifecycleManager).toBeDefined();
  });

  test("should enable modern service management features", () => {
    serviceContainer.setLazyLoading(true);
    serviceContainer.setHealthMonitoring(true);
    serviceContainer.setMetricsCollection(true);
    serviceContainer.setAutoDiscovery(true);
    serviceContainer.setLifecycleManagement(true);

    expect(serviceContainer.enableLazyLoading).toBe(true);
    expect(serviceContainer.enableHealthMonitoring).toBe(true);
    expect(serviceContainer.enableMetricsCollection).toBe(true);
    expect(serviceContainer.enableAutoDiscovery).toBe(true);
    expect(serviceContainer.enableLifecycleManagement).toBe(true);
  });

  test("should register a service with modern features", () => {
    const testServiceFactory = () => ({ name: "test", value: 42 });
    
    serviceContainer.register("testService", testServiceFactory, {
      singleton: true,
      lazy: true,
      dependencies: [],
      lifecycle: {
        onStart: jest.fn(),
        onStop: jest.fn(),
      },
      healthCheck: jest.fn().mockResolvedValue({ status: "healthy" }),
    });

    expect(serviceContainer.factories.has("testService")).toBe(true);
    expect(serviceContainer.lazyLoader.isLazyService("testService")).toBe(true);
  });

  test("should resolve lazy service", () => {
    const service = serviceContainer.resolve("testService");
    
    expect(service).toBeDefined();
    expect(service.name).toBe("test");
    expect(service.value).toBe(42);
  });

  test("should get modern service status", () => {
    const status = serviceContainer.getModernServiceStatus();
    
    expect(status).toBeDefined();
    expect(status.lazyLoading).toBeDefined();
    expect(status.healthMonitoring).toBeDefined();
    expect(status.metricsCollection).toBeDefined();
    expect(status.autoDiscovery).toBeDefined();
    expect(status.lifecycleManagement).toBeDefined();
  });

  test("should get service health status", () => {
    const health = serviceContainer.getServiceHealth("testService");
    
    expect(health).toBeDefined();
    expect(health.status).toBeDefined();
  });

  test("should get service metrics", () => {
    const metrics = serviceContainer.getServiceMetrics("testService");
    
    expect(metrics).toBeDefined();
  });

  test("should get service lifecycle information", () => {
    const lifecycle = serviceContainer.getServiceLifecycle("testService");
    
    expect(lifecycle).toBeDefined();
  });

  test("should scan for services", async () => {
    const scanResults = await serviceContainer.scanForServices();
    
    expect(scanResults).toBeDefined();
    expect(scanResults.services).toBeDefined();
    expect(Array.isArray(scanResults.services)).toBe(true);
    expect(scanResults.errors).toBeDefined();
    expect(Array.isArray(scanResults.errors)).toBe(true);
  });

  test("should perform graceful shutdown", async () => {
    await expect(serviceContainer.gracefulShutdown()).resolves.not.toThrow();
  });
});
