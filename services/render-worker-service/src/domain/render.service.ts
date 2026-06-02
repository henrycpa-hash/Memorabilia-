import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import {
  renderJobRepo,
  type RenderJob,
  type RenderTemplateKey
} from "../repo/render-job.repo";

/**
 * Wave 4 stub renderer. Synthesizes a deterministic-looking output URL based
 * on the template + asset. Wave 5 swaps this for a real Puppeteer/Resvg-based
 * worker that produces actual PNGs to S3/MinIO.
 */
function stubRender(input: {
  templateKey: RenderTemplateKey;
  assetId: string;
  payload: Record<string, unknown>;
}): { outputUrl: string } {
  const slug = String(input.payload.slug || input.assetId).slice(0, 24);
  return {
    outputUrl: `/rendered/${input.templateKey}/${slug}.png`
  };
}

export const renderService = {
  async enqueue(input: {
    assetId: string;
    templateKey: RenderTemplateKey;
    payload?: Record<string, unknown>;
  }): Promise<RenderJob> {
    const j: RenderJob = {
      id: newId(),
      assetId: input.assetId,
      templateKey: input.templateKey,
      payloadJson: input.payload || {},
      status: "queued",
      outputUrl: null,
      errorMessage: null,
      createdAt: nowIso(),
      completedAt: null
    };
    renderJobRepo.insert(j);

    await publishOutbox({
      id: newId(),
      eventType: "render.job.queued",
      aggregateId: j.id,
      aggregateType: "render_job",
      payload: { jobId: j.id, templateKey: j.templateKey, assetId: j.assetId },
      occurredAt: nowIso()
    });
    return j;
  },

  /**
   * Tick the render worker — drains every queued job through the stub renderer.
   * In Wave 5 this becomes a real worker loop with retries + backoff.
   */
  async runJobs(): Promise<{ completed: number; failed: number }> {
    let completed = 0;
    let failed = 0;
    for (const j of renderJobRepo.listQueued()) {
      renderJobRepo.update(j.id, { status: "rendering" });
      try {
        const result = stubRender({
          templateKey: j.templateKey,
          assetId: j.assetId,
          payload: j.payloadJson
        });
        renderJobRepo.update(j.id, {
          status: "completed",
          outputUrl: result.outputUrl,
          completedAt: nowIso()
        });
        await publishOutbox({
          id: newId(),
          eventType: "render.job.completed",
          aggregateId: j.id,
          aggregateType: "render_job",
          payload: {
            jobId: j.id,
            templateKey: j.templateKey,
            assetId: j.assetId,
            outputUrl: result.outputUrl
          },
          occurredAt: nowIso()
        });
        completed += 1;
      } catch (err) {
        renderJobRepo.update(j.id, {
          status: "failed",
          errorMessage: String(err),
          completedAt: nowIso()
        });
        failed += 1;
      }
    }
    return { completed, failed };
  },

  list() {
    return renderJobRepo.list();
  },
  findById(id: string) {
    return renderJobRepo.findById(id);
  },
  listForAsset(assetId: string) {
    return renderJobRepo.listForAsset(assetId);
  }
};
