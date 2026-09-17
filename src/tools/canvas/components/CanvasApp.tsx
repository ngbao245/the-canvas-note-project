import { useState, useCallback } from 'react';
import { CanvasSurface } from './CanvasSurface';
import { ConfirmDialog } from './ConfirmDialog';
import { useDeleteKey } from '../hooks/useDeleteKey';
import { deleteObjects } from '../engine/actions';

export function CanvasApp({ boardId }: { boardId: string | null }) {
  const [pending, setPending] = useState<string[] | null>(null);

  const handleDelete = useCallback((ids: string[]) => {
    if (ids.length > 1) setPending(ids);
    else deleteObjects(ids);
  }, []);

  useDeleteKey(handleDelete);

  return (
    <div className="flex flex-1 flex-col">
      <CanvasSurface boardId={boardId} />
      <ConfirmDialog
        open={pending !== null}
        title="Xoá nhiều object?"
        description={`Sẽ xoá ${pending?.length ?? 0} object. Undo được (Ctrl+Z).`}
        confirmLabel="Xoá"
        destructive
        onConfirm={() => {
          if (pending) deleteObjects(pending);
          setPending(null);
        }}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
