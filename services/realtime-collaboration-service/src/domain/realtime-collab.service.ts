import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";

export type WorkspaceType = "redline_workspace" | "diligence_workspace" | "regulator_response" | "incident_war_room";

export type SessionStatus = "open" | "paused" | "checkpoint_published" | "closed";

export type PresenceState = "active" | "idle" | "away" | "left";

export type CollabEventType =
  | "session_started"
  | "presence_joined"
  | "presence_updated"
  | "presence_left"
  | "operation_applied"
  | "operation_rejected"
  | "checkpoint_published"
  | "session_paused"
  | "session_resumed"
  | "session_closed";

export type OperationKind =
  | "comment_added"
  | "comment_resolved"
  | "clause_proposed"
  | "clause_accepted"
  | "clause_rejected"
  | "section_locked"
  | "section_unlocked"
  | "checkpoint_requested";

export type CollabSession = {
  id: string;
  workspaceType: WorkspaceType;
  workspaceId: string;
  status: SessionStatus;
  /** Optimistic-lock counter for ordering applied operations. */
  sequenceNumber: number;
  /** Sections currently locked by a single user. */
  sectionLocks: Record<string, { lockedByUserId: string; lockedAt: string }>;
  createdAt: string;
  updatedAt: string;
};

export type CollabPresence = {
  id: string;
  sessionId: string;
  userId: string;
  state: PresenceState;
  /** Optional cursor anchor — section / clause / line reference. */
  cursorAnchor: string | null;
  lastSeenAt: string;
  createdAt: string;
};

export type CollabOperation = {
  id: string;
  sessionId: string;
  /** Sequence at the time this op was applied (for ordering). */
  sequence: number;
  kind: OperationKind;
  actorUserId: string;
  /** Section / clause anchor the op applies to. */
  anchor: string | null;
  payload: Record<string, unknown>;
  /** Optimistic-lock value the client supplied; used for merge safeguard. */
  expectedSequence: number | null;
  /** Whether the op was accepted (applied) or rejected by merge safeguards. */
  accepted: boolean;
  rejectionReason: string | null;
  createdAt: string;
};

export type CollabEvent = {
  id: string;
  sessionId: string;
  eventType: CollabEventType;
  actorUserId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
};

const sessions: CollabSession[] = [];
const presences: CollabPresence[] = [];
const operations: CollabOperation[] = [];
const events: CollabEvent[] = [];

/** Idle-out threshold for presence (5 minutes). */
const IDLE_THRESHOLD_MS = 5 * 60 * 1000;

function recordEvent(input: { sessionId: string; eventType: CollabEventType; actorUserId?: string; payload?: Record<string, unknown> }) {
  const e: CollabEvent = {
    id: newId(),
    sessionId: input.sessionId,
    eventType: input.eventType,
    actorUserId: input.actorUserId || null,
    payload: input.payload || {},
    createdAt: nowIso()
  };
  events.push(e);
  return e;
}

export const realtimeCollabService = {
  async startSession(input: {
    workspaceType: WorkspaceType;
    workspaceId: string;
  }): Promise<CollabSession> {
    // Pause any other open session for the same workspace
    for (const s of sessions) {
      if (s.workspaceType === input.workspaceType && s.workspaceId === input.workspaceId && s.status === "open") {
        s.status = "paused";
        s.updatedAt = nowIso();
        recordEvent({ sessionId: s.id, eventType: "session_paused", payload: { reason: "superseded by new session" } });
      }
    }
    const s: CollabSession = {
      id: newId(),
      workspaceType: input.workspaceType,
      workspaceId: input.workspaceId,
      status: "open",
      sequenceNumber: 0,
      sectionLocks: {},
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    sessions.push(s);
    recordEvent({ sessionId: s.id, eventType: "session_started", payload: { workspaceType: s.workspaceType, workspaceId: s.workspaceId } });
    await publishOutbox({
      id: newId(),
      eventType: "collab.session.started",
      aggregateId: s.id,
      aggregateType: "collab_session",
      payload: { id: s.id, workspaceType: s.workspaceType, workspaceId: s.workspaceId },
      occurredAt: nowIso()
    });
    return s;
  },

  pauseSession(id: string) {
    const s = sessions.find((x) => x.id === id);
    if (!s || s.status !== "open") return s || null;
    s.status = "paused";
    s.updatedAt = nowIso();
    recordEvent({ sessionId: s.id, eventType: "session_paused" });
    return s;
  },
  resumeSession(id: string) {
    const s = sessions.find((x) => x.id === id);
    if (!s || s.status !== "paused") return s || null;
    s.status = "open";
    s.updatedAt = nowIso();
    recordEvent({ sessionId: s.id, eventType: "session_resumed" });
    return s;
  },
  closeSession(id: string) {
    const s = sessions.find((x) => x.id === id);
    if (!s) return null;
    s.status = "closed";
    s.updatedAt = nowIso();
    recordEvent({ sessionId: s.id, eventType: "session_closed" });
    return s;
  },

  /** Update or insert presence for a user. */
  upsertPresence(input: { sessionId: string; userId: string; state?: PresenceState; cursorAnchor?: string }) {
    const session = sessions.find((s) => s.id === input.sessionId);
    if (!session) return null;
    let p = presences.find((x) => x.sessionId === input.sessionId && x.userId === input.userId);
    const now = nowIso();
    if (!p) {
      p = {
        id: newId(),
        sessionId: input.sessionId,
        userId: input.userId,
        state: input.state || "active",
        cursorAnchor: input.cursorAnchor || null,
        lastSeenAt: now,
        createdAt: now
      };
      presences.push(p);
      recordEvent({ sessionId: session.id, eventType: "presence_joined", actorUserId: input.userId, payload: { state: p.state, cursorAnchor: p.cursorAnchor } });
    } else {
      p.state = input.state || p.state;
      p.cursorAnchor = input.cursorAnchor !== undefined ? input.cursorAnchor : p.cursorAnchor;
      p.lastSeenAt = now;
      recordEvent({ sessionId: session.id, eventType: "presence_updated", actorUserId: input.userId, payload: { state: p.state, cursorAnchor: p.cursorAnchor } });
    }
    return p;
  },

  leavePresence(input: { sessionId: string; userId: string }) {
    const p = presences.find((x) => x.sessionId === input.sessionId && x.userId === input.userId);
    if (!p) return null;
    p.state = "left";
    p.lastSeenAt = nowIso();
    recordEvent({ sessionId: p.sessionId, eventType: "presence_left", actorUserId: input.userId });
    return p;
  },

  /** Idle-sweep: any presence not seen within IDLE_THRESHOLD_MS gets marked idle. */
  sweepIdle() {
    const cutoff = Date.now() - IDLE_THRESHOLD_MS;
    let n = 0;
    for (const p of presences) {
      if (p.state === "active" && new Date(p.lastSeenAt).getTime() < cutoff) {
        p.state = "idle";
        n++;
      }
    }
    return { swept: n };
  },

  /**
   * Apply an operation with optimistic-lock merge safeguard. If the caller's
   * `expectedSequence` does not match the current session sequence, the op
   * is rejected with `merge_conflict`. Section locks are honored — an op on
   * a section locked by another user is rejected.
   */
  async applyOperation(input: {
    sessionId: string;
    kind: OperationKind;
    actorUserId: string;
    anchor?: string;
    payload?: Record<string, unknown>;
    expectedSequence?: number;
  }): Promise<CollabOperation | null> {
    const session = sessions.find((s) => s.id === input.sessionId);
    if (!session) return null;
    if (session.status !== "open") {
      const op: CollabOperation = {
        id: newId(),
        sessionId: session.id,
        sequence: session.sequenceNumber,
        kind: input.kind,
        actorUserId: input.actorUserId,
        anchor: input.anchor || null,
        payload: input.payload || {},
        expectedSequence: input.expectedSequence ?? null,
        accepted: false,
        rejectionReason: `session_not_open_${session.status}`,
        createdAt: nowIso()
      };
      operations.push(op);
      recordEvent({ sessionId: session.id, eventType: "operation_rejected", actorUserId: input.actorUserId, payload: { reason: op.rejectionReason } });
      return op;
    }

    // Section lock check
    if (input.anchor && session.sectionLocks[input.anchor]) {
      const lock = session.sectionLocks[input.anchor];
      if (lock.lockedByUserId !== input.actorUserId) {
        const op: CollabOperation = {
          id: newId(),
          sessionId: session.id,
          sequence: session.sequenceNumber,
          kind: input.kind,
          actorUserId: input.actorUserId,
          anchor: input.anchor,
          payload: input.payload || {},
          expectedSequence: input.expectedSequence ?? null,
          accepted: false,
          rejectionReason: `section_locked_by_${lock.lockedByUserId}`,
          createdAt: nowIso()
        };
        operations.push(op);
        recordEvent({ sessionId: session.id, eventType: "operation_rejected", actorUserId: input.actorUserId, payload: { reason: op.rejectionReason } });
        return op;
      }
    }

    // Optimistic lock check
    if (input.expectedSequence !== undefined && input.expectedSequence !== session.sequenceNumber) {
      const op: CollabOperation = {
        id: newId(),
        sessionId: session.id,
        sequence: session.sequenceNumber,
        kind: input.kind,
        actorUserId: input.actorUserId,
        anchor: input.anchor || null,
        payload: input.payload || {},
        expectedSequence: input.expectedSequence,
        accepted: false,
        rejectionReason: `merge_conflict_expected_${input.expectedSequence}_actual_${session.sequenceNumber}`,
        createdAt: nowIso()
      };
      operations.push(op);
      recordEvent({ sessionId: session.id, eventType: "operation_rejected", actorUserId: input.actorUserId, payload: { reason: op.rejectionReason } });
      return op;
    }

    session.sequenceNumber += 1;
    session.updatedAt = nowIso();

    // Lock/unlock side-effects
    if (input.kind === "section_locked" && input.anchor) {
      session.sectionLocks[input.anchor] = { lockedByUserId: input.actorUserId, lockedAt: nowIso() };
    } else if (input.kind === "section_unlocked" && input.anchor) {
      delete session.sectionLocks[input.anchor];
    }

    const op: CollabOperation = {
      id: newId(),
      sessionId: session.id,
      sequence: session.sequenceNumber,
      kind: input.kind,
      actorUserId: input.actorUserId,
      anchor: input.anchor || null,
      payload: input.payload || {},
      expectedSequence: input.expectedSequence ?? null,
      accepted: true,
      rejectionReason: null,
      createdAt: nowIso()
    };
    operations.push(op);
    recordEvent({ sessionId: session.id, eventType: "operation_applied", actorUserId: input.actorUserId, payload: { kind: input.kind, sequence: op.sequence, anchor: op.anchor } });
    return op;
  },

  async publishCheckpoint(input: { sessionId: string; actorUserId: string; label: string }) {
    const session = sessions.find((s) => s.id === input.sessionId);
    if (!session) return null;
    session.status = "checkpoint_published";
    session.updatedAt = nowIso();
    recordEvent({ sessionId: session.id, eventType: "checkpoint_published", actorUserId: input.actorUserId, payload: { label: input.label, sequence: session.sequenceNumber } });
    await publishOutbox({
      id: newId(),
      eventType: "collab.checkpoint.published",
      aggregateId: session.id,
      aggregateType: "collab_session",
      payload: { sessionId: session.id, sequence: session.sequenceNumber, label: input.label },
      occurredAt: nowIso()
    });
    return session;
  },

  // Read APIs
  listSessions: (workspaceType?: WorkspaceType, workspaceId?: string) =>
    sessions
      .filter((s) => (!workspaceType || s.workspaceType === workspaceType) && (!workspaceId || s.workspaceId === workspaceId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  findSession: (id: string) => sessions.find((s) => s.id === id) || null,
  listPresence: (sessionId: string) => presences.filter((p) => p.sessionId === sessionId),
  listOperations: (sessionId: string, opts?: { acceptedOnly?: boolean }) =>
    operations
      .filter((o) => o.sessionId === sessionId && (!opts?.acceptedOnly || o.accepted))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  listEvents: (sessionId: string) => events.filter((e) => e.sessionId === sessionId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  pipelineSummary() {
    const byStatus: Record<SessionStatus, number> = { open: 0, paused: 0, checkpoint_published: 0, closed: 0 };
    for (const s of sessions) byStatus[s.status]++;
    const activePresences = presences.filter((p) => p.state === "active").length;
    const acceptedOps = operations.filter((o) => o.accepted).length;
    const rejectedOps = operations.length - acceptedOps;
    return { totalSessions: sessions.length, byStatus, activePresences, acceptedOps, rejectedOps };
  }
};
