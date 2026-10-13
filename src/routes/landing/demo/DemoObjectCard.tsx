import type { FocusEvent, KeyboardEvent } from 'react';
import { DrawablyCard } from 'drawably/react';
import { FileText } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { isImeComposing } from '@/lib/dom';
import { FOCUS_RING } from '@/lib/focus-ring';
import { useDemoStore } from './demo-store';
import type { DemoObject } from './types';

/**
 * Card vẽ tay của canvas mini: note thường, hoặc trích dẫn (có `source`).
 * Luôn kiểu vẽ tay, không đọc lựa chọn phong cách của người dùng. Viền chọn đặt ở
 * lớp bọc ngoài, đi cùng card cả lúc đang kéo (giữ rule cứng của canvas thật).
 */
export function DemoObjectCard({
  obj,
  selected,
  dragging,
  editing,
}: {
  obj: DemoObject;
  selected: boolean;
  dragging: boolean;
  editing: boolean;
}) {
  const { t } = useI18n();
  const openSource = useDemoStore((s) => s.openSource);
  const select = useDemoStore((s) => s.select);

  return (
    <div
      data-demo-object-id={obj.id}
      className={`absolute ${editing ? '' : 'cursor-move'}`}
      style={{ left: obj.x, top: obj.y, width: obj.w, minHeight: obj.h }}
    >
      <div
        className={`relative w-full rounded-sm transition-shadow duration-fast ease-standard ${
          selected || editing ? 'ring-2 ring-primary' : ''
        } ${dragging ? 'shadow-elevation-3' : ''}`}
        style={{ minHeight: obj.h }}
      >
        <DrawablyCard style={{ width: '100%', minHeight: obj.h }}>
          <div className="relative w-full overflow-hidden">
            <div
              className={`absolute inset-x-0 top-0 h-1 ${obj.source ? 'bg-warning' : 'bg-primary'}`}
              aria-hidden="true"
            />
            <div className="px-5 pb-5 pt-6">
              {editing ? (
                <EditFields />
              ) : (
                <>
                  <p className="font-serif text-base font-semibold text-foreground">{obj.title}</p>
                  <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                    {obj.body}
                  </p>
                </>
              )}
              {obj.source && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  <span className="text-xs text-muted-foreground">
                    {t('LANDING.DEMO.SOURCE_LINE', {
                      file: obj.source.file,
                      page: obj.source.page,
                      table: obj.source.table,
                    })}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      select(obj.id);
                      openSource(obj.id);
                    }}
                    className={`ml-auto inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-foreground transition-colors duration-fast ease-standard hover:bg-muted ${FOCUS_RING}`}
                  >
                    <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('LANDING.DEMO.OPEN_SOURCE')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </DrawablyCard>
      </div>
    </div>
  );
}

/** Ô sửa tiêu đề + nội dung. Esc hoặc focus rời card thì ghi lại và thoát sửa. */
function EditFields() {
  const { t } = useI18n();
  const draft = useDemoStore((s) => s.draft);
  const setDraft = useDemoStore((s) => s.setDraft);
  const finishEdit = useDemoStore((s) => s.finishEdit);
  if (!draft) return null;

  const onKeyDown = (e: KeyboardEvent) => {
    if (isImeComposing(e.nativeEvent)) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      finishEdit();
    }
  };
  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget)) return;
    finishEdit();
  };

  return (
    <div className="flex flex-col gap-2" onBlur={onBlur}>
      <input
        // autoFocus: vào sửa do người dùng chủ động bấm đúp / Enter.
        autoFocus
        aria-label={t('LANDING.DEMO.EDIT_TITLE')}
        value={draft.title}
        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        onKeyDown={onKeyDown}
        className={`w-full select-text rounded-sm bg-muted px-1 font-serif text-base font-semibold text-foreground ${FOCUS_RING}`}
      />
      <textarea
        aria-label={t('LANDING.DEMO.EDIT_BODY')}
        value={draft.body}
        rows={4}
        onChange={(e) => setDraft({ ...draft, body: e.target.value })}
        onKeyDown={onKeyDown}
        className={`w-full resize-none select-text rounded-sm bg-muted px-1 text-sm text-foreground ${FOCUS_RING}`}
      />
    </div>
  );
}
