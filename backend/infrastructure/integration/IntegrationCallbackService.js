/**
 * Outbound webhooks to AgentLayer (or any consumer) when integration jobs
 * finish or fail. Subscribes to queue lifecycle events.
 */

const crypto = require("crypto");
const axios = require("axios");
const Logger = require("@logging/Logger");
const IntegrationWebhookConfig = require("./IntegrationWebhookConfig");

class IntegrationCallbackService {
  constructor({ taskRepository, logger }) {
    this.taskRepository = taskRepository;
    this.logger = logger || new Logger("IntegrationCallbackService");
  }

  subscribe(eventBus) {
    if (!eventBus) {
      this.logger.warn("IntegrationCallbackService: no event bus");
      return;
    }

    eventBus.subscribe("queue:item:updated", (data) =>
      this._onQueueItemUpdated(data).catch((err) =>
        this.logger.error("Integration callback failed", {
          message: err.message,
        }),
      ),
    );

    eventBus.subscribe("queue:item:cancelled", (data) =>
      this._onQueueItemCancelled(data).catch((err) =>
        this.logger.error("Integration cancel callback failed", {
          message: err.message,
        }),
      ),
    );
  }

  async _onQueueItemUpdated(data) {
    const { projectId, item } = data || {};
    if (!item || !["completed", "failed"].includes(item.status)) {
      return;
    }

    const taskId =
      item.options?.taskId ||
      item.context?.taskId ||
      item.context?.task?.id;
    if (!taskId) return;

    const task = await this.taskRepository.findById(taskId);
    if (!task || !task.metadata?.integration) return;

    const event =
      item.status === "completed"
        ? "job.completed"
        : "job.failed";

    await this._postPayload({
      event,
      project_id: projectId,
      job_id: taskId,
      queue_item_id: item.id,
      status: item.status === "completed" ? "success" : "failed",
      correlation: task.metadata.integration.correlation || {},
      payload: {
        task_status: task.status?.value || task.status,
      },
    });
  }

  async _onQueueItemCancelled(data) {
    const { projectId, item, itemId } = data || {};
    const queueItem = item || {};
    const taskId =
      queueItem.options?.taskId ||
      queueItem.context?.taskId ||
      queueItem.context?.task?.id;
    if (!taskId) return;

    const task = await this.taskRepository.findById(taskId);
    if (!task || !task.metadata?.integration) return;

    await this._postPayload({
      event: "job.canceled",
      project_id: projectId,
      job_id: taskId,
      queue_item_id: itemId || queueItem.id,
      status: "canceled",
      correlation: task.metadata.integration.correlation || {},
      payload: {},
    });
  }

  async _postPayload(body) {
    const url = IntegrationWebhookConfig.getCallbackUrl();
    const secret = IntegrationWebhookConfig.getCallbackSecret();
    if (!url) {
      return;
    }

    const raw = JSON.stringify(body);
    const sig = secret
      ? `sha256=${crypto.createHmac("sha256", secret).update(raw).digest("hex")}`
      : null;

    const headers = {
      "Content-Type": "application/json",
      "User-Agent": "PIDEA-Integration/1.0",
    };
    if (sig) {
      headers["X-PIDEA-Signature"] = sig;
    }

    try {
      const response = await axios.post(url, body, {
        headers,
        timeout: 15000,
        validateStatus: () => true,
      });
      this.logger.info("Integration webhook dispatched", {
        event: body.event,
        job_id: body.job_id,
        status: response.status,
      });
    } catch (err) {
      this.logger.error("Integration webhook request failed", {
        message: err.message,
        event: body.event,
        job_id: body.job_id,
      });
    }
  }
}

module.exports = IntegrationCallbackService;
