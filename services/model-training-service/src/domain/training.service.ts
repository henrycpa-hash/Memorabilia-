import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import {
  BASELINE_METRICS,
  type DatasetStatus,
  type LabelClass,
  type TrainingJobStatus,
  type ValidationMetrics
} from "@crownx-jewel/shared-model-training";

export type LabelEntry = {
  id: string;
  subjectType: string;
  subjectId: string;
  featureSnapshotId: string | null;
  labelClass: LabelClass;
  labeledByUserId: string | null;
  labelSource: "human_review" | "dispute_outcome" | "manual" | "import";
  notes: string | null;
  createdAt: string;
};

export type Dataset = {
  id: string;
  name: string;
  status: DatasetStatus;
  rowCount: number;
  labelMix: Record<LabelClass, number>;
  createdAt: string;
};

export type TrainingJob = {
  id: string;
  datasetId: string;
  modelName: string;
  candidateVersion: string;
  status: TrainingJobStatus;
  validationMetrics: ValidationMetrics | null;
  createdAt: string;
  completedAt: string | null;
};

export type CandidateModel = {
  id: string;
  trainingJobId: string;
  modelName: string;
  modelVersion: string;
  status: "candidate" | "promoted_challenger" | "promoted_champion" | "rejected";
  validationMetrics: ValidationMetrics;
  createdAt: string;
};

const labels: LabelEntry[] = [];
const datasets: Dataset[] = [];
const jobs: TrainingJob[] = [];
const candidates: CandidateModel[] = [];

export const trainingService = {
  // Labels
  async addLabel(input: {
    subjectType: string;
    subjectId: string;
    featureSnapshotId?: string;
    labelClass: LabelClass;
    labeledByUserId?: string;
    labelSource: LabelEntry["labelSource"];
    notes?: string;
  }): Promise<LabelEntry> {
    const l: LabelEntry = {
      id: newId(),
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      featureSnapshotId: input.featureSnapshotId || null,
      labelClass: input.labelClass,
      labeledByUserId: input.labeledByUserId || null,
      labelSource: input.labelSource,
      notes: input.notes || null,
      createdAt: nowIso()
    };
    labels.push(l);
    await publishOutbox({
      id: newId(),
      eventType: "training.label.added",
      aggregateId: l.id,
      aggregateType: "label",
      payload: l,
      occurredAt: nowIso()
    });
    return l;
  },

  // Datasets
  buildDataset(name: string): Dataset {
    const mix: Record<LabelClass, number> = {
      fraud_confirmed: 0,
      fraud_suspected: 0,
      legitimate: 0,
      ambiguous: 0
    };
    for (const l of labels) mix[l.labelClass] += 1;
    const ds: Dataset = {
      id: newId(),
      name,
      status: "ready",
      rowCount: labels.length,
      labelMix: mix,
      createdAt: nowIso()
    };
    datasets.push(ds);
    return ds;
  },

  // Training jobs
  async startTraining(input: { datasetId: string; modelName?: string; candidateVersion?: string }): Promise<TrainingJob | null> {
    const ds = datasets.find((d) => d.id === input.datasetId);
    if (!ds) return null;
    const job: TrainingJob = {
      id: newId(),
      datasetId: ds.id,
      modelName: input.modelName || "fraud-risk-linear",
      candidateVersion: input.candidateVersion || `v${Date.now()}`,
      status: "running",
      validationMetrics: null,
      createdAt: nowIso(),
      completedAt: null
    };
    jobs.push(job);
    return job;
  },

  /**
   * Wave 6 stub completion: produces deterministic-but-believable metrics
   * derived from the dataset's label mix. Wave 7 wires a real eval harness.
   */
  async completeTraining(jobId: string): Promise<{ job: TrainingJob; candidate: CandidateModel } | null> {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return null;
    const ds = datasets.find((d) => d.id === job.datasetId);
    const total = ds ? ds.rowCount : 0;
    const fraudShare = ds ? (ds.labelMix.fraud_confirmed + ds.labelMix.fraud_suspected) / Math.max(1, total) : 0;
    const metrics: ValidationMetrics = {
      precision: Number((BASELINE_METRICS.precision + fraudShare * 0.05).toFixed(4)),
      recall: Number((BASELINE_METRICS.recall + fraudShare * 0.07).toFixed(4)),
      f1: Number((BASELINE_METRICS.f1 + fraudShare * 0.06).toFixed(4)),
      rocAuc: Number((BASELINE_METRICS.rocAuc + fraudShare * 0.05).toFixed(4)),
      sampleSize: total
    };
    job.status = "succeeded";
    job.validationMetrics = metrics;
    job.completedAt = nowIso();

    const candidate: CandidateModel = {
      id: newId(),
      trainingJobId: job.id,
      modelName: job.modelName,
      modelVersion: job.candidateVersion,
      status: "candidate",
      validationMetrics: metrics,
      createdAt: nowIso()
    };
    candidates.push(candidate);

    await publishOutbox({
      id: newId(),
      eventType: "training.candidate.created",
      aggregateId: candidate.id,
      aggregateType: "candidate_model",
      payload: candidate,
      occurredAt: nowIso()
    });
    return { job, candidate };
  },

  promoteCandidate(id: string, target: "challenger" | "champion") {
    const c = candidates.find((x) => x.id === id);
    if (!c) return null;
    c.status = target === "challenger" ? "promoted_challenger" : "promoted_champion";
    return c;
  },

  rejectCandidate(id: string) {
    const c = candidates.find((x) => x.id === id);
    if (!c) return null;
    c.status = "rejected";
    return c;
  },

  listLabels: () => [...labels].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  labelMix: () => {
    const mix: Record<LabelClass, number> = {
      fraud_confirmed: 0,
      fraud_suspected: 0,
      legitimate: 0,
      ambiguous: 0
    };
    for (const l of labels) mix[l.labelClass] += 1;
    return mix;
  },
  listDatasets: () => [...datasets].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  listJobs: () => [...jobs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  listCandidates: () => [...candidates].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  findJob: (id: string) => jobs.find((j) => j.id === id) || null,
  findCandidate: (id: string) => candidates.find((c) => c.id === id) || null
};
