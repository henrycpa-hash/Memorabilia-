/**
 * @crownx-jewel/shared-design — the unified CrownX × Jewel design system.
 *
 *   import "@crownx-jewel/shared-design/theme.css";   // once, in root layout
 *   import { AppShell, Panel, Stat } from "@crownx-jewel/shared-design";
 *   import { color, font } from "@crownx-jewel/shared-design/tokens";
 */
export * from "./tokens";
export { default as tokens } from "./tokens";
export * from "./components";
export { CoaViewer3D } from "./CoaViewer3D";
export type { CoaArtifactView } from "./CoaViewer3D";
