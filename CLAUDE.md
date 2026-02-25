I want to quickly finish end to end prototype.

docs/BUILD-GUIDE.md

Follow TDA, PLOP an Encapsulation.
strict: cleanup, no memory leeks
strict: no double computations, if something can be pre-calculated, it should not be repeated.
strict: never swallow any error, either fail hard or log, based on whether it makes sense to continue, or it completely breaks app. 

# typescript
no hacks, no `as`, no `!` etc. 