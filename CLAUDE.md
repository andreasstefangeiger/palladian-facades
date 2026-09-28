# Claude Code instructions: Palladian Facades

This repository is the legacy visual SVG facade generator. The source-critical
research core, corpus data, evidence model, and current handoff are in:

- https://github.com/andreasstefangeiger/palladio-code

Read `CLAUDE_HANDOFF.md` in that repository before proposing an integration.
Treat this code as an experiment and possible UI/SVG-export source, not as
historical evidence. Do not convert generated facade choices into Palladian
rules unless they are supported by the evidence model in `palladio-code`.

The intended direction is a coordinated product:

1. `palladio-code` remains the canonical scientific data and API layer.
2. Useful concepts from this repository may be modernized into a visual design
   laboratory.
3. Every generated decision should be traceable to an evidence status or be
   clearly marked as a free design variation.
4. Do not start Ollama or long-running local jobs without explicit approval.

