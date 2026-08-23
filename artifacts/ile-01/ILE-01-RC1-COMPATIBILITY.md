# RC1 Compatibility Review

| RC1 assumption | Evidence | ILE assessment | Required planning control |
|---|---|---|---|
| Next.js 16.3.1, React 19, Node build/start scripts | `package.json` | PASS | Pin supported Vercel Node runtime before implementation |
| App Router API route | `app/api/local/workitems/route.ts` | PASS WITH CONTROL | Node/server runtime only; no edge database execution |
| Local PostgreSQL adapter shells out to `psql` and uses Unix socket | `src/pn03/postgres-adapter.ts` | BLOCKER FOR DIRECT DEPLOYMENT | Separate managed-PostgreSQL repository adapter, explicitly authorized before implementation |
| Fixed synthetic principal header | `src/iaf01/local-runtime.ts` | ADAPTER REQUIRED | ILE identity adapter must produce server-validated session identity; browser header cannot become production authority |
| Transaction-scoped tenant policy / RLS | PN-03/IAF baseline | PASS WITH CONTROL | Use a driver supporting explicit begin/set-local/reset/commit-or-rollback with fail-closed cleanup |
| Global in-memory service/audit state | local runtime | ADAPTER REQUIRED | Do not rely on function-instance memory for durable audit/idempotency/live state |
| Health/readiness methods exist but no routes | IAF-01 service | ADAPTER REQUIRED | Add only separately authorized operational route/adaptor before launch |
| Filesystem persistence | RC1 local harness only | PASS | Do not rely on Vercel filesystem writes |
| Background jobs/realtime/websocket | no proven RC1 requirement | PASS | Do not introduce queue, Redis, Kafka, or microservices |

**Conclusion:** the selected stack is viable only after a minimal environment-specific deployment adapter is separately authorized. RC1 itself remains immutable; no adapter is implemented in ILE-01 planning.
