I want to quickly finish end to end prototype.

docs/BUILD-GUIDE.md

Follow TDA, PLOP and Encapsulation.
strict: cleanup, no memory leaks
strict: no double computations, if something can be pre-calculated, it should not be repeated.
strict: never swallow any error, either fail hard or log, based on whether it makes sense to continue, or it completely breaks app.
strict: no spooky action at a distance

# typescript
no hacks, no `as`, no `!` etc.

# scripts
pnpm dev, pnpm build (tsc && vite build), pnpm preview
