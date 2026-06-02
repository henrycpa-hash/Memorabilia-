export type Notification = {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  status: "unread" | "read";
  createdAt: string;
  readAt: string | null;
};

const store: Notification[] = [];

export const notificationRepo = {
  insert(n: Notification) {
    store.push(n);
    return n;
  },
  listForUser(userId: string) {
    return store
      .filter((n) => n.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  list() {
    return [...store];
  },
  markRead(id: string, readAt: string) {
    const n = store.find((x) => x.id === id);
    if (n) {
      n.status = "read";
      n.readAt = readAt;
    }
    return n;
  }
};
