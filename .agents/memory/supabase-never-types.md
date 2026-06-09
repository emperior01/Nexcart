---
name: Supabase v2 never types
description: Why Supabase v2 column-select queries return `never` and how to fix them.
---

## The rule
When `@supabase/supabase-js` v2 uses `.select("col1,col2")` or `.update()`/`.insert()`/`.upsert()`, TypeScript's template literal type inference can collapse to `never` even when the table and columns exist in the Database type. This is a known Supabase v2 generic inference limitation.

## How to apply
- **Query results** (`select`): cast immediately after destructuring: `const data = result.data as ExpectedType[] | null`
- **Mutation arguments** (insert/upsert/update): when `as any` still errors on `never` parameter, cast the whole builder: `(supabase.from("table") as any).update(payload)`
- **`site_settings`** and any new tables: must be added to `src/integrations/supabase/types.ts` Database type first.

**Why:** Supabase v2's `GetResult<Schema, Row, TableName, Relationships, Query>` template literal type parser fails under TypeScript 5.x strict generics for certain select strings and mutation shapes.
