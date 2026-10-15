export interface PatchSql {
  setSql: string;
  values: unknown[];
  nextIndex: number;
}

/**
 * Builds a parameterized SET clause from a fixed field list.
 * Column names and casts come from that list. Values stay in parameters.
 */
export class PatchBuilder<TField extends string> {
  constructor(
    private readonly fields: readonly TField[],
    private readonly casts: Partial<Record<TField, string>> = {},
  ) {}

  build(patch: Partial<Record<TField, unknown>>, startAt = 1): PatchSql {
    const sets: string[] = [];
    const values: unknown[] = [];
    let index = startAt;

    for (const field of this.fields) {
      if (!Object.prototype.hasOwnProperty.call(patch, field) || patch[field] === undefined) {
        continue;
      }

      const cast = this.casts[field] ?? '';
      sets.push(`${field} = $${index}${cast}`);
      values.push(patch[field]);
      index += 1;
    }

    return {
      setSql: sets.join(', '),
      values,
      nextIndex: index,
    };
  }
}
