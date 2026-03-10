A refreshed Palladian facade generator for the web.

The original ProcJam 2015 experiment is still in this repo (`palladio.ls`), but the active front-end now uses a modern static setup:

- responsive control panel (width, floors, wings, rhythm, seed)
- deterministic generation by seed
- direct `SVG` and `PNG` export
- no build step required for the default UI

## Run

Open `index.html` in a browser, or serve the folder with a local static server:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.
