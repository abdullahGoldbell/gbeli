'use client';

import { FleetRecord } from '@/lib/types';
import AddVehicleModal from '../AddVehicleModal';
import MoveVehicleModal from '../MoveVehicleModal';
import UploadModal from '../UploadModal';
import AdminPanel from '../AdminPanel';
import { CellValue, MoveModalState } from './types';

export type DashboardModal = 'add' | 'upload' | 'admin' | null;

interface Props {
  modal: DashboardModal;
  moveModal: MoveModalState | null;
  existing: FleetRecord[];
  onClose: () => void;
  onCloseMove: () => void;
  onAdd: (data: Record<string, CellValue>) => Promise<void>;
  onUploaded: () => void;
}

export default function DashboardModals(props: Props) {
  const { modal, moveModal, existing, onClose, onCloseMove, onAdd, onUploaded } = props;
  return (
    <>
      {modal === 'add' && <AddVehicleModal onClose={onClose} onSubmit={onAdd} existing={existing} />}
      {moveModal && (
        <MoveVehicleModal
          title={moveModal.title}
          fields={moveModal.fields}
          onClose={onCloseMove}
          onSubmit={moveModal.submit}
        />
      )}
      {modal === 'upload' && <UploadModal onClose={onClose} onSuccess={onUploaded} />}
      {modal === 'admin' && <AdminPanel onClose={onClose} />}
    </>
  );
}
