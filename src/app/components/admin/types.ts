export interface UserRecord {
  id: number;
  username: string;
  displayName: string | null;
  isAdmin: boolean;
  createdAt: string;
  hiddenColumns: string[];
}

export interface UserFormData {
  username: string;
  password: string;
  displayName: string;
  isAdmin: boolean;
}

export const EMPTY_USER_FORM: UserFormData = {
  username: '',
  password: '',
  displayName: '',
  isAdmin: false,
};

export type AdminTab = 'users' | 'columns';

export interface ColumnSaveMessage {
  type: 'success' | 'error';
  text: string;
}
