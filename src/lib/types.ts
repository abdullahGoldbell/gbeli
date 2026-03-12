export interface FleetRecord {
  id: number;
  fleet_type: string;
  category: string | null;
  in_out_date: string | null;
  brand: string | null;
  model: string | null;
  model2: string | null;
  replace_ref: string | null;
  veh_no: string;
  container_mast: string | null;
  chassis: string | null;
  mast: string | null;
  attachment: string | null;
  yor: number | null;
  yom: number | null;
  battery: string | null;
  lta_reg: string | null;
  customer_name: string | null;
  rental: boolean;
  sales: boolean;
  scrap: boolean;
  repair_cost: number | null;
  condition: string | null;
  remarks: string | null;
  customer_requirements: string | null;
  location: string | null;
  postal_code: string | null;
  volts: string | null;
  equipment_type: string | null;
  serviceable: string | null;
  salesman_name: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

export interface FleetStats {
  total: number;
  electrical: number;
  diesel: number;
  inRepair: number;
  onRental: number;
  forSale: number;
  scrapped: number;
  conditions: { condition: string; count: number }[];
}
