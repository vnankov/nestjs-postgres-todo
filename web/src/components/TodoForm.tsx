import { FormEvent, useState } from 'react';

interface TodoFormProps {
  pending: boolean;
  onCreate: (title: string, notes: string) => Promise<void>;
}

export function TodoForm({ pending, onCreate }: TodoFormProps) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (title.trim() === '') {
      return;
    }
    try {
      await onCreate(title, notes);
      setTitle('');
      setNotes('');
    } catch {
      // The page already shows the API error. Keep the draft.
    }
  }

  return (
    <form className="card form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="title">Title</label>
        <input
          id="title"
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={200}
          placeholder="Write the next thing"
          autoComplete="off"
          required
        />
      </div>
      <div className="field">
        <label htmlFor="notes">Notes</label>
        <textarea
          id="notes"
          name="notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          maxLength={2000}
          rows={2}
          placeholder="Optional"
        />
      </div>
      <button type="submit" disabled={pending || title.trim() === ''}>
        {pending ? 'Adding…' : 'Add todo'}
      </button>
    </form>
  );
}
