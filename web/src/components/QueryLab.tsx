import { useState } from 'react';
import { clearSamples, getPlan, seedSamples } from '../api';
import type { ExplainReport, PlanView } from '../types';

export function QueryLab() {
  const [report, setReport] = useState<ExplainReport | null>(null);
  const [busy, setBusy] = useState<'plan' | 'seed' | 'clear' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function runPlan() {
    setBusy('plan');
    setError(null);
    setNotice(null);
    try {
      setReport(await getPlan());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not read the plan');
    } finally {
      setBusy(null);
    }
  }

  async function insertSamples() {
    setBusy('seed');
    setError(null);
    try {
      const result = await seedSamples();
      setNotice(`Inserted ${result.inserted.toLocaleString()} sample rows.`);
      setReport(await getPlan());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not insert sample rows');
    } finally {
      setBusy(null);
    }
  }

  async function removeSamples() {
    setBusy('clear');
    setError(null);
    try {
      const result = await clearSamples();
      setNotice(`Removed ${result.deleted.toLocaleString()} sample rows.`);
      setReport(await getPlan());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not remove sample rows');
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="lab" aria-labelledby="lab-title">
      <div className="lab-heading">
        <h2 id="lab-title">Query plan</h2>
        <p>
          Runs <code>EXPLAIN</code> and <code>EXPLAIN ANALYZE</code> on one fixed read. Sample rows
          give the planner a table large enough to cost.
        </p>
      </div>

      <div className="lab-actions">
        <button type="button" onClick={() => void runPlan()} disabled={busy !== null}>
          {busy === 'plan' ? 'Running…' : 'Run EXPLAIN ANALYZE'}
        </button>
        <button type="button" className="ghost light" onClick={() => void insertSamples()} disabled={busy !== null}>
          {busy === 'seed' ? 'Inserting…' : 'Insert 5,000 sample rows'}
        </button>
        <button type="button" className="ghost light" onClick={() => void removeSamples()} disabled={busy !== null}>
          {busy === 'clear' ? 'Removing…' : 'Remove sample rows'}
        </button>
      </div>

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? <p className="notice">{notice}</p> : null}

      {report ? (
        <div className="report">
          <p className="stats">
            {report.stats.exact.toLocaleString()} rows in <code>todos</code>
            {report.stats.estimatedRows === null
              ? '. The planner has no row estimate yet.'
              : ` · planner estimate ${report.stats.estimatedRows.toLocaleString()}`}
            . {report.stats.userCount.toLocaleString()} user · {report.stats.sampleCount.toLocaleString()} sample.
          </p>
          <pre className="sql">{report.sql}</pre>
          <div className="plans">
            <PlanCard title="Estimate only" plan={report.estimated} />
            <PlanCard title="EXPLAIN ANALYZE" plan={report.actual} />
            <PlanCard title="Sequential scan disabled" plan={report.sequentialScanDisabled} />
          </div>
          <ol className="notes">
            {report.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ol>
          <details>
            <summary>Raw JSON plan</summary>
            <pre>{JSON.stringify(report.actual.raw, null, 2)}</pre>
          </details>
        </div>
      ) : (
        <p className="lab-empty">
          Run the plan when you want estimated cost, actual time, and the index name side by side.
        </p>
      )}
    </section>
  );
}

function PlanCard({ title, plan }: { title: string; plan: PlanView }) {
  return (
    <article className="plan">
      <h3>{title}</h3>
      <p className="path">{plan.path}</p>
      <dl>
        <div>
          <dt>Estimated rows</dt>
          <dd>{plan.estimatedRows.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Actual rows</dt>
          <dd>{plan.actualRows === null ? 'Not executed' : plan.actualRows.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Planning</dt>
          <dd>{formatMs(plan.planningMs)}</dd>
        </div>
        <div>
          <dt>Execution</dt>
          <dd>{formatMs(plan.executionMs)}</dd>
        </div>
        {plan.executed ? (
          <div>
            <dt>Buffers</dt>
            <dd>
              {plan.sharedHitBlocks ?? 0} cache hit · {plan.sharedReadBlocks ?? 0} read
            </dd>
          </div>
        ) : null}
      </dl>
      <p className="index-line">
        {plan.indexes.length > 0 ? `Index: ${plan.indexes.join(', ')}` : 'No index name in this plan'}
      </p>
    </article>
  );
}

function formatMs(value: number | null): string {
  if (value === null) {
    return 'Not run';
  }
  return `${value.toFixed(2)} ms`;
}
