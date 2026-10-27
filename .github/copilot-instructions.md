# Agent Instructions

## Core Game Rules
- **Display a discrete version in the main menu**: Always display a discrete version number in the main menu, incrementing slowly from `0.1` (e.g., `v0.1`, `v0.2`, `v0.3`...). It must be small, subtle, and unobtrusive so deployments can easily be verified.
- **No screen may require scrolling** at 390x740 and 360x640, and no text may be cut off. All tests in `tools/tests/` must pass.
- **Yellow is reserved** for the main action button and key rewards only.
