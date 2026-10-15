# Todos

A small todo app: React on `http://localhost:5173`, NestJS on `http://localhost:3000/api`, PostgreSQL in Docker. You can create a todo, update its title, notes, and status, and remove it. A query-plan panel runs `EXPLAIN` and `EXPLAIN ANALYZE` so the database topics are visible, not only described.

## Run

```powershell
docker compose up -d
npm install
npm run dev
```

Open http://localhost:5173.

The API applies `api/src/database/schema.sql` on startup. The default connection string is `postgres://todo:todo@localhost:5433/todo`. Host port 5433 is mapped to Postgres inside Docker so it does not collide with a local Postgres already bound to 5432. Copy `.env.example` to `.env` only if you need to change it.

```powershell
npm test
docker compose exec postgres psql -U todo -d todo
```

If port 5433 is already taken, change the host port in `docker-compose.yml` and set `DATABASE_URL` to match.

## What happens to one request

```
Request
  RequestLoggerMiddleware     api/src/common/middleware/request-logger.middleware.ts
  DebugGuard                  only on /api/todos/debug/* 
  ResponseEnvelopeInterceptor before the handler, then again on the way out
  ValidationPipe              body and query DTOs
  ParseUuidPipe               :id on update and delete
  TodosController
  TodosService
  TodosRepository / QueryRunner
  PostgreSQL
```

If any step after the middleware throws, `ApiExceptionFilter` writes one error JSON. Middleware itself runs in Express, before Nest's exception filters.

The list header shows the interceptor's `durationMs`. The footer shows the server adapter name from `HttpAdapterHost`.

## Interview map

### Dependency Injection & Modules

`AppModule` imports three modules. `ConfigModule.forRoot({ isGlobal: true })` publishes `ConfigService` to every module. `DatabaseModule` owns the pool and exports `DatabaseService`, `QueryRunner`, and the `PG_POOL` token. `TodosModule` imports `DatabaseModule` and does not re-export it, so the pool stays an implementation detail.

Providers are registered in the module `providers` array. Nest creates them and passes them to constructors. That is constructor injection.

Custom providers in this app:

| Token | Kind | Where |
| --- | --- | --- |
| `PG_POOL` | `useFactory` + `inject: [ConfigService]` | `database.module.ts` |
| `APP_LIMITS` | `useValue` | `todos.module.ts` |
| `APP_PIPE` | `useValue` | `app.module.ts` |
| `APP_FILTER`, `APP_INTERCEPTOR` | `useClass` | `app.module.ts` |

`useClass` asks Nest to construct the class. `useValue` registers an object you already built. `useFactory` runs a function when another provider has to be created first. A `Symbol` token is useful when the thing you inject is not a class, such as a `pg` `Pool`.

Default scope is singleton: one `TodosService` for the whole process. `Scope.REQUEST` creates a new instance per request, and every provider that injects it becomes request-scoped too. This app keeps that graph singleton. The middleware stores `requestId` on the Express request, and the interceptor reads it from there.

`OnModuleInit` in `DatabaseService` waits for Postgres and applies the schema. `OnModuleDestroy` closes the pool. `enableShutdownHooks()` in `main.ts` is what makes that destroy hook run on shutdown.

### Server Adapters

`main.ts` builds an Express app, attaches the request-id middleware to that instance, and passes it to `new ExpressAdapter(server)`. Controllers use `@Get` and `@Body`, not `req` and `res`, so the HTTP library sits behind the adapter. The request-id middleware lives on Express itself so it runs before Nest's JSON parser.

`HealthController` injects `HttpAdapterHost` and returns `httpAdapter.getType()`. The footer prints that value (`express`).

`@nestjs/platform-fastify` supplies `FastifyAdapter`. The swap is the adapter line plus the package. Class-based Nest middleware still works. Raw Express middleware (`app.use(someExpressMiddleware)`) needs Fastify's middleware layer, which is the usual follow-up.

### Middleware, Guards, Interceptors, Pipes

They run in that order, and they answer different questions.

Middleware runs first and does not yet know which handler will run. `RequestLoggerMiddleware` assigns a request id, stores the start time, and logs when the response finishes. It is a class, so Nest can inject `ConfigService`. A plain function middleware cannot take constructor dependencies. Because this one has dependencies, it is listed in `AppModule` providers. The `{*path}` route is the Nest 11 wildcard.

A guard decides whether the handler may run. `DebugGuard` allows `/todos/debug/*` in development. In production it requires the `x-debug-key` header. It returns a boolean or throws `ForbiddenException`. Guards can inject services. Middleware is a weaker place for authorization because it does not see the route metadata as cleanly.

An interceptor wraps the call. `ResponseEnvelopeInterceptor` does not change the controller's return value in the class itself. It maps the stream with RxJS `map` into an `ApiResponse`, so every success body is `{ data, meta }`. The same interceptor can also measure time, cache, or map exceptions. It sees the `ExecutionContext`, including the handler.

A pipe transforms or validates the arguments before the method runs. The global `ValidationPipe` instantiates the DTO (`transform: true`), drops unknown fields (`whitelist`), and rejects extra fields (`forbidNonWhitelisted`). `ParseUuidPipe` runs on `@Param('id', ParseUuidPipe)` and throws `BadRequestException` for a bad id. Pipes are the right place for "is this input well formed?"

The exception filter is the last piece. `ApiExceptionFilter` turns `HttpException` and a few Postgres error codes into `{ statusCode, message, path, requestId }`. Check violations (`23514`) and invalid input (`22P02`) become 400. The client never receives a raw database message.

### Controllers, Services / Providers

`TodosController` is the HTTP edge: routes, status codes, and parameter binding. Nest's default for `@Post` is 201. The controller returns a promise. It does not know SQL.

`TodosService` is the rule layer. An empty patch is 400. A missing row is 404.

`TodosRepository` is the SQL. `TodoMapper` turns a `TodoRow` into the API shape. `ExplainService` is a separate provider for the lab, so the product service does not contain `EXPLAIN`.

A provider is anything Nest can inject: a service, a repository, a guard, a pipe, a mapper. `@Injectable()` marks a class as one. Controllers are providers too, but you register them in `controllers` so Nest also binds routes.

### TypeScript

DTOs are classes because `ValidationPipe` and `class-transformer` need constructor types. Response bodies are interfaces (`Todo`) because nothing reflects over them at runtime.

`as const` on `TODO_STATUSES` keeps the union `'open' | 'done'` attached to the array, and `@IsIn(TODO_STATUSES)` uses that same list. The Postgres enum uses the same labels.

`emitDecoratorMetadata` and `experimentalDecorators` are on in `api/tsconfig.json`. Nest reads the emitted design type to know what to inject. `useDefineForClassFields` is off so that metadata stays intact.

### Generics

- `ApiResponse<T>` is the envelope around any payload.
- `QueryRunner.query<T>()` types the rows. `withTransaction<T>()` types the value the callback returns.
- `Mapper<TInput, TOutput>` is implemented by `TodoMapper`.
- `PatchBuilder<TField>` only accepts keys from the field list you gave it.
- `PipeTransform<string, string>` and `NestInterceptor<T, ApiResponse<T>>` are Nest's own generic interfaces.

The useful line in an interview: generics describe a shape once, and the caller fills in the concrete type. They disappear at runtime. Decorators and the validation classes are what still exist when the request arrives.

### Utility Classes

`ApiResponse`, `PatchBuilder`, and `PlanSummary` are ordinary classes. They are not registered as providers. They have no dependencies and no lifecycle.

`PatchBuilder` is the one to walk through. Column names are taken from `TODO_PATCH_FIELDS`, never from the JSON keys. Values are `$1`, `$2`, and so on. `status` gets an explicit `::todo_status` cast. A field set to `null` is kept, so notes can be cleared. A field set to `undefined` is skipped.

`PlanSummary.fromExplain` is a static helper that reads the JSON plan Postgres returns. The repository does not need to know that format.

### PostgreSQL specifics

The schema is `api/src/database/schema.sql`.

- `todo_status` and `todo_source` are enums. A bad label fails in the database even if a client skips the pipe.
- `timestamptz` stores an absolute instant and converts it for display using the session `TimeZone`. `timestamp` without time zone does not convert.
- `CHECK` constraints limit the title and the notes. The pipe checks the same rules at the edge. The constraint is what protects every other client.
- `gen_random_uuid()` is built into PostgreSQL 13 and later. It produces UUID v4. Random v4 values scatter across a B-tree. At this size that does not matter. UUID v7 or a `bigint identity` is the usual answer if an interviewer asks about index locality.
- Two partial indexes: `todos_user_created_idx` for `source = 'user'`, and `todos_open_created_idx` for `status = 'open'`. A partial index can be used only when the query implies its predicate. The lab query does not filter `source`, so it cannot use the user index. It does filter `status = 'open'`, so it can use the open index.
- `BEFORE UPDATE` trigger sets `updated_at`. The function pins `search_path = pg_catalog` so a later schema object cannot shadow `now()`.
- Inserts, updates, and deletes use `RETURNING`, so the API gets the saved row without a second statement.
- List uses `BEGIN ISOLATION LEVEL REPEATABLE READ` so the page and the `count(*)` share one snapshot. The default isolation is `READ COMMITTED`.
- Update locks the row with `SELECT ... FOR UPDATE` and holds that row lock until commit. A second update of the same row waits. Readers without `FOR UPDATE` can still read the old version.
- Seed uses `generate_series` and an `interval` subtraction. `ANALYZE todos` then refreshes planner statistics.
- `pg_class.reltuples` is the planner's row estimate. `count(*)` is exact. `count(*)` comes back from `node-postgres` as a string when it is `bigint`, so the queries cast it to `int`.
- Every value from the client is a parameter (`$1`, `$2`). The only interpolated SQL is the whitelisted `SET` clause.

Open a session with `docker compose exec postgres psql -U todo -d todo`, then `\d todos` and `\dT+ todo_status`.

### DB debugging with EXPLAIN [ANALYZE]

`GET /api/todos/debug/plan` runs three plans of one fixed `SELECT` inside a transaction:

1. `EXPLAIN (FORMAT JSON)` — planner estimate, query not executed.
2. `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` — the query runs, then you get actual rows, time, and buffer counts.
3. The same analyzed plan after `SET LOCAL enable_seqscan = off`.

`SET LOCAL` lasts until the transaction ends. `statement_timeout` is set to 5 seconds for that transaction. `track_io_timing` is on in Docker so I/O time can appear in the raw JSON.

How to read it:

- **Plan rows vs actual rows.** A large gap means stale statistics or a hard-to-estimate predicate. `ANALYZE todos` updates the statistics.
- **Shared hit blocks** were in Postgres shared buffers. **Shared read blocks** were not.
- **Seq Scan on a small table is often the right plan.** An index is extra random I/O. Disabling sequential scans shows whether the partial index is usable. Leaving `enable_seqscan` off in production hides planner mistakes.
- **`EXPLAIN ANALYZE` executes the statement.** On a `SELECT` that is a read. On `INSERT`, `UPDATE`, or `DELETE` it writes. Analyze a write only inside a transaction you roll back.
- The root node of a `LIMIT 20` plan reports estimated rows for the limit, not for the whole table. Read the child scan as well in the raw JSON.
- On a few thousand rows this query is still tiny. The point of the lab is to recognize the nodes, not to celebrate a fast number.

In the UI: insert 5,000 sample rows, run the plan, then compare "Estimate only" with "EXPLAIN ANALYZE" and with "Sequential scan disabled". Your own todos stay out of that seed. Sample rows use `source = 'sample'` and the main list only returns `source = 'user'`.

## Demo you can walk through

1. Add a todo, edit the title, mark it done, filter to Done, then remove it. The terminal prints one line per request from the middleware.
2. Open `todos.controller.ts`, then `todos.service.ts`, then `todos.repository.ts`, and point at validation, the 404, and `FOR UPDATE`.
3. Insert sample rows and run the plan. Say out loud that `ANALYZE` executed the `SELECT`, and that a sequential scan on a small table can be the cheaper plan.
4. Finish on `main.ts` and the footer: the adapter is Express, and the controllers would not change for Fastify.

## Layout

```
api/src/main.ts                 Express adapter, prefix, shutdown hooks
api/src/app.module.ts           module graph and global pipe, filter, interceptor
api/src/database/schema.sql     enums, checks, partial indexes, trigger
api/src/todos/                  controller, service, repository, lab
web/src/                       React list and query-plan panel
```
