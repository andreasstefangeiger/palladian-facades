(() => {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const VIEWBOX = { width: 1400, height: 900 };
  const GROUND_Y = 760;

  const PALETTE = {
    facadeMain: "#f6f3ea",
    facadeWing: "#ebe7db",
    facadeDeep: "#ddd8c8",
    line: "#77808d",
    opening: "#1f2530",
    plinth: "#d7ceba",
    step: "#c9bfa9",
    accent: "#0f5172",
    text: "#5b6472"
  };

  const state = {
    widthUnits: 22,
    floors: 5,
    wings: 2,
    rhythm: 62,
    seed: "sgm-001",
    auto: false
  };

  const ui = {
    svg: document.getElementById("facadeSvg"),
    widthRange: document.getElementById("widthRange"),
    widthValue: document.getElementById("widthValue"),
    floorsRange: document.getElementById("floorsRange"),
    floorsValue: document.getElementById("floorsValue"),
    wingsRange: document.getElementById("wingsRange"),
    wingsValue: document.getElementById("wingsValue"),
    rhythmRange: document.getElementById("rhythmRange"),
    rhythmValue: document.getElementById("rhythmValue"),
    seedInput: document.getElementById("seedInput"),
    randomSeed: document.getElementById("randomSeed"),
    regenerate: document.getElementById("regenerate"),
    toggleAuto: document.getElementById("toggleAuto"),
    downloadSvg: document.getElementById("downloadSvg"),
    downloadPng: document.getElementById("downloadPng"),
    statusLine: document.getElementById("statusLine")
  };

  if (!ui.svg) {
    return;
  }

  let autoTimer = null;

  bindControls();
  syncUiWithState();
  render("Startansicht generiert.");

  function bindControls() {
    const rangeBindings = [
      { key: "widthUnits", input: ui.widthRange, output: ui.widthValue },
      { key: "floors", input: ui.floorsRange, output: ui.floorsValue },
      { key: "wings", input: ui.wingsRange, output: ui.wingsValue },
      { key: "rhythm", input: ui.rhythmRange, output: ui.rhythmValue }
    ];

    rangeBindings.forEach(({ key, input, output }) => {
      input.addEventListener("input", () => {
        const value = Number(input.value);
        if (Number.isNaN(value)) {
          return;
        }
        state[key] = value;
        output.textContent = String(value);
        if (key === "rhythm") {
          output.textContent = `${value}`;
        }
        render("Komposition aktualisiert.");
      });
    });

    ui.seedInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") {
        return;
      }
      event.preventDefault();
      commitSeed("Seed gesetzt.");
    });

    ui.seedInput.addEventListener("blur", () => {
      commitSeed("Seed aktualisiert.");
    });

    ui.randomSeed.addEventListener("click", () => {
      state.seed = makeSeed();
      ui.seedInput.value = state.seed;
      render(`Neuer Seed: ${state.seed}`);
    });

    ui.regenerate.addEventListener("click", () => {
      render("Neu generiert.");
    });

    ui.toggleAuto.addEventListener("click", () => {
      setAuto(!state.auto);
      render(state.auto ? "Auto-Generierung aktiv." : "Auto-Generierung pausiert.");
    });

    ui.downloadSvg.addEventListener("click", () => {
      downloadSvg();
    });

    ui.downloadPng.addEventListener("click", () => {
      downloadPng();
    });

    window.addEventListener("keydown", (event) => {
      const target = event.target;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }
      if (event.code === "Space") {
        event.preventDefault();
        render("Neu generiert.");
      }
    });

    window.addEventListener("beforeunload", () => {
      setAuto(false);
    });
  }

  function syncUiWithState() {
    ui.widthRange.value = String(state.widthUnits);
    ui.widthValue.textContent = String(state.widthUnits);
    ui.floorsRange.value = String(state.floors);
    ui.floorsValue.textContent = String(state.floors);
    ui.wingsRange.value = String(state.wings);
    ui.wingsValue.textContent = String(state.wings);
    ui.rhythmRange.value = String(state.rhythm);
    ui.rhythmValue.textContent = String(state.rhythm);

    if (ui.seedInput.value.trim()) {
      state.seed = ui.seedInput.value.trim();
    } else {
      ui.seedInput.value = state.seed;
    }
    ui.toggleAuto.textContent = "Auto: Aus";
  }

  function commitSeed(statusText) {
    const seed = ui.seedInput.value.trim();
    state.seed = seed || makeSeed();
    ui.seedInput.value = state.seed;
    render(statusText);
  }

  function setAuto(enabled) {
    state.auto = enabled;
    if (autoTimer) {
      window.clearInterval(autoTimer);
      autoTimer = null;
    }
    if (enabled) {
      autoTimer = window.setInterval(() => {
        state.seed = makeSeed();
        ui.seedInput.value = state.seed;
        render("Auto-Update");
      }, 7000);
    }
    ui.toggleAuto.textContent = enabled ? "Auto: Ein" : "Auto: Aus";
  }

  function render(statusText) {
    flashRefresh();
    clearSvg(ui.svg);
    ui.svg.setAttribute("viewBox", `0 0 ${VIEWBOX.width} ${VIEWBOX.height}`);
    ui.svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    const rng = mulberry32(hashSeed(state.seed));
    const metrics = computeMetrics();
    const root = svgEl("g", { class: "facade-root" }, ui.svg);

    drawScene(root, rng, metrics);
    setStatus(statusText);
  }

  function drawScene(root, rng, metrics) {
    drawBackdrop(root);
    drawGroundPlane(root, metrics);

    const segments = buildSegments(metrics);
    const drawingOrder = [...segments].sort((a, b) => b.tier - a.tier);
    drawingOrder.forEach((segment) => {
      drawSegment(root, segment, rng, metrics);
    });

    drawCentralStairs(root, segments[0], metrics);
    drawCaption(root);
  }

  function drawBackdrop(root) {
    svgEl(
      "rect",
      {
        x: 0,
        y: 0,
        width: VIEWBOX.width,
        height: VIEWBOX.height,
        fill: "#f6f2e8"
      },
      root
    );

    const skylineY = GROUND_Y - 230;
    svgEl(
      "rect",
      {
        x: 0,
        y: skylineY,
        width: VIEWBOX.width,
        height: GROUND_Y - skylineY,
        fill: "#faf7ee"
      },
      root
    );

    for (let i = 0; i < 12; i += 1) {
      const x = 80 + i * 110;
      svgEl(
        "line",
        {
          x1: x,
          y1: skylineY,
          x2: x,
          y2: GROUND_Y,
          stroke: "rgba(15,81,114,0.06)",
          "stroke-width": 1
        },
        root
      );
    }
  }

  function drawGroundPlane(root, metrics) {
    const tileWidth = clamp(metrics.unit * 1.35, 15, 36);
    const tileCount = Math.ceil((VIEWBOX.width - 140) / tileWidth);

    svgEl(
      "rect",
      {
        x: 70,
        y: GROUND_Y,
        width: VIEWBOX.width - 140,
        height: 34,
        fill: PALETTE.plinth
      },
      root
    );

    for (let i = 0; i < tileCount; i += 1) {
      svgEl(
        "line",
        {
          x1: 70 + i * tileWidth,
          y1: GROUND_Y,
          x2: 70 + i * tileWidth + tileWidth * 0.52,
          y2: GROUND_Y + 34,
          stroke: "rgba(31,37,48,0.06)",
          "stroke-width": 1
        },
        root
      );
    }
  }

  function computeMetrics() {
    const wingWidths = [];
    for (let tier = 1; tier <= state.wings; tier += 1) {
      wingWidths.push(Math.max(7, Math.round(state.widthUnits * (1 - tier * 0.22))));
    }

    const halfBudget = VIEWBOX.width / 2 - 80;
    const gap = 18;
    const denominator = state.widthUnits / 2 + wingWidths.reduce((sum, width) => sum + width, 0);
    const rawUnit = (halfBudget - gap * wingWidths.length) / Math.max(denominator, 1);
    const unit = clamp(rawUnit, 7, 22);
    const floorHeight = clamp(unit * 3.5, 54, 108);

    return { unit, floorHeight, gap, wingWidths };
  }

  function buildSegments(metrics) {
    const centerX = VIEWBOX.width / 2;
    const segments = [
      {
        x: centerX,
        widthUnits: state.widthUnits,
        floors: state.floors,
        tier: 0
      }
    ];

    let outerEdge = (state.widthUnits * metrics.unit) / 2;
    for (let tier = 1; tier <= state.wings; tier += 1) {
      const widthUnits = metrics.wingWidths[tier - 1];
      const floors = Math.max(2, state.floors - tier);
      const half = (widthUnits * metrics.unit) / 2;
      const centerOffset = outerEdge + metrics.gap + half;

      segments.push({ x: centerX - centerOffset, widthUnits, floors, tier });
      segments.push({ x: centerX + centerOffset, widthUnits, floors, tier });
      outerEdge = centerOffset + half;
    }
    return segments;
  }

  function drawSegment(root, segment, rng, metrics) {
    const widthPx = segment.widthUnits * metrics.unit;
    const heightPx = segment.floors * metrics.floorHeight;
    const left = segment.x - widthPx / 2;
    const top = GROUND_Y - heightPx;

    const block = svgEl("g", { "data-tier": segment.tier }, root);
    const facadeColor = segment.tier === 0 ? PALETTE.facadeMain : segment.tier === 1 ? PALETTE.facadeWing : PALETTE.facadeDeep;

    svgEl(
      "rect",
      {
        x: left,
        y: top,
        width: widthPx,
        height: heightPx,
        rx: 2,
        fill: facadeColor,
        stroke: PALETTE.line,
        "stroke-width": 1.2
      },
      block
    );

    for (let level = 1; level < segment.floors; level += 1) {
      const y = GROUND_Y - level * metrics.floorHeight;
      svgEl(
        "line",
        {
          x1: left,
          y1: y,
          x2: left + widthPx,
          y2: y,
          stroke: "rgba(119,128,141,0.55)",
          "stroke-width": 1
        },
        block
      );
    }

    if (segment.widthUnits >= 10) {
      drawColumns(block, left, top, widthPx, heightPx, metrics);
    }

    drawWindows(block, segment, left, rng, metrics);
    drawRoof(block, segment, left, top, widthPx, rng, metrics);
  }

  function drawColumns(parent, left, top, widthPx, heightPx, metrics) {
    const spacing = metrics.unit * 2;
    for (let x = left + metrics.unit; x < left + widthPx - metrics.unit; x += spacing) {
      svgEl(
        "rect",
        {
          x: x - clamp(metrics.unit * 0.08, 1.5, 3),
          y: top + 7,
          width: clamp(metrics.unit * 0.16, 3, 5),
          height: heightPx - 14,
          fill: "rgba(119,128,141,0.3)"
        },
        parent
      );
    }
  }

  function drawWindows(parent, segment, left, rng, metrics) {
    const slots = Math.max(4, segment.widthUnits - 2);
    const slotWidth = (segment.widthUnits * metrics.unit - metrics.unit * 2) / slots;
    const openChance = state.rhythm / 100;

    for (let floor = 0; floor < segment.floors; floor += 1) {
      const baseY = GROUND_Y - floor * metrics.floorHeight - metrics.unit * 0.85;
      if (floor === 0 && segment.tier === 0) {
        drawPortals(parent, left, segment.widthUnits * metrics.unit, baseY, metrics);
        continue;
      }

      for (let i = 0; i < slots; i += 1) {
        const x = left + metrics.unit + slotWidth * i + slotWidth / 2;
        const rhythmOffset = ((floor + i + segment.tier) % 2 === 0) ? 0 : 0.2;
        if (rng() > openChance - rhythmOffset) {
          continue;
        }

        if (rng() < 0.42) {
          drawRoundWindow(parent, x, baseY, slotWidth * 0.53, metrics.floorHeight * 0.46);
        } else {
          drawSquareWindow(parent, x, baseY, slotWidth * 0.54, metrics.floorHeight * 0.48);
        }
      }
    }
  }

  function drawSquareWindow(parent, centerX, baseY, width, height) {
    svgEl(
      "rect",
      {
        x: centerX - width / 2,
        y: baseY - height,
        width,
        height,
        fill: PALETTE.opening
      },
      parent
    );
  }

  function drawRoundWindow(parent, centerX, baseY, width, height) {
    const radius = width / 2;
    const capY = baseY - height + radius;
    svgEl(
      "rect",
      {
        x: centerX - radius,
        y: capY,
        width,
        height: Math.max(4, baseY - capY),
        fill: PALETTE.opening
      },
      parent
    );
    svgEl(
      "circle",
      {
        cx: centerX,
        cy: capY,
        r: radius,
        fill: PALETTE.opening
      },
      parent
    );
  }

  function drawPortals(parent, left, widthPx, baseY, metrics) {
    const portalCount = Math.max(3, Math.floor(widthPx / 190));
    const gap = widthPx / (portalCount + 1);
    for (let i = 1; i <= portalCount; i += 1) {
      const cx = left + gap * i;
      const doorWidth = metrics.unit * 0.76;
      const doorHeight = metrics.floorHeight * 0.75;
      const archRadius = doorWidth / 2;

      svgEl(
        "rect",
        {
          x: cx - doorWidth / 2,
          y: baseY - doorHeight + archRadius * 0.6,
          width: doorWidth,
          height: doorHeight - archRadius * 0.6,
          fill: PALETTE.opening
        },
        parent
      );

      svgEl(
        "circle",
        {
          cx,
          cy: baseY - doorHeight + archRadius * 0.6,
          r: archRadius,
          fill: PALETTE.opening
        },
        parent
      );
    }
  }

  function drawRoof(parent, segment, left, top, widthPx, rng, metrics) {
    const entablatureHeight = clamp(metrics.unit * 0.54, 8, 14);
    const entablatureY = top - entablatureHeight;
    svgEl(
      "rect",
      {
        x: left - 8,
        y: entablatureY,
        width: widthPx + 16,
        height: entablatureHeight,
        fill: "#e5ddca",
        stroke: PALETTE.line,
        "stroke-width": 1
      },
      parent
    );

    const usePediment = segment.tier === 0 || rng() < 0.58;
    if (usePediment) {
      const peak = clamp(widthPx * 0.17, 22, 72);
      const path = [
        `M ${left - 6} ${entablatureY}`,
        `L ${left + widthPx / 2} ${entablatureY - peak}`,
        `L ${left + widthPx + 6} ${entablatureY}`,
        "Z"
      ].join(" ");
      svgEl(
        "path",
        {
          d: path,
          fill: "#efe8d8",
          stroke: PALETTE.line,
          "stroke-width": 1.4
        },
        parent
      );
    } else {
      svgEl(
        "rect",
        {
          x: left - 5,
          y: entablatureY - clamp(metrics.unit * 0.72, 11, 18),
          width: widthPx + 10,
          height: clamp(metrics.unit * 0.72, 11, 18),
          fill: "#d9d1bd",
          stroke: PALETTE.line,
          "stroke-width": 1
        },
        parent
      );
    }
  }

  function drawCentralStairs(root, centralSegment, metrics) {
    const widthPx = centralSegment.widthUnits * metrics.unit;
    const stairWidth = widthPx * 0.74;
    const left = centralSegment.x - stairWidth / 2;
    const stepHeight = clamp(metrics.unit * 0.32, 5, 9);
    const insetStep = clamp(metrics.unit * 0.54, 8, 14);

    for (let step = 0; step < 5; step += 1) {
      const inset = step * insetStep;
      svgEl(
        "rect",
        {
          x: left - inset,
          y: GROUND_Y + step * stepHeight,
          width: stairWidth + inset * 2,
          height: stepHeight,
          fill: PALETTE.step
        },
        root
      );
    }
  }

  function drawCaption(root) {
    const line1 = svgEl(
      "text",
      {
        x: 92,
        y: 72,
        fill: PALETTE.accent,
        "font-family": "IBM Plex Sans, sans-serif",
        "font-size": 16,
        "font-weight": 600,
        "letter-spacing": "0.08em"
      },
      root
    );
    line1.textContent = "PALLADIAN FACADE STUDY";

    const line2 = svgEl(
      "text",
      {
        x: 92,
        y: 95,
        fill: PALETTE.text,
        "font-family": "IBM Plex Sans, sans-serif",
        "font-size": 12,
        "letter-spacing": "0.08em"
      },
      root
    );
    line2.textContent = `seed: ${state.seed}`;
  }

  function flashRefresh() {
    ui.svg.classList.remove("is-refreshing");
    void ui.svg.getBoundingClientRect();
    ui.svg.classList.add("is-refreshing");
  }

  function setStatus(message) {
    const now = new Intl.DateTimeFormat("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).format(new Date());
    ui.statusLine.textContent = `${message} (${now})`;
  }

  function svgEl(tag, attrs, parent) {
    const node = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs).forEach((key) => {
      const value = attrs[key];
      if (value !== undefined && value !== null) {
        node.setAttribute(key, String(value));
      }
    });
    parent.appendChild(node);
    return node;
  }

  function clearSvg(svg) {
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }
  }

  function hashSeed(seed) {
    let hash = 2166136261;
    for (let i = 0; i < seed.length; i += 1) {
      hash ^= seed.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function mulberry32(seed) {
    let value = seed >>> 0;
    return function random() {
      value |= 0;
      value = (value + 0x6d2b79f5) | 0;
      let t = Math.imul(value ^ (value >>> 15), 1 | value);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function makeSeed() {
    const prefix = ["san", "giorgio", "palladio", "venezia", "facade", "portico"];
    const word = prefix[Math.floor(Math.random() * prefix.length)];
    const stamp = Date.now().toString(36).slice(-5);
    return `${word}-${stamp}`;
  }

  function toDownloadName(extension) {
    const cleaned = state.seed.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
    const stem = cleaned || "palladian-facade";
    return `${stem}.${extension}`;
  }

  function serializeSvg() {
    const clone = ui.svg.cloneNode(true);
    clone.setAttribute("xmlns", SVG_NS);
    clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
    const serialized = new XMLSerializer().serializeToString(clone);
    return `<?xml version="1.0" encoding="UTF-8"?>\n${serialized}`;
  }

  function downloadSvg() {
    const svgText = serializeSvg();
    const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
    triggerDownload(blob, toDownloadName("svg"));
    setStatus("SVG exportiert.");
  }

  function downloadPng() {
    const svgText = serializeSvg();
    const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = VIEWBOX.width * 2;
      canvas.height = VIEWBOX.height * 2;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        URL.revokeObjectURL(svgUrl);
        setStatus("PNG Export fehlgeschlagen.");
        return;
      }

      ctx.scale(2, 2);
      ctx.fillStyle = "#f6f2e8";
      ctx.fillRect(0, 0, VIEWBOX.width, VIEWBOX.height);
      ctx.drawImage(image, 0, 0, VIEWBOX.width, VIEWBOX.height);

      canvas.toBlob((blob) => {
        if (blob) {
          triggerDownload(blob, toDownloadName("png"));
          setStatus("PNG exportiert.");
        } else {
          setStatus("PNG Export fehlgeschlagen.");
        }
      }, "image/png");

      URL.revokeObjectURL(svgUrl);
    };

    image.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      setStatus("PNG Export fehlgeschlagen.");
    };

    image.src = svgUrl;
  }

  function triggerDownload(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }
})();
