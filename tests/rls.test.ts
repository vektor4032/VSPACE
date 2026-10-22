import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { it, expect } from "vitest";
import { initialState } from "../src/data";
it("PostgreSQL migration enforces ownership, CAS and anonymous denial", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;insert into auth.users values ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');`,
    );
    const migration = readFileSync(
      "supabase/migrations/202610220001_workspace.sql",
      "utf8",
    );
    await db.exec(migration);
    await db.exec(migration);
    await db.exec(
      `set role authenticated;set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001'`,
    );
    const first = await db.query<{ revision: number }>(
      "select public.save_vspace_workspace(0,$1::jsonb) as revision",
      [JSON.stringify(initialState)],
    );
    expect(Number(first.rows[0].revision)).toBe(1);
    await expect(
      db.query("select public.save_vspace_workspace(0,$1::jsonb)", [
        JSON.stringify(initialState),
      ]),
    ).rejects.toThrow("revision conflict");
    expect(
      (await db.query("select * from public.vspace_workspaces")).rows,
    ).toHaveLength(1);
    await db.exec(
      `set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002'`,
    );
    expect(
      (await db.query("select * from public.vspace_workspaces")).rows,
    ).toHaveLength(0);
    await expect(
      db.query("update public.vspace_workspaces set revision=99"),
    ).rejects.toThrow("permission denied");
    await db.query("select public.save_vspace_workspace(0,$1::jsonb)", [
      JSON.stringify({
        ...initialState,
        profile: { name: "Second", focus: "" },
      }),
    ]);
    expect(
      (await db.query("select * from public.vspace_workspaces")).rows,
    ).toHaveLength(1);
    await db.exec("reset role;set role anon");
    await expect(
      db.query("select * from public.vspace_workspaces"),
    ).rejects.toThrow("permission denied");
    await expect(
      db.query("select public.save_vspace_workspace(0,$1::jsonb)", [
        JSON.stringify(initialState),
      ]),
    ).rejects.toThrow("permission denied");
  } finally {
    await db.close();
  }
}, 20000);
