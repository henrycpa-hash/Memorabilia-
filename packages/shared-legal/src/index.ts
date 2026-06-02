/**
 * Wave 7 legal packet primitives.
 *
 * Packets bundle evidence + audit trail + timeline + shipment/settlement +
 * policy evaluations + contract extracts into a single artifact for
 * procurement, dispute, claim, audit, and incident workflows.
 */
export type PacketType =
  | "procurement_packet"
  | "dispute_packet"
  | "claims_packet"
  | "compliance_packet"
  | "audit_packet"
  | "partner_incident_packet";

export type PacketStatus = "queued" | "assembling" | "ready" | "delivered" | "failed";

export type PacketItemType =
  | "cover_sheet"
  | "summary"
  | "timeline"
  | "evidence_manifest"
  | "audit_summary"
  | "shipment_summary"
  | "settlement_summary"
  | "policy_evaluation"
  | "contract_extract"
  | "appendix";

export type PacketItem = {
  itemType: PacketItemType;
  sequence: number;
  sourceRef?: string;
  payloadJson?: Record<string, unknown>;
};

export type PacketManifest = {
  cover: { title: string; subtitle?: string; preparedAt: string };
  index: PacketItem[];
};

/** Build a default manifest skeleton for a packet type. */
export function defaultManifest(input: {
  packetType: PacketType;
  subjectType: string;
  subjectId: string;
  preparedAt: string;
}): PacketManifest {
  const titleMap: Record<PacketType, string> = {
    procurement_packet: "Enterprise Procurement Packet",
    dispute_packet: "Dispute Resolution Packet",
    claims_packet: "Insurance Claims Packet",
    compliance_packet: "Compliance Review Packet",
    audit_packet: "Audit Trail Packet",
    partner_incident_packet: "Partner Incident Packet"
  };
  const baseSeq: Array<PacketItemType> = [
    "cover_sheet",
    "summary",
    "timeline",
    "evidence_manifest",
    "audit_summary",
    "policy_evaluation"
  ];
  if (input.packetType === "claims_packet") baseSeq.push("shipment_summary", "settlement_summary");
  if (input.packetType === "dispute_packet") baseSeq.push("settlement_summary");
  if (input.packetType === "procurement_packet") baseSeq.push("contract_extract");
  baseSeq.push("appendix");
  return {
    cover: {
      title: titleMap[input.packetType],
      subtitle: `${input.subjectType} ${input.subjectId}`,
      preparedAt: input.preparedAt
    },
    index: baseSeq.map((itemType, i) => ({ itemType, sequence: i + 1 }))
  };
}
