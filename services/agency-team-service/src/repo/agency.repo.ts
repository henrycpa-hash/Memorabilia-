import type { OrgType, MemberRole, MemberStatus, ApprovalTaskStatus } from "@crownx-jewel/shared-agency";

export type Organization = {
  id: string;
  orgType: OrgType;
  name: string;
  tenantId: string | null;
  createdAt: string;
};

export type OrganizationMember = {
  id: string;
  organizationId: string;
  userId: string;
  role: MemberRole;
  status: MemberStatus;
  createdAt: string;
};

export type CreatorAffiliation = {
  id: string;
  organizationId: string;
  creatorId: string;
  createdAt: string;
};

export type ApprovalTask = {
  id: string;
  organizationId: string;
  aggregateType: string;
  aggregateId: string;
  assignedRole: MemberRole;
  status: ApprovalTaskStatus;
  payloadJson: Record<string, unknown>;
  decidedByUserId: string | null;
  decidedAt: string | null;
  createdAt: string;
};

const orgs: Organization[] = [];
const members: OrganizationMember[] = [];
const affiliations: CreatorAffiliation[] = [];
const tasks: ApprovalTask[] = [];

export const agencyRepo = {
  insertOrg(o: Organization) { orgs.push(o); return o; },
  findOrg(id: string) { return orgs.find((o) => o.id === id) || null; },
  listOrgs() { return [...orgs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); },
  orgsByTenant(tenantId: string) { return orgs.filter((o) => o.tenantId === tenantId); },

  insertMember(m: OrganizationMember) { members.push(m); return m; },
  membersOf(orgId: string) { return members.filter((m) => m.organizationId === orgId); },
  membersOfUser(userId: string) { return members.filter((m) => m.userId === userId); },
  updateMember(id: string, patch: Partial<OrganizationMember>) {
    const m = members.find((x) => x.id === id);
    if (m) Object.assign(m, patch);
    return m || null;
  },

  insertAffiliation(a: CreatorAffiliation) { affiliations.push(a); return a; },
  affiliationsOf(orgId: string) { return affiliations.filter((a) => a.organizationId === orgId); },
  affiliationsForCreator(creatorId: string) {
    return affiliations.filter((a) => a.creatorId === creatorId);
  },

  insertTask(t: ApprovalTask) { tasks.push(t); return t; },
  findTask(id: string) { return tasks.find((t) => t.id === id) || null; },
  tasksFor(orgId: string) {
    return tasks
      .filter((t) => t.organizationId === orgId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  tasksByStatus(orgId: string, status: ApprovalTaskStatus) {
    return tasks.filter((t) => t.organizationId === orgId && t.status === status);
  },
  updateTask(id: string, patch: Partial<ApprovalTask>) {
    const t = tasks.find((x) => x.id === id);
    if (t) Object.assign(t, patch);
    return t || null;
  }
};
