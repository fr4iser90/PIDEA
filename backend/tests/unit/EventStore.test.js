/**
 * EventStore Unit Tests
 *
 * Tests for event sourcing functionality
 */

const EventStore = require("@infrastructure/database/EventStore");
const { v4: uuidv4 } = require("uuid");

describe("EventStore", () => {
  let eventStore;
  let mockDatabaseConnection;

  beforeEach(() => {
    mockDatabaseConnection = {
      execute: jest.fn(),
      query: jest.fn(),
    };
    eventStore = new EventStore(mockDatabaseConnection);
  });

  describe("storeEvent", () => {
    it("should store an event successfully", async () => {
      const aggregateId = uuidv4();
      const eventData = { title: "Test Task", status: "pending" };
      const metadata = { source: "test" };

      mockDatabaseConnection.query.mockResolvedValueOnce([{ next_version: 1 }]);
      mockDatabaseConnection.execute.mockResolvedValueOnce({});

      const eventId = await eventStore.storeEvent(
        aggregateId,
        "Task",
        "Created",
        eventData,
        metadata,
        "user123",
      );

      expect(eventId).toBeDefined();
      expect(mockDatabaseConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO event_store"),
        expect.arrayContaining([
          expect.any(String), // eventId
          aggregateId,
          "Task",
          "Created",
          1, // eventVersion
          JSON.stringify(eventData),
          JSON.stringify(metadata),
          "user123",
          expect.any(String), // timestamp
          expect.any(String), // created_at
          null, // correlation_id
          null, // causation_id
        ]),
      );
    });

    it("should handle errors when storing events", async () => {
      const aggregateId = uuidv4();
      const eventData = { title: "Test Task" };

      mockDatabaseConnection.query.mockRejectedValueOnce(
        new Error("Database error"),
      );

      await expect(
        eventStore.storeEvent(aggregateId, "Task", "Created", eventData),
      ).rejects.toThrow("Failed to store event: Database error");
    });
  });

  describe("getEvents", () => {
    it("should retrieve events for an aggregate", async () => {
      const aggregateId = uuidv4();
      const mockEvents = [
        {
          id: uuidv4(),
          aggregate_id: aggregateId,
          aggregate_type: "Task",
          event_type: "Created",
          event_version: 1,
          event_data: JSON.stringify({ title: "Test Task" }),
          metadata: JSON.stringify({}),
          user_id: "user123",
          timestamp: new Date().toISOString(),
          created_at: new Date().toISOString(),
          correlation_id: null,
          causation_id: null,
        },
      ];

      mockDatabaseConnection.query.mockResolvedValueOnce(mockEvents);

      const events = await eventStore.getEvents(aggregateId);

      expect(events).toHaveLength(1);
      expect(events[0].aggregateId).toBe(aggregateId);
      expect(events[0].eventType).toBe("Created");
      expect(events[0].eventData).toEqual({ title: "Test Task" });
    });

    it("should retrieve events with version range", async () => {
      const aggregateId = uuidv4();
      const mockEvents = [];

      mockDatabaseConnection.query.mockResolvedValueOnce(mockEvents);

      await eventStore.getEvents(aggregateId, 2, 5);

      expect(mockDatabaseConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("event_version >= ?"),
        expect.arrayContaining([aggregateId, 2, 5]),
      );
    });
  });

  describe("getNextEventVersion", () => {
    it("should return next version number", async () => {
      const aggregateId = uuidv4();
      mockDatabaseConnection.query.mockResolvedValueOnce([{ next_version: 3 }]);

      const version = await eventStore.getNextEventVersion(aggregateId);

      expect(version).toBe(3);
    });

    it("should return 1 for new aggregate", async () => {
      const aggregateId = uuidv4();
      mockDatabaseConnection.query.mockResolvedValueOnce([{ next_version: 1 }]);

      const version = await eventStore.getNextEventVersion(aggregateId);

      expect(version).toBe(1);
    });
  });

  describe("createSnapshot", () => {
    it("should create a snapshot successfully", async () => {
      const aggregateId = uuidv4();
      const snapshotData = { title: "Test Task", status: "completed" };
      const metadata = { version: "1.0" };

      mockDatabaseConnection.query.mockResolvedValueOnce([{ next_version: 5 }]);
      mockDatabaseConnection.execute.mockResolvedValueOnce({});

      const snapshotId = await eventStore.createSnapshot(
        aggregateId,
        "Task",
        snapshotData,
        metadata,
      );

      expect(snapshotId).toBeDefined();
      expect(mockDatabaseConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO event_store_snapshots"),
        expect.arrayContaining([
          expect.any(String), // snapshotId
          aggregateId,
          "Task",
          5, // snapshotVersion
          JSON.stringify(snapshotData),
          JSON.stringify(metadata),
          expect.any(String), // created_at
        ]),
      );
    });
  });

  describe("getLatestSnapshot", () => {
    it("should retrieve latest snapshot", async () => {
      const aggregateId = uuidv4();
      const mockSnapshot = {
        id: uuidv4(),
        aggregate_id: aggregateId,
        aggregate_type: "Task",
        snapshot_version: 3,
        snapshot_data: JSON.stringify({ title: "Test Task" }),
        metadata: JSON.stringify({}),
        created_at: new Date().toISOString(),
      };

      mockDatabaseConnection.query.mockResolvedValueOnce([mockSnapshot]);

      const snapshot = await eventStore.getLatestSnapshot(aggregateId);

      expect(snapshot).toBeDefined();
      expect(snapshot.aggregateId).toBe(aggregateId);
      expect(snapshot.snapshotVersion).toBe(3);
      expect(snapshot.snapshotData).toEqual({ title: "Test Task" });
    });

    it("should return null when no snapshot exists", async () => {
      const aggregateId = uuidv4();
      mockDatabaseConnection.query.mockResolvedValueOnce([]);

      const snapshot = await eventStore.getLatestSnapshot(aggregateId);

      expect(snapshot).toBeNull();
    });
  });

  describe("replayEvents", () => {
    it("should replay events and reconstruct state", async () => {
      const aggregateId = uuidv4();
      const mockEvents = [
        {
          id: uuidv4(),
          aggregateId,
          aggregateType: "Task",
          eventType: "Created",
          eventVersion: 1,
          eventData: { title: "Test Task" },
          metadata: {},
          userId: "user123",
          timestamp: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          correlationId: null,
          causationId: null,
        },
        {
          id: uuidv4(),
          aggregateId,
          aggregateType: "Task",
          eventType: "Updated",
          eventVersion: 2,
          eventData: { status: "in_progress" },
          metadata: {},
          userId: "user123",
          timestamp: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          correlationId: null,
          causationId: null,
        },
      ];

      mockDatabaseConnection.query.mockResolvedValueOnce(mockEvents);

      const eventHandler = jest.fn((state, event) => {
        if (event.eventType === "Created") {
          return { ...state, ...event.eventData };
        } else if (event.eventType === "Updated") {
          return { ...state, ...event.eventData };
        }
        return state;
      });

      const initialState = {};
      const finalState = await eventStore.replayEvents(
        aggregateId,
        eventHandler,
        initialState,
      );

      expect(eventHandler).toHaveBeenCalledTimes(2);
      expect(finalState).toEqual({ title: "Test Task", status: "in_progress" });
    });
  });

  describe("getEventsByCorrelationId", () => {
    it("should retrieve events by correlation ID", async () => {
      const correlationId = uuidv4();
      const mockEvents = [
        {
          id: uuidv4(),
          aggregate_id: uuidv4(),
          aggregate_type: "Task",
          event_type: "Created",
          event_version: 1,
          event_data: JSON.stringify({ title: "Test Task" }),
          metadata: JSON.stringify({}),
          user_id: "user123",
          timestamp: new Date().toISOString(),
          created_at: new Date().toISOString(),
          correlation_id: correlationId,
          causation_id: null,
        },
      ];

      mockDatabaseConnection.query.mockResolvedValueOnce(mockEvents);

      const events = await eventStore.getEventsByCorrelationId(correlationId);

      expect(events).toHaveLength(1);
      expect(events[0].correlationId).toBe(correlationId);
    });
  });

  describe("getEventsByUserId", () => {
    it("should retrieve events by user ID with pagination", async () => {
      const userId = "user123";
      const mockEvents = [];

      mockDatabaseConnection.query.mockResolvedValueOnce(mockEvents);

      await eventStore.getEventsByUserId(userId, 50, 10);

      expect(mockDatabaseConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE user_id = ?"),
        expect.arrayContaining([userId, 50, 10]),
      );
    });
  });

  describe("getEventStatistics", () => {
    it("should retrieve event statistics", async () => {
      const mockStats = {
        total_events: 100,
        unique_aggregates: 50,
        unique_aggregate_types: 5,
        unique_event_types: 10,
        unique_users: 3,
        first_event: "2023-01-01T00:00:00.000Z",
        last_event: "2023-12-31T23:59:59.000Z",
      };

      mockDatabaseConnection.query.mockResolvedValueOnce([mockStats]);

      const stats = await eventStore.getEventStatistics();

      expect(stats).toEqual(mockStats);
    });
  });
});
