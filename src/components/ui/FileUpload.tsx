import { useCallback, useState } from 'react';
import clsx from 'clsx';
import { FiUploadCloud } from 'react-icons/fi';

const DEFAULT_ACCEPT =
  '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.jpg,.jpeg,.png,.webp,application/pdf,image/*';

export function FileUpload({
  onFiles,
  accept = DEFAULT_ACCEPT,
  multiple = false,
  disabled,
}: {
  onFiles?: (files: FileList) => void;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
}) {
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files?.length || disabled) return;
      onFiles?.(files);
    },
    [disabled, onFiles],
  );

  return (
    <label
      className={clsx(
        'flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center transition',
        dragging ? 'border-brand-500 bg-brand-50' : 'border-ink-100 bg-white hover:bg-ink-50',
        disabled && 'cursor-not-allowed opacity-60',
      )}
      onDragEnter={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!disabled) setDragging(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setDragging(false);
        if (!disabled) handleFiles(event.dataTransfer.files);
      }}
    >
      <FiUploadCloud className="text-brand-600" size={28} />
      <span className="mt-2 text-sm font-semibold text-ink-900">
        {dragging ? 'Drop file to upload' : 'Drag and drop or click to upload'}
      </span>
      <span className="text-xs text-ink-500">PDF, Office docs, images, or text files up to 100MB</span>
      <input
        className="hidden"
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(event) => handleFiles(event.target.files)}
      />
    </label>
  );
}
