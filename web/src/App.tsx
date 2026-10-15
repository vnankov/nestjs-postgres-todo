import { useCallback, useEffect, useState } from 'react';
import { createTodo, getHealth, listTodos, removeTodo, updateTodo } from './api';
import { QueryLab } from './components/QueryLab';
import { TodoForm } from './components/TodoForm';
import { TodoList } from './components/TodoList';
import type { HealthInfo, Todo, TodoFilter } from './types';

const FILTERS: { id: TodoFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'done', label: 'Done' },
];

export function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<TodoFilter>('all');
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthInfo | null>(null);

  const load = useCallback(async (nextFilter: TodoFilter) => {
    const result = await listTodos(nextFilter);
    setTodos(result.items);
    setTotal(result.total);
    setDurationMs(result.meta.durationMs);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      setLoading(true);
      setError(null);
      try {
        await load(filter);
        const nextHealth = await getHealth();
        if (!cancelled) {
          setHealth(nextHealth);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : 'Could not load todos');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void start();
    return () => {
      cancelled = true;
    };
  }, [filter, load]);

  async function handleCreate(title: string, notes: string) {
    setCreating(true);
    setError(null);
    try {
      await createTodo({ title, notes });
      await load(filter);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not add the todo');
      throw caught;
    } finally {
      setCreating(false);
    }
  }

  async function handleToggle(todo: Todo) {
    setBusyId(todo.id);
    setError(null);
    try {
      await updateTodo(todo.id, { status: todo.status === 'done' ? 'open' : 'done' });
      await load(filter);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update the todo');
    } finally {
      setBusyId(null);
    }
  }

  async function handleSave(id: string, title: string, notes: string) {
    setBusyId(id);
    setError(null);
    try {
      await updateTodo(id, { title, notes });
      await load(filter);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update the todo');
      throw caught;
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await removeTodo(id);
      await load(filter);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not remove the todo');
    } finally {
      setBusyId(null);
    }
  }

  const version = health ? shortVersion(health.database.version) : null;

  return (
    <div className="page">
      <header className="hero">
        <p className="eyebrow">NestJS · React · PostgreSQL</p>
        <h1>Todos</h1>
        <p className="lede">Create a todo, change it, or remove it. The row is saved in Postgres.</p>
        <p className="pipeline">
          Middleware → Guard → Interceptor → Pipe → Controller → Service → PostgreSQL
        </p>
      </header>

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}

      <TodoForm pending={creating} onCreate={handleCreate} />

      <section className="list-section" aria-labelledby="list-title">
        <div className="list-heading">
          <h2 id="list-title">Your list</h2>
          <p className="muted">
            {loading
              ? 'Loading…'
              : `${total} ${total === 1 ? 'todo' : 'todos'}${
                  durationMs === null ? '' : ` · ${durationMs} ms`
                }`}
          </p>
        </div>
        <div className="filters" aria-label="Filter todos">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={filter === item.id}
              className={filter === item.id ? 'filter active' : 'filter'}
              onClick={() => {
                setLoading(true);
                setFilter(item.id);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <TodoList
          todos={todos}
          loading={loading}
          busyId={busyId}
          emptyMessage={filter === 'all' ? 'No todos yet. Add one above.' : 'Nothing in this filter.'}
          onToggle={handleToggle}
          onSave={handleSave}
          onRemove={handleRemove}
        />
      </section>

      <QueryLab />

      <footer>
        {health && version ? (
          <p>
            Server adapter: {health.adapter}. Database: {version}.
          </p>
        ) : (
          <p>Waiting for the API.</p>
        )}
      </footer>
    </div>
  );
}

function shortVersion(version: string): string {
  const match = version.match(/^PostgreSQL\s+[\d.]+/);
  return match?.[0] ?? version;
}
