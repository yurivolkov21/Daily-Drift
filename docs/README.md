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
| [`guides/`](guides/)         | Step-by-step setup outside the code, such as the Google and GitHub sign-in keys.     |

## Conventions

- Specs and ADRs are numbered (`0001-...`) and never renumbered. A replaced decision gets a new ADR that links back.
- A feature starts with a spec, ships as one pull request with tests, and ends with a changelog entry.
- Statuses: specs and roadmap items are **Planned**, **In progress** or **Done**; ADRs are **Accepted** or **Superseded** (with a link to the newer ADR). The design page says what is chosen and what is already built.

## Workflow

- Each change goes on its own branch and opens as a draft pull request.
- The `ci` check (build, lint and format, TypeScript, Pint, PHPStan, tests) must pass before merging; `main` is protected by a ruleset.
- Pull requests are merged with **rebase**, so `main` keeps one commit per change.
- Dependabot opens grouped pull requests for minor and patch updates; each major update comes alone and is reviewed by hand.
