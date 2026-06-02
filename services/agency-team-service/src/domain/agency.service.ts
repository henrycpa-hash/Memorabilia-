import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import {
  approvalRouteFor,
  type OrgType,
  type MemberRole,
  type ApprovalRoute
} from "@crownx-jewel/shared-agency";
import {
  agencyRepo,
  type Organization,
  type OrganizationMember,
  type ApprovalTask
} from "../repo/agency.repo";

export const agencyService = {
  // Organizations
  async createOrg(input: { orgType: OrgType; name: string; tenantId?: string }): Promise<Organization> {
    const o: Organization = {
      id: newId(),
      orgType: input.orgType,
      name: input.name,
      tenantId: input.tenantId || null,
      createdAt: nowIso()
    };
    agencyRepo.insertOrg(o);
    await publishOutbox({
      id: newId(),
      eventType: "agency.org.created",
      aggregateId: o.id,
      aggregateType: "organization",
      payload: o,
      occurredAt: nowIso()
    });
    return o;
  },

  // Members
  async addMember(input: {
    organizationId: string;
    userId: string;
    role: MemberRole;
  }): Promise<OrganizationMember | null> {
    if (!agencyRepo.findOrg(input.organizationId)) return null;
    const m: OrganizationMember = {
      id: newId(),
      organizationId: input.organizationId,
      userId: input.userId,
      role: input.role,
      status: "active",
      createdAt: nowIso()
    };
    agencyRepo.insertMember(m);
    await publishOutbox({
      id: newId(),
      eventType: "agency.member.added",
      aggregateId: m.id,
      aggregateType: "organization_member",
      payload: m,
      occurredAt: nowIso()
    });
    return m;
  },

  // Creator affiliations
  async affiliateCreator(input: { organizationId: string; creatorId: string }) {
    if (!agencyRepo.findOrg(input.organizationId)) return null;
    const a = agencyRepo.insertAffiliation({
      id: newId(),
      organizationId: input.organizationId,
      creatorId: input.creatorId,
      createdAt: nowIso()
    });
    await publishOutbox({
      id: newId(),
      eventType: "agency.creator.affiliated",
      aggregateId: a.id,
      aggregateType: "creator_affiliation",
      payload: a,
      occurredAt: nowIso()
    });
    return a;
  },

  /**
   * Open one approval task per role required by the route. Wave 6 returns the
   * created task list; the caller decides how to expose them. Wave 7 chains
   * into a real workflow engine.
   */
  async openApproval(input: {
    organizationId: string;
    aggregateType: ApprovalRoute["aggregateType"];
    aggregateId: string;
    payloadJson?: Record<string, unknown>;
  }) {
    if (!agencyRepo.findOrg(input.organizationId)) return null;
    const route = approvalRouteFor(input.aggregateType);
    if (!route) {
      // No route defined → single generic manager task.
      const t = agencyRepo.insertTask({
        id: newId(),
        organizationId: input.organizationId,
        aggregateType: input.aggregateType,
        aggregateId: input.aggregateId,
        assignedRole: "manager",
        status: "pending",
        payloadJson: input.payloadJson || {},
        decidedByUserId: null,
        decidedAt: null,
        createdAt: nowIso()
      });
      return [t];
    }
    const created: ApprovalTask[] = [];
    for (const role of route.requiredRoles) {
      const t = agencyRepo.insertTask({
        id: newId(),
        organizationId: input.organizationId,
        aggregateType: input.aggregateType,
        aggregateId: input.aggregateId,
        assignedRole: role,
        status: "pending",
        payloadJson: input.payloadJson || {},
        decidedByUserId: null,
        decidedAt: null,
        createdAt: nowIso()
      });
      created.push(t);
    }
    await publishOutbox({
      id: newId(),
      eventType: "agency.approval.opened",
      aggregateId: input.aggregateId,
      aggregateType: input.aggregateType,
      payload: { organizationId: input.organizationId, tasks: created.map((t) => t.id) },
      occurredAt: nowIso()
    });
    return created;
  },

  async decideTask(input: {
    taskId: string;
    decidedByUserId: string;
    decision: "approved" | "rejected";
  }) {
    const t = agencyRepo.findTask(input.taskId);
    if (!t) return null;
    if (t.status !== "pending") return t;
    const updated = agencyRepo.updateTask(t.id, {
      status: input.decision,
      decidedByUserId: input.decidedByUserId,
      decidedAt: nowIso()
    });
    await publishOutbox({
      id: newId(),
      eventType: "agency.approval.decided",
      aggregateId: t.id,
      aggregateType: "approval_task",
      payload: { taskId: t.id, decision: input.decision, by: input.decidedByUserId },
      occurredAt: nowIso()
    });
    return updated;
  },

  listOrgs: () => agencyRepo.listOrgs(),
  orgsByTenant: (t: string) => agencyRepo.orgsByTenant(t),
  findOrg: (id: string) => agencyRepo.findOrg(id),
  membersOf: (id: string) => agencyRepo.membersOf(id),
  affiliationsOf: (id: string) => agencyRepo.affiliationsOf(id),
  affiliationsForCreator: (id: string) => agencyRepo.affiliationsForCreator(id),
  tasksFor: (id: string) => agencyRepo.tasksFor(id),
  pendingTasksFor: (id: string) => agencyRepo.tasksByStatus(id, "pending"),
  findTask: (id: string) => agencyRepo.findTask(id)
};
