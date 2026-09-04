"""Ordinary consumers of the generated packages (FR-079).

Each example does what a real consumer does: import the package, build a
conforming value, serialize it, and be refused a value the contract forbids.
Each is executed by the repository's own suite, so an example that stopped
working is a failing gate rather than stale documentation.
"""
