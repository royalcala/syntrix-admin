import { invoke } from "@tauri-apps/api/core";
import { EntityGrid } from "../components/EntityGrid";
import { orgsEntity } from "../entities/orgs";

interface OrgSummary {
  name: string;
  node_count: number;
  created_at: string;
}

export function OrgsGridPage() {
  async function loadOrgs() {
    const orgNames: string[] = await invoke("list_orgs");
    const orgs: OrgSummary[] = orgNames.map((name) => ({
      name,
      node_count: 0,
      created_at: new Date().toISOString(),
    }));
    return orgs.map((o) => ({
      id: o.name,
      ...o,
    })) as Array<Record<string, unknown>>;
  }

  return <EntityGrid entity={orgsEntity} dataLoader={loadOrgs} role="admin" />;
}
