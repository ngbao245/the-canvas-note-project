import { useEffect, useRef, useState } from 'react';
import { registerObjectType, type ObjectRendererProps } from '../../hooks/useObjectRegistry';
import { noteDataSchema, type NoteData } from '../../types';
import { updateObjectData } from '../../engine/actions';
import { ObjectShell } from './ObjectShell';

/**
 * Note — card ghi chữ plain (title + body). Rich text hoãn Phase C.
 * Edit: double-click (ObjectsLayer set editingId) → title focus, Enter xuống body,
 * blur/Escape/Ctrl+Enter thoát + lưu (undo-able qua updateObjectData).
 */
function NoteRenderer({ object, isSelected, isEditing, onEditEnd }: ObjectRendererProps) {
  const parsed = noteDataSchema.safeParse(object.data);
  const data: NoteData = parsed.success ? parsed.data : { title: '', body: '' };

  return (
    <ObjectShell selected={isSelected} editing={isEditing} variant="card">
      {isEditing ? (
        <NoteEditor initial={data} objectId={object.id} onEditEnd={onEditEnd} />
      ) : (
        <NoteView data={data} />
      )}
    </ObjectShell>
  );
}

function NoteView({ data }: { data: NoteData }) {
  const emptyTitle = data.title.trim() === '';
  const emptyBody = data.body.trim() === '';
  return (
    <div className="flex h-full w-full flex-col gap-1 p-3">
      <div
        className={`text-sm font-semibold leading-snug ${emptyTitle ? 'text-muted-foreground/50' : 'text-foreground'}`}
      >
        {emptyTitle ? 'Tiêu đề' : data.title}
      </div>
      <div
        className={`flex-1 overflow-hidden whitespace-pre-wrap text-xs leading-relaxed ${emptyBody ? 'text-muted-foreground/40' : 'text-muted-foreground'}`}
      >
        {emptyBody ? 'Nội dung...' : data.body}
      </div>
    </div>
  );
}

function NoteEditor({
  initial,
  objectId,
  onEditEnd,
}: {
  initial: NoteData;
  objectId: string;
  onEditEnd: () => void;
}) {
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // Giữ giá trị hiện tại trong ref để commit đọc không bị stale.
  const latest = useRef({ title, body });
  latest.current = { title, body };

  // Bỏ qua blur trong thời gian ngắn sau mount: chuỗi double-click phát pointer
  // event làm input chớp mất focus ngay khi vừa mount → không được coi là "đóng".
  const ready = useRef(false);
  useEffect(() => {
    titleRef.current?.focus();
    titleRef.current?.select();
    const t = setTimeout(() => {
      ready.current = true;
    }, 250);
    return () => clearTimeout(t);
  }, []);

  // Commit tường minh khi đóng (blur thật / Escape / Ctrl+Enter). Đọc latest.current.
  const commitAndClose = () => {
    updateObjectData(objectId, {
      title: latest.current.title,
      body: latest.current.body,
    });
    onEditEnd();
  };

  return (
    <div className="flex h-full w-full flex-col gap-1 p-3">
      <input
        ref={titleRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            bodyRef.current?.focus();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            commitAndClose();
          }
        }}
        onBlur={(e) => {
          // Blur sang body trong cùng note → không đóng.
          if ((e.relatedTarget as Node | null) === bodyRef.current) return;
          // Blur giả lúc mới mount (do double-click) → re-focus, không đóng.
          if (!ready.current) {
            titleRef.current?.focus();
            return;
          }
          commitAndClose();
        }}
        placeholder="Tiêu đề"
        className="w-full bg-transparent text-sm font-semibold leading-snug text-foreground outline-none placeholder:text-muted-foreground/50"
      />
      <textarea
        ref={bodyRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            commitAndClose();
          } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            commitAndClose();
          }
        }}
        onBlur={(e) => {
          // Blur sang title trong cùng note → không đóng.
          if ((e.relatedTarget as Node | null) === titleRef.current) return;
          // Blur giả lúc mới mount → re-focus, không đóng.
          if (!ready.current) {
            bodyRef.current?.focus();
            return;
          }
          commitAndClose();
        }}
        placeholder="Nội dung..."
        className="flex-1 resize-none bg-transparent text-xs leading-relaxed text-muted-foreground outline-none placeholder:text-muted-foreground/40"
      />
    </div>
  );
}

registerObjectType({
  type: 'note',
  renderer: NoteRenderer,
  defaultGeometry: { width: 220, height: 140, rotation: 0, zIndex: 0 },
  defaultData: (): NoteData => ({ title: '', body: '' }),
  label: 'Note',
  showInToolbar: true,
  renderPreview: () => {
    const el = document.createElement('div');
    el.className =
      'h-full w-full rounded-md border border-border bg-card p-3 shadow-lg overflow-hidden';
    el.innerHTML =
      '<div class="text-sm font-semibold leading-snug text-muted-foreground/60">Tiêu đề</div>' +
      '<div class="mt-1 text-xs leading-relaxed text-muted-foreground/40">Nội dung...</div>';
    return el;
  },
});
