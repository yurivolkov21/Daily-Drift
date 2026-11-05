# Daily-Drift docs

Everything about the project beyond the code: what we are building, why, and how it changes over time.

| Folder                       | What it holds                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------ |
| [`plan/`](plan/)             | The roadmap: phases, features and their status.                                      |
| [`spec/`](spec/)             | One spec per feature or phase: data model, rules, permissions, acceptance criteria.  |
| [`design/`](design/)         | UI direction: screens, layouts and the shadcn/ui blocks and components chosen.       |
| [`tech-stack/`](tech-stack/) | Tools and versions in use, and the minimum versions required.                        |
| [`decisions/`](decisions/)   | Architecture decision records (ADRs): one short file per decision and its reasoning. |
| [`changelog/`](changelog/)   | What changed, newest first.                                                          |

## Conventions

- Specs and ADRs are numbered (`0001-...`) and never renumbered. A replaced decision gets a new ADR that links back.
- A feature starts with a spec, ships as one pull request with tests, and ends with a changelog entry.
- Statuses used across docs: **Planned**, **In progress**, **Done**.
