import { useOutletContext } from "react-router-dom";
import { EntityGrid } from "../components/EntityGrid";
import type { EntityDefinition } from "../fields/registry";

export function EntityGridPage() {
  const { entity, role } = useOutletContext<{ entity: EntityDefinition; role?: string }>();
  return <EntityGrid entity={entity} role={role} />;
}
