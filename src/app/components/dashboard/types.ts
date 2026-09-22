import type { MoveField } from '../MoveVehicleModal';

export type ViewTab = 'fleet' | 'out' | 'sold' | 'battery';

export interface FilterState {
  fleet_type: string;
  condition: string;
  brand: string;
  category: string;
  search: string;
  release_status: string;
}

export const EMPTY_FILTERS: FilterState = {
  fleet_type: '', condition: '', brand: '', category: '', search: '', release_status: '',
};

export type CardAction =
  | { kind: 'filter'; fleet_type?: string; reset?: boolean }
  | { kind: 'nav'; tab: Exclude<ViewTab, 'fleet'> };

export type CellValue = string | number | boolean | null;

export interface MoveModalState {
  title: string;
  fields: MoveField[];
  submit: (values: Record<string, string>) => Promise<void>;
}

export const SEARCH_DEBOUNCE_MS = 300;
export const HIGHLIGHT_MS = 2000;
