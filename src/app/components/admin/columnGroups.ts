export interface ColumnOption {
  key: string;
  label: string;
}

export interface ColumnGroup {
  label: string;
  columns: ColumnOption[];
}

export const COLUMN_GROUPS: ColumnGroup[] = [
  {
    label: 'Table Columns (in order)',
    columns: [
      { key: 'fleet_type', label: 'Type' },
      { key: 'veh_no', label: 'Veh No' },
      { key: 'brand', label: 'Brand' },
      { key: 'model', label: 'Model' },
      { key: 'category', label: 'Category' },
      { key: 'condition', label: 'Condition' },
      { key: 'release_status', label: 'Status' },
      { key: 'reservation_date', label: 'Reservation' },
      { key: 'reserved_by', label: 'Reserved By' },
      { key: 'customer_name', label: 'Customer' },
      { key: 'salesman_name', label: 'Salesman' },
      { key: 'chassis', label: 'Chassis' },
      { key: 'mast', label: 'Mast' },
      { key: 'yor', label: 'YOR' },
      { key: 'yom', label: 'YOM' },
      { key: 'remarks', label: 'Remarks' },
      { key: 'location', label: 'Location' },
      { key: 'replace_ref', label: 'Name' },
    ],
  },
  {
    label: 'Additional Columns',
    columns: [
      { key: 'model2', label: 'Model 2' },
      { key: 'container_mast', label: 'Container/Mast' },
      { key: 'attachment', label: 'Attachment' },
      { key: 'battery', label: 'Battery' },
      { key: 'lta_reg', label: 'LTA Reg' },
      { key: 'postal_code', label: 'Postal Code' },
      { key: 'volts', label: 'Volts' },
      { key: 'equipment_type', label: 'Equipment Type' },
      { key: 'serviceable', label: 'Serviceable' },
      { key: 'repair_cost', label: 'Repair Cost' },
      { key: 'customer_requirements', label: 'Customer Req.' },
      { key: 'in_out_date', label: 'In/Out Date' },
    ],
  },
];

export const ALL_COLUMN_KEYS = COLUMN_GROUPS.flatMap((g) => g.columns.map((c) => c.key));
