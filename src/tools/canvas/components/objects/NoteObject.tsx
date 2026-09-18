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
    // pt-5 pl-5 pr-5 pb-5 = padding 20px đều (Milanote element-padding-default = 24px,
    // Kiro chọn 20 vì bibo card mặc định 220x140 nhỏ hơn Milanote 338w — 24 sẽ chật).
    // pt-6 để chừa 4px cho ColorBar top (h-1 = 4px) + 20px content padding.
    <div className="flex h-full w-full flex-col gap-2 pl-5 pr-5 pb-5 pt-6">
      <div
        className={`font-serif text-base font-semibold leading-tight tracking-tight ${
          emptyTitle ? 'text-muted-foreground/50' : 'text-foreground'
        }`}
      >
        {emptyTitle ? 'Tiêu đề' : data.title}
      </div>
      <div
        className={`flex-1 overflow-hidden whitespace-pre-wrap text-sm leading-relaxed ${
          emptyBody ? 'text-muted-foreground/40' : 'text-muted-foreground'
        }`}
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
    <div className="flex h-full w-full flex-col gap-2 pl-5 pr-5 pb-5 pt-6">
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
          if ((e.relatedTarget as Node | null) === bodyRef.current) return;
          if (!ready.current) {
            titleRef.current?.focus();
            return;
          }
          commitAndClose();
        }}
        placeholder="Tiêu đề"
        className="w-full bg-transparent font-serif text-base font-semibold leading-tight tracking-tight text-foreground outline-none placeholder:text-muted-foreground/50"
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
          if ((e.relatedTarget as Node | null) === titleRef.current) return;
          if (!ready.current) {
            bodyRef.current?.focus();
            return;
          }
          commitAndClose();
        }}
        placeholder="Nội dung..."
        className="flex-1 resize-none bg-transparent text-sm leading-relaxed text-muted-foreground outline-none placeholder:text-muted-foreground/40"
      />
    </div>
  );
}

registerObjectType({
  type: 'note',
  renderer: NoteRenderer,
  // Milanote parity: card 260x160 gần Milanote 338x default nhưng gọn hơn để bibo
  // toolbar drag preview không quá lớn. Padding 20px + ColorBar 4px cần space.
  defaultGeometry: { width: 260, height: 160, rotation: 0, zIndex: 0 },
  defaultData: (): NoteData => ({ title: '', body: '' }),
  label: 'Note',
  showInToolbar: true,
  renderPreview: () => {
    // Preview toolbar: mimic ObjectShell contrast shadow + ColorBar + padding.
    const el = document.createElement('div');
    el.className =
      'relative h-full w-full rounded-sm bg-card shadow-elevation-2 overflow-hidden';
    el.style.boxShadow =
      'inset 0 0 0 1px var(--background), var(--shadow-elevation-2)';
    el.innerHTML =
      '<div class="absolute inset-x-0 top-0 h-1 bg-primary/60"></div>' +
      '<div class="flex h-full w-full flex-col gap-2 pl-5 pr-5 pb-5 pt-6">' +
      '  <div class="font-serif text-base font-semibold leading-tight tracking-tight text-muted-foreground/60">Tiêu đề</div>' +
      '  <div class="text-sm leading-relaxed text-muted-foreground/40">Nội dung...</div>' +
      '</div>';
    return el;
  },
});
