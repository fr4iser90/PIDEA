/**
 * LazyServiceLoader Unit Tests
 * Tests lazy loading functionality, dependency tracking, and performance metrics
 */
const LazyServiceLoader = require("../../infrastructure/dependency-injection/LazyServiceLoader");
const ServiceLogger = require("@logging/ServiceLogger");

describe("LazyServiceLoader", () => {
  let lazyLoader;
  let mockContainer;
  let logger;

  beforeEach(() => {
    logger = new ServiceLogger("LazyServiceLoaderTest");
    mockContainer = {
      resolve: jest.fn(),
      factories: new Map(),
      singletons: new Map(),
    };
    lazyLoader = new LazyServiceLoader(mockContainer, { logger });
  });

  afterEach(async () => {
    await lazyLoader.shutdown();
  });

  describe("Service Registration", () => {
    test("should register a lazy service", () => {
      const factory = jest.fn(() => ({ name: "test" }));
      const dependencies = ["dep1", "dep2"];

      lazyLoader.registerLazyService("testService", factory, dependencies);

      expect(lazyLoader.isLazyService("testService")).toBe(true);
      expect(lazyLoader.getLazyServices().has("testService")).toBe(true);
    });

    test("should not register service when lazy loading is disabled", () => {
      lazyLoader.enableLazyLoading = false;
      const factory = jest.fn(() => ({ name: "test" }));

      lazyLoader.registerLazyService("testService", factory, []);

      expect(lazyLoader.isLazyService("testService")).toBe(false);
    });

    test("should emit serviceRegistered event", () => {
      const factory = jest.fn(() => ({ name: "test" }));
      const eventSpy = jest.fn();
      
      lazyLoader.on("serviceRegistered", eventSpy);
      lazyLoader.registerLazyService("testService", factory, []);

      expect(eventSpy).toHaveBeenCalledWith({
        serviceName: "testService",
        dependencies: [],
      });
    });
  });

  describe("Service Resolution", () => {
    test("should resolve lazy service", () => {
      const factory = jest.fn(() => ({ name: "test", value: 42 }));
      lazyLoader.registerLazyService("testService", factory, []);

      const service = lazyLoader.resolve("testService");

      expect(service).toBeDefined();
      expect(service.name).toBe("test");
      expect(service.value).toBe(42);
      expect(factory).toHaveBeenCalled();
    });

    test("should resolve dependencies before creating service", () => {
      const depFactory = jest.fn(() => ({ name: "dependency" }));
      const serviceFactory = jest.fn((dep) => ({ name: "service", dep }));
      
      lazyLoader.registerLazyService("dependency", depFactory, []);
      lazyLoader.registerLazyService("testService", serviceFactory, ["dependency"]);

      const service = lazyLoader.resolve("testService");

      expect(service).toBeDefined();
      expect(service.name).toBe("service");
      expect(service.dep.name).toBe("dependency");
    });

    test("should cache resolved services", () => {
      const factory = jest.fn(() => ({ name: "test" }));
      lazyLoader.registerLazyService("testService", factory, []);

      const service1 = lazyLoader.resolve("testService");
      const service2 = lazyLoader.resolve("testService");

      expect(service1).toBe(service2);
      expect(factory).toHaveBeenCalledTimes(1);
    });

    test("should detect circular dependencies", () => {
      const factory1 = jest.fn(() => ({ name: "service1" }));
      const factory2 = jest.fn(() => ({ name: "service2" }));
      
      lazyLoader.registerLazyService("service1", factory1, ["service2"]);
      lazyLoader.registerLazyService("service2", factory2, ["service1"]);

      expect(() => lazyLoader.resolve("service1")).toThrow("Circular dependency detected");
    });

    test("should enforce maximum resolution depth", () => {
      lazyLoader.maxResolutionDepth = 2;
      const factory = jest.fn(() => ({ name: "test" }));
      
      lazyLoader.registerLazyService("service1", factory, ["service2"]);
      lazyLoader.registerLazyService("service2", factory, ["service3"]);
      lazyLoader.registerLazyService("service3", factory, ["service4"]);

      expect(() => lazyLoader.resolve("service1")).toThrow("Maximum resolution depth exceeded");
    });

    test("should fall back to container resolution for non-lazy services", () => {
      const containerService = { name: "container" };
      mockContainer.resolve.mockReturnValue(containerService);

      const service = lazyLoader.resolve("containerService");

      expect(service).toBe(containerService);
      expect(mockContainer.resolve).toHaveBeenCalledWith("containerService");
    });
  });

  describe("Service Preloading", () => {
    test("should preload multiple services", async () => {
      const factory1 = jest.fn(() => ({ name: "service1" }));
      const factory2 = jest.fn(() => ({ name: "service2" }));
      
      lazyLoader.registerLazyService("service1", factory1, []);
      lazyLoader.registerLazyService("service2", factory2, []);

      const results = await lazyLoader.preloadServices(["service1", "service2"]);

      expect(results.successful).toHaveLength(2);
      expect(results.failed).toHaveLength(0);
      expect(results.totalTime).toBeGreaterThan(0);
    });

    test("should handle preload failures", async () => {
      const factory = jest.fn(() => { throw new Error("Service creation failed"); });
      lazyLoader.registerLazyService("failingService", factory, []);

      const results = await lazyLoader.preloadServices(["failingService"]);

      expect(results.successful).toHaveLength(0);
      expect(results.failed).toHaveLength(1);
      expect(results.failed[0].serviceName).toBe("failingService");
    });
  });

  describe("Dependency Information", () => {
    test("should get service dependencies", () => {
      lazyLoader.registerLazyService("testService", jest.fn(), ["dep1", "dep2"]);

      const deps = lazyLoader.getServiceDependencies("testService");

      expect(deps.serviceName).toBe("testService");
      expect(deps.dependencies).toEqual(["dep1", "dep2"]);
      expect(deps.dependencyCount).toBe(2);
    });

    test("should get transitive dependencies", () => {
      lazyLoader.registerLazyService("dep1", jest.fn(), []);
      lazyLoader.registerLazyService("dep2", jest.fn(), ["dep1"]);
      lazyLoader.registerLazyService("testService", jest.fn(), ["dep2"]);

      const deps = lazyLoader.getServiceDependencies("testService");

      expect(deps.transitiveDependencies).toContain("dep1");
      expect(deps.transitiveDependencies).toContain("dep2");
    });
  });

  describe("Performance Metrics", () => {
    test("should track resolution metrics", () => {
      const factory = jest.fn(() => ({ name: "test" }));
      lazyLoader.registerLazyService("testService", factory, []);

      lazyLoader.resolve("testService");

      const metrics = lazyLoader.getMetrics();
      expect(metrics.totalResolutions).toBe(1);
      expect(metrics.cacheMisses).toBe(1);
      expect(metrics.cacheHits).toBe(0);
    });

    test("should track cache hits", () => {
      const factory = jest.fn(() => ({ name: "test" }));
      lazyLoader.registerLazyService("testService", factory, []);

      lazyLoader.resolve("testService");
      lazyLoader.resolve("testService");

      const metrics = lazyLoader.getMetrics();
      expect(metrics.totalResolutions).toBe(2);
      expect(metrics.cacheHits).toBe(1);
      expect(metrics.cacheMisses).toBe(1);
    });

    test("should calculate cache hit rate", () => {
      const factory = jest.fn(() => ({ name: "test" }));
      lazyLoader.registerLazyService("testService", factory, []);

      lazyLoader.resolve("testService");
      lazyLoader.resolve("testService");

      const metrics = lazyLoader.getMetrics();
      expect(metrics.cacheHitRate).toBe(50);
    });
  });

  describe("Cache Management", () => {
    test("should clear cache for specific service", () => {
      const factory = jest.fn(() => ({ name: "test" }));
      lazyLoader.registerLazyService("testService", factory, []);

      lazyLoader.resolve("testService");
      lazyLoader.clearCache("testService");

      const service = lazyLoader.resolve("testService");
      expect(factory).toHaveBeenCalledTimes(2);
    });

    test("should clear all cache", () => {
      const factory = jest.fn(() => ({ name: "test" }));
      lazyLoader.registerLazyService("testService", factory, []);

      lazyLoader.resolve("testService");
      lazyLoader.clearCache();

      const service = lazyLoader.resolve("testService");
      expect(factory).toHaveBeenCalledTimes(2);
    });
  });

  describe("Lifecycle Management", () => {
    test("should execute lifecycle hooks", () => {
      const onStart = jest.fn();
      const factory = jest.fn(() => ({ name: "test" }));
      
      lazyLoader.registerLazyService("testService", factory, [], {
        lifecycle: { onStart },
      });

      lazyLoader.resolve("testService");

      expect(onStart).toHaveBeenCalled();
    });

    test("should handle lifecycle hook errors gracefully", () => {
      const onStart = jest.fn().mockImplementation(() => {
        throw new Error("Lifecycle hook failed");
      });
      const factory = jest.fn(() => ({ name: "test" }));
      
      lazyLoader.registerLazyService("testService", factory, [], {
        lifecycle: { onStart },
      });

      expect(() => lazyLoader.resolve("testService")).not.toThrow();
      expect(onStart).toHaveBeenCalled();
    });
  });

  describe("Shutdown", () => {
    test("should shutdown gracefully", async () => {
      const onStop = jest.fn();
      const factory = jest.fn(() => ({ name: "test" }));
      
      lazyLoader.registerLazyService("testService", factory, [], {
        lifecycle: { onStop },
      });

      lazyLoader.resolve("testService");
      await lazyLoader.shutdown();

      expect(onStop).toHaveBeenCalled();
      expect(lazyLoader.getLazyServices().size).toBe(0);
    });
  });
});
