import type { ExperimentStatus, TargetSurface, Variant } from "@crownx-jewel/shared-experiments";

export type Experiment = {
  id: string;
  name: string;
  targetSurface: TargetSurface;
  status: ExperimentStatus;
  hypothesis: string;
  variants: Variant[];
  startAt: string;
  endAt: string;
  successMetric: string;
  createdAt: string;
};

export type Exposure = {
  id: string;
  experimentId: string;
  subjectId: string;
  variantKey: string;
  createdAt: string;
};

export type Conversion = {
  id: string;
  experimentId: string;
  subjectId: string;
  variantKey: string;
  metricKey: string;
  value: number;
  createdAt: string;
};

const experiments: Experiment[] = [];
const exposures: Exposure[] = [];
const conversions: Conversion[] = [];

export const expRepo = {
  insertExperiment(e: Experiment) { experiments.push(e); return e; },
  findExperiment(id: string) { return experiments.find((e) => e.id === id) || null; },
  listExperiments() { return [...experiments].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); },
  listRunning() { return experiments.filter((e) => e.status === "running"); },
  updateExperiment(id: string, patch: Partial<Experiment>) {
    const e = experiments.find((x) => x.id === id);
    if (e) Object.assign(e, patch);
    return e || null;
  },

  insertExposure(e: Exposure) { exposures.push(e); return e; },
  exposuresFor(experimentId: string) { return exposures.filter((e) => e.experimentId === experimentId); },
  exposureForSubject(experimentId: string, subjectId: string) {
    return exposures.find((e) => e.experimentId === experimentId && e.subjectId === subjectId) || null;
  },

  insertConversion(c: Conversion) { conversions.push(c); return c; },
  conversionsFor(experimentId: string) {
    return conversions.filter((c) => c.experimentId === experimentId);
  }
};
