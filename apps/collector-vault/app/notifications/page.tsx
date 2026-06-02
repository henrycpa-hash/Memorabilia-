import Link from "next/link";
import { authedGet } from "../../lib/api";
import { SectionTag, Panel, Badge, ButtonLink, color, font } from "@crownx-jewel/shared-design";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  status: string;
  createdAt: string;
};

export default async function NotificationsPage() {
  const list = await authedGet<Notification[]>("/api/notifications/me");

  if (list === null) {
    return (
      <section>
        <SectionTag>Activity</SectionTag>
        <Panel glow>
          <p style={{ color: color.mut, margin: "0 0 16px" }}>You&apos;re not signed in.</p>
          <ButtonLink href="/login" as={Link} variant="primary">Authenticate →</ButtonLink>
        </Panel>
      </section>
    );
  }

  return (
    <section>
      <SectionTag>Activity</SectionTag>
      <h1 style={{ fontFamily: font.display, fontWeight: 400, fontSize: 40, margin: "0 0 18px" }}>Your vault&apos;s journey</h1>

      <div style={{ display: "grid", gap: 12 }}>
        {list.map((n) => {
          const unread = n.status === "unread";
          return (
            <Panel
              key={n.id}
              style={{
                borderColor: unread ? "rgba(63,217,212,0.35)" : color.line,
                background: unread ? "rgba(63,217,212,0.05)" : undefined
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                <strong style={{ fontSize: 15 }}>{n.title}</strong>
                <span style={{ color: color.mut2, fontSize: 11, fontFamily: font.mono, whiteSpace: "nowrap" }}>
                  {new Date(n.createdAt).toLocaleString()}
                </span>
              </div>
              <div style={{ marginTop: 6, color: color.txt, fontSize: 13 }}>{n.body}</div>
              <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                <Badge tone="mut">{n.type}</Badge>
                {unread && <Badge tone="cyan">unread</Badge>}
              </div>
            </Panel>
          );
        })}
        {list.length === 0 && (
          <Panel>
            <p style={{ color: color.mut, margin: 0 }}>No activity yet. Your first mint will light this up.</p>
          </Panel>
        )}
      </div>
    </section>
  );
}
