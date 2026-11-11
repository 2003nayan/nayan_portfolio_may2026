// Home page sections, in page order. Single source for the section tracker,
// the hero's section index and the rotated rail labels. `id` must match the
// <section id> rendered by the matching component.
export const HOME_SECTIONS = [
  { id: "about", label: "About" },
  { id: "journey", label: "Journey" },
  { id: "projects", label: "Work" },
  { id: "twins", label: "3D Twins" },
  { id: "opensource", label: "Open Source" },
  { id: "writing", label: "Writing" },
  { id: "contact", label: "Get in touch" },
] as const;

export type HomeSectionId = (typeof HOME_SECTIONS)[number]["id"];

export function sectionLabel(id: string): string | undefined {
  return HOME_SECTIONS.find((s) => s.id === id)?.label;
}
