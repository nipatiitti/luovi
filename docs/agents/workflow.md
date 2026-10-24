# Agentic workflow

How a multi-slice build is cut, briefed, checked and handed off.

- Work is cut into small slices. A slice brief says "this file needs something like this", never code. The agent that takes a slice has implementation authority within it.

- An agent ends its slice with context under 200k tokens. If a slice will not fit, split it before starting.

- A ticket that carries a benchmark is one brief: the same agent writes the code and the benchmark module the ticket names, from the ticket's acceptance criteria. The sweeper is the independent check: it runs the benchmark and reads the gate against the ticket, and a gate loosened to make the implementer's own code pass is a finding.

- A slice agent's own check is `pnpm check`: the tree compiles, lints and respects the package boundaries. Verification of behaviour belongs to the sweeper and the benchmarks.

- `pnpm validate` is the quick benchmark tier and is run once per batch by the sweeper, never by a slice agent. `pnpm validate --full` is run by the coordinator's final sweep or by CI on main.

- One agent writes one slice.

- After a few slices land, a separate sweeper reads the diffs and reports problems. A separate fixer fixes them. At most two sweep-and-fix rounds per batch.

- A ticket whose acceptance has a visual or feel criterion (a look, a camera feel, motion) ends with Niilo looking at it before merge. Until he has, it carries the `ready-for-human` label.

- To see a visual change before showing it to Niilo, run `pnpm shots`: it captures the scenario tool's named views on one contact sheet with their GPU pass timings. A missing view is added to `packages/tool-scenario/src/lib/shots.ts` rather than written as a capture script of your own.

- The coordinator spends no context on sweeping or fixing; it delegates both and reads only the reports.

- The coordinator ends with one final sweep of all changes against the plan and leaves the tree ready for hand-off to a fresh designer and coordinator pair.
