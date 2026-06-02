import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import { assignVariant, type TargetSurface, type Variant } from "@crownx-jewel/shared-experiments";
import { expRepo, type Experiment } from "../repo/exp.repo";

export const expService = {
  create(input: {
    name: string;
    targetSurface: TargetSurface;
    hypothesis: string;
    variants: Variant[];
    startAt: string;
    endAt: string;
    successMetric: string;
  }): Experiment {
    const e: Experiment = {
      id: newId(),
      name: input.name,
      targetSurface: input.targetSurface,
      status: "draft",
      hypothesis: input.hypothesis,
      variants: input.variants,
      startAt: input.startAt,
      endAt: input.endAt,
      successMetric: input.successMetric,
      createdAt: nowIso()
    };
    expRepo.insertExperiment(e);
    return e;
  },

  start(id: string) { return expRepo.updateExperiment(id, { status: "running" }); },
  pause(id: string) { return expRepo.updateExperiment(id, { status: "paused" }); },
  complete(id: string) { return expRepo.updateExperiment(id, { status: "completed" }); },

  /**
   * Assign a subject to a variant. Sticky: the same subject always gets the
   * same variant for the same experiment. Persists the exposure on first call.
   */
  async expose(input: { experimentId: string; subjectId: string }) {
    const e = expRepo.findExperiment(input.experimentId);
    if (!e) return null;

    const existing = expRepo.exposureForSubject(input.experimentId, input.subjectId);
    if (existing) return existing;

    const assignment = assignVariant({
      experimentId: input.experimentId,
      subjectId: input.subjectId,
      variants: e.variants
    });
    const exposure = {
      id: newId(),
      experimentId: assignment.experimentId,
      subjectId: assignment.subjectId,
      variantKey: assignment.variantKey,
      createdAt: nowIso()
    };
    expRepo.insertExposure(exposure);

    await publishOutbox({
      id: newId(),
      eventType: "experiment.exposed",
      aggregateId: exposure.id,
      aggregateType: "exposure",
      payload: exposure,
      occurredAt: nowIso()
    });
    return exposure;
  },

  /** Record a conversion event for a subject who was previously exposed. */
  async convert(input: {
    experimentId: string;
    subjectId: string;
    metricKey: string;
    value?: number;
  }) {
    const exposure = expRepo.exposureForSubject(input.experimentId, input.subjectId);
    if (!exposure) return null;
    const conversion = {
      id: newId(),
      experimentId: input.experimentId,
      subjectId: input.subjectId,
      variantKey: exposure.variantKey,
      metricKey: input.metricKey,
      value: input.value ?? 1,
      createdAt: nowIso()
    };
    expRepo.insertConversion(conversion);
    await publishOutbox({
      id: newId(),
      eventType: "experiment.converted",
      aggregateId: conversion.id,
      aggregateType: "conversion",
      payload: conversion,
      occurredAt: nowIso()
    });
    return conversion;
  },

  /** Per-variant rollup of exposures and conversions. */
  results(experimentId: string) {
    const e = expRepo.findExperiment(experimentId);
    if (!e) return null;
    const exposures = expRepo.exposuresFor(experimentId);
    const conversions = expRepo.conversionsFor(experimentId);
    const byVariant: Record<string, { exposures: number; conversions: number; rate: number }> = {};
    for (const v of e.variants) {
      byVariant[v.key] = { exposures: 0, conversions: 0, rate: 0 };
    }
    for (const ex of exposures) {
      if (byVariant[ex.variantKey]) byVariant[ex.variantKey].exposures += 1;
    }
    for (const c of conversions) {
      if (byVariant[c.variantKey]) byVariant[c.variantKey].conversions += 1;
    }
    for (const k of Object.keys(byVariant)) {
      const b = byVariant[k];
      b.rate = b.exposures > 0 ? b.conversions / b.exposures : 0;
    }
    return {
      experimentId,
      successMetric: e.successMetric,
      totalExposures: exposures.length,
      totalConversions: conversions.length,
      byVariant
    };
  },

  list: () => expRepo.listExperiments(),
  listRunning: () => expRepo.listRunning(),
  findById: (id: string) => expRepo.findExperiment(id)
};
