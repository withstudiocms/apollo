# Contribution Guide

⚠️ WIP

## Adding a new Status

You can add a new status by creating a new `.json` file in `src/activities`.

Make sure you follow the schema by including it in the file:

```jsonc
{
  "$schema": "../activities.schema.json",
  // ...
}
```

You don't need to add the "Listening to" or "Playing" parts to the name, they get added automatically.

The only type where you need to write out the entire status is `custom`.