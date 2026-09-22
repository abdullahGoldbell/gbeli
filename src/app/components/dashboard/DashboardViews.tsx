'use client';

import { ReactNode } from 'react';
import OutTable from '../OutTable';
import SoldTable from '../SoldTable';
import BatteryTable from '../BatteryTable';
import { ViewTab } from './types';

const ADMIN_VIEWS = {
  out: OutTable,
  sold: SoldTable,
  battery: BatteryTable,
} as const;

interface Props {
  view: ViewTab;
  isAdmin: boolean;
  onChanged: () => void;
  fleetView: ReactNode;
}

/** Renders the active tab: the fleet list for everyone, other lists for admins only. */
export default function DashboardViews({ view, isAdmin, onChanged, fleetView }: Props) {
  if (view === 'fleet') return <>{fleetView}</>;
  if (!isAdmin) return null;
  const Table = ADMIN_VIEWS[view];
  return <Table onChanged={onChanged} />;
}
