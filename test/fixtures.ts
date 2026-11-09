// Synthetic fixtures only. Addresses use reserved example domains (RFC 2606).
export const validDataset = {
  identifier: "https://www.data.gov.uk/dataset/00000000-0000-0000-0000-000000000000/example-dataset",
  type: "dcat:Dataset",
  title: "Example dataset",
  description: "A synthetic dataset used to test the validator.",
  licence: "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
  version: "1.0",
  accessRights: "OPEN",
  securityClassification: "OFFICIAL",
  contactPoint: { contactName: "Data team", email: "data-team@example.org" },
  modified: "2026-11-01",
  creator: ["government-digital-service"],
  publisher: "government-digital-service",
  updateFrequency: "freq:monthly"
};

export function ckanPackage(over: Record<string, unknown> = {}) {
  return {
    id: "11111111-2222-3333-4444-555555555555",
    name: "school-census-example",
    title: "School census (example)",
    notes: "Synthetic description of a dataset.",
    license_id: "uk-ogl",
    license_title: "Open Government Licence",
    license_url: "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
    metadata_modified: "2026-10-30T09:15:00.000000",
    metadata_created: "2020-01-02T10:00:00.000000",
    organization: { name: "department-for-education", title: "Department for Education" },
    maintainer: "A Person",
    maintainer_email: "a.person@example.org",
    author_email: "someone@example.org",
    tags: [{ name: "education" }, { name: "schools" }],
    resources: [
      { name: "Data 2026", format: "csv", url: "https://example.org/data.csv", last_modified: "2026-10-30T09:00:00" },
      { name: "Guide", format: "PDF", url: "https://example.org/guide.pdf" }
    ],
    ...over
  };
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
