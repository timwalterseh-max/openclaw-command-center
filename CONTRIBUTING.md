# Contributing

## Workflow

1. Keep changes small and focused.
2. Prefer trunk-first development with short-lived branches for risky work.
3. Update docs in `docs/` when behavior or interfaces change.

## Commit Style

Use clear, scoped commit messages:
- `chore: ...`
- `feat: ...`
- `fix: ...`
- `docs: ...`

## Quality Bar

- Keep the GUI <-> bridge contract aligned with `docs/gui-tui-contract-v0.md`.
- Add or update tests for bridge behavior where practical.
- Avoid leaking secrets in logs, screenshots, or commit history.
