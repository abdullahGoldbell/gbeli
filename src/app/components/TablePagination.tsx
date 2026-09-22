'use client';

interface Props {
  page: number;
  pageSize: number;
  totalRows: number;
  onPageChange: (page: number) => void;
}

export default function TablePagination({ page, pageSize, totalRows, onPageChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const firstRow = totalRows === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRow = Math.min(page * pageSize, totalRows);

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 bg-neutral-50 text-xs text-neutral-600 border-t border-neutral-200">
      <span>{firstRow}-{lastRow} of {totalRows} rows</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-2 py-1 border border-neutral-300 rounded hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <span className="min-w-[80px] text-center">Page {page} of {totalPages}</span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="px-2 py-1 border border-neutral-300 rounded hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}
