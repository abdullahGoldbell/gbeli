import { FleetRecord } from '@/lib/types';
import { MoveModalState } from './types';

type SubmitMove = (id: number, body: Record<string, string | null>) => Promise<void>;

const orNull = (v: string | undefined) => v || null;

export function buildMoveModal(
  row: FleetRecord,
  status: 'Out' | 'Sold',
  submitMove: SubmitMove,
  onDone: () => void,
): MoveModalState {
  if (status === 'Out') {
    return {
      title: `Move ${row.veh_no} to Out`,
      fields: [
        { key: 'out_date', label: 'Out Date', type: 'date', required: true },
        { key: 'customer_name', label: 'Customer', type: 'text', defaultValue: row.customer_name || '' },
        { key: 'name', label: 'Name', type: 'text', defaultValue: row.name || '' },
        { key: 'location', label: 'Location', type: 'text' },
        { key: 'remarks', label: 'Remark', type: 'text', defaultValue: row.remarks || '' },
      ],
      submit: async (values) => {
        await submitMove(row.id, {
          release_status: 'Out',
          out_date: orNull(values.out_date),
          customer_name: orNull(values.customer_name),
          name: orNull(values.name),
          location: orNull(values.location),
          remarks: orNull(values.remarks),
        });
        onDone();
      },
    };
  }
  return {
    title: `Move ${row.veh_no} to Sold`,
    fields: [{ key: 'sold_date', label: 'Sold Date', type: 'date', required: true }],
    submit: async (values) => {
      await submitMove(row.id, { release_status: 'Sold', sold_date: orNull(values.sold_date) });
      onDone();
    },
  };
}
