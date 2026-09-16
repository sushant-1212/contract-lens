---
name: GitHub publishing
description: GitHub connector behavior for publishing a complete workspace tree
---

When publishing to a newly created empty GitHub repository through the connector,
bootstrap the repository with one Contents API commit before using the Git Data
API to create the full tree and advance the main ref.

**Why:** GitHub returns 409 "Git Repository is empty" when creating a tree
directly against a repository with no initial commit.

**How to apply:** Use the authenticated connector proxy, never put OAuth
credentials in a local Git remote or source file.