import { Button } from '@/components/style';
import { ESCAPE_COMBO, useShortcutLayer } from '@/lib/shortcuts';
import { useI18n } from '@/lib/i18n';

/**
 * Confirm dialog tuỳ biến, tránh cài @radix-ui/react-dialog cho 1 use case.
 * Escape hoặc click overlay để cancel.
 */

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // Nhãn mặc định lấy từ bộ dịch lúc render, không đặt chuỗi cứng ở default param.
  const { t } = useI18n();
  // Lớp overlay chặn: dialog mở thì canvas không nhận phím nào (Delete, Ctrl+Z, F...).
  // Esc chỉ huỷ dialog, vùng chọn giữ nguyên.
  useShortcutLayer(
    'overlay',
    [
      { id: 'confirm.cancel', combos: [ESCAPE_COMBO], run: () => { onCancel(); } },
      {
        id: 'confirm.ok',
        combos: [{ shift: 'any', key: 'Enter' }],
        // Focus đang ở 1 nút (Tab tới "Huỷ") → để nút tự xử Enter, không xác nhận thay.
        run: (e) => {
          if (e.target instanceof HTMLButtonElement) return false;
          onConfirm();
        },
      },
    ],
    { enabled: open, blocking: true },
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-80 rounded-lg border border-border bg-card p-5 shadow-lg"
      >
        <h2 className="mb-1 text-base font-semibold">{title}</h2>
        {description ? (
          <p className="mb-4 text-sm text-muted-foreground">{description}</p>
        ) : (
          <div className="mb-4" />
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            {cancelLabel ?? t('COMMON.CANCEL')}
          </Button>
          <Button variant={destructive ? 'destructive' : 'default'} onClick={onConfirm}>
            {confirmLabel ?? t('COMMON.OK')}
          </Button>
        </div>
      </div>
    </div>
  );
}
