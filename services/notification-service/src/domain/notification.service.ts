import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { notificationRepo, type Notification } from "../repo/notification.repo";

export const notificationService = {
  async create(input: {
    userId: string;
    type: string;
    title: string;
    body: string;
  }): Promise<Notification> {
    const n: Notification = {
      id: newId(),
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      status: "unread",
      createdAt: nowIso(),
      readAt: null
    };
    notificationRepo.insert(n);
    return n;
  },

  listForUser(userId: string) {
    return notificationRepo.listForUser(userId);
  },

  list() {
    return notificationRepo.list();
  },

  async markRead(id: string) {
    return notificationRepo.markRead(id, nowIso()) || null;
  }
};
