export interface FleetRecord {
  id: number;
  fleet_type: string;
  category: string | null;
  in_out_date: string | null;
  brand: string | null;
  model: string | null;
  name: string | null;
  veh_no: string;
  container_mast: string | null;
  chassis: string | null;
  mast: string | null;
  attachment: string | null;
  yor: number | null;
  yom: number | null;
  lta_reg: string | null;
  customer_name: string | null;
  lease_period: string | null;
  condition: string | null;
  supplier: string | null;
  remarks: string | null;
  release_status: string | null;
  reservation_date: string | null;
  reserved_by: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

export interface FleetStats {
  total: number;
  electrical: number;
  diesel: number;
  out: number;
  sold: number;
  battery: number;
  batterySum: number;
  onRental: number;
  forSale: number;
  scrapped: number;
  conditions: { condition: string; count: number }[];
}

export interface User {
  id: number;
  username: string;
  password_hash: string;
  display_name: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface OutRecord {
  id: number;
  out_date: string | null;
  brand: string | null;
  model: string | null;
  name: string | null;
  veh_no: string | null;
  container_mast: string | null;
  chassis: string | null;
  mast: string | null;
  attachment: string | null;
  yor: number | null;
  yom: number | null;
  customer_name: string | null;
  condition: string | null;
  supplier: string | null;
  remarks: string | null;
  lta_reg: string | null;
  category: string | null;
}

export interface SoldRecord {
  id: number;
  sold_date: string | null;
  brand: string | null;
  model: string | null;
  customer: string | null;
  veh_no: string | null;
  chassis_no: string | null;
  mast: string | null;
  attachment: string | null;
  yor: number | null;
  yom: number | null;
  lta_reg: string | null;
  salesman: string | null;
  remarks: string | null;
  do_no: string | null;
}

export interface BatteryRecord {
  id: number;
  regen_date: string | null;
  bat_sn: string | null;
  fl: string | null;
  model: string | null;
  supplier: string | null;
  customer: string | null;
  amt: number | null;
  supplier_invoice: string | null;
  warranty: string | null;
  volt: string | null;
  ah: string | null;
  socket: string | null;
}

export interface AuthUser {
  userId: number;
  username: string;
  displayName: string | null;
  isAdmin: boolean;
  hiddenColumns: string[];
}
