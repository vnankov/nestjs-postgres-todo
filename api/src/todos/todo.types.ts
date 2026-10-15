export const TODO_STATUSES = ['open', 'done'] as const;
export type TodoStatus = (typeof TODO_STATUSES)[number];

export const TODO_SOURCES = ['user', 'sample'] as const;
export type TodoSource = (typeof TODO_SOURCES)[number];

export const TODO_PATCH_FIELDS = ['title', 'notes', 'status'] as const;
export type TodoPatchField = (typeof TODO_PATCH_FIELDS)[number];

export interface Todo {
  id: string;
  title: string;
  notes: string | null;
  status: TodoStatus;
  source: TodoSource;
  createdAt: string;
  updatedAt: string;
}

export interface TodoRow {
  id: string;
  title: string;
  notes: string | null;
  status: TodoStatus;
  source: TodoSource;
  created_at: Date;
  updated_at: Date;
}

export interface Mapper<TInput, TOutput> {
  toDomain(input: TInput): TOutput;
}

export interface TableStats {
  exact: number;
  userCount: number;
  sampleCount: number;
  estimatedRows: number | null;
}

export interface TodoPatch {
  title?: string;
  notes?: string | null;
  status?: TodoStatus;
}
