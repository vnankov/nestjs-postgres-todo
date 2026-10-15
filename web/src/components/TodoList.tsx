import { FormEvent, useState } from 'react';
import type { Todo } from '../types';

interface TodoListProps {
  todos: Todo[];
  loading: boolean;
  busyId: string | null;
  emptyMessage: string;
  onToggle: (todo: Todo) => Promise<void>;
  onSave: (id: string, title: string, notes: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}

export function TodoList({ todos, loading, busyId, emptyMessage, onToggle, onSave, onRemove }: TodoListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftNotes, setDraftNotes] = useState('');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  function startEdit(todo: Todo) {
    setConfirmingId(null);
    setEditingId(todo.id);
    setDraftTitle(todo.title);
    setDraftNotes(todo.notes ?? '');
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    try {
      await onSave(id, draftTitle, draftNotes);
      setEditingId(null);
    } catch {
      // The page already shows the API error. Keep the draft.
    }
  }

  if (loading) {
    return <p className="muted">Loading todos…</p>;
  }

  if (todos.length === 0) {
    return (
        <p className="empty card">{emptyMessage}</p>
    );
  }

  return (
    <ul className="todos">
      {todos.map((todo) => {
        const busy = busyId === todo.id;
        const editing = editingId === todo.id;
        const confirming = confirmingId === todo.id;

        return (
          <li key={todo.id} className={todo.status === 'done' ? 'todo done' : 'todo'}>
            <label className="check">
              <input
                type="checkbox"
                checked={todo.status === 'done'}
                disabled={busy}
                onChange={() => void onToggle(todo)}
              />
              <span className="sr-only">
                Mark “{todo.title}” {todo.status === 'done' ? 'open' : 'done'}
              </span>
            </label>

            {editing ? (
              <form className="edit" onSubmit={(event) => void saveEdit(event, todo.id)}>
                <input
                  aria-label="Title"
                  value={draftTitle}
                  onChange={(event) => setDraftTitle(event.target.value)}
                  maxLength={200}
                  required
                />
                <textarea
                  aria-label="Notes"
                  value={draftNotes}
                  onChange={(event) => setDraftNotes(event.target.value)}
                  maxLength={2000}
                  rows={2}
                />
                <div className="row-actions">
                  <button type="submit" disabled={busy || draftTitle.trim() === ''}>
                    Save
                  </button>
                  <button type="button" className="ghost" onClick={cancelEdit} disabled={busy}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="todo-body">
                <p className="todo-title">{todo.title}</p>
                {todo.notes ? <p className="todo-notes">{todo.notes}</p> : null}
                <div className="row-actions">
                  <button type="button" className="ghost" onClick={() => startEdit(todo)} disabled={busy}>
                    Edit
                  </button>
                  {confirming ? (
                    <>
                      <span className="confirm-copy">Remove this todo?</span>
                      <button type="button" className="danger" onClick={() => void onRemove(todo.id)} disabled={busy}>
                        Remove
                      </button>
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => setConfirmingId(null)}
                        disabled={busy}
                      >
                        Keep
                      </button>
                    </>
                  ) : (
                    <button type="button" className="ghost" onClick={() => setConfirmingId(todo.id)} disabled={busy}>
                      Remove
                    </button>
                  )}
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
