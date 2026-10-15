export interface ResponseMeta {
  requestId: string;
  durationMs: number;
}

export class ApiResponse<T> {
  constructor(
    public readonly data: T,
    public readonly meta: ResponseMeta,
  ) {}
}
