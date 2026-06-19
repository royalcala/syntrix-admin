import { useMemo } from "react";
import { EntityGrid } from "../components/EntityGrid";
import { devicesEntity } from "../entities/devices";
import { createDevicesCollection } from "../collections/admin-collections";

export function DevicesGridPage({ org }: { org: string }) {
  const collection = useMemo(() => createDevicesCollection(org), [org]);
  const entity = useMemo(() => ({ ...devicesEntity, collection }), [collection]);

  return <EntityGrid entity={entity} role="admin" />;
}
