(() => {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const VIEWBOX = { width: 1400, height: 900 };
  const GROUND_Y = 760;

  const COLOR_SCHEMES = [
    {
      name: "calcare",
      sky: "#f6f2e8",
      skyBand: "#faf7ee",
      facadeMain: "#f6f3ea",
      facadeWing: "#ebe7db",
      facadeDeep: "#ddd8c8",
      trim: "#e5ddca",
      roof: "#efe8d8",
      line: "#77808d",
      opening: "#1f2530",
      plinth: "#d7ceba",
      step: "#c9bfa9",
      accent: "#0f5172",
      text: "#5b6472"
    },
    {
      name: "travertino",
      sky: "#f8f2e6",
      skyBand: "#f4ebd9",
      facadeMain: "#f7f0e1",
      facadeWing: "#ece2ce",
      facadeDeep: "#d8ccb2",
      trim: "#e3d6bd",
      roof: "#ebdcc1",
      line: "#816f57",
      opening: "#2a2620",
      plinth: "#d5c4a8",
      step: "#c8b596",
      accent: "#8b5e34",
      text: "#6a5a47"
    },
    {
      name: "pietra-fredda",
      sky: "#f2f5f7",
      skyBand: "#e8edf2",
      facadeMain: "#eff3f6",
      facadeWing: "#e2e9f0",
      facadeDeep: "#d2dbe5",
      trim: "#dbe3eb",
      roof: "#e7edf3",
      line: "#657385",
      opening: "#1f2733",
      plinth: "#c4cfda",
      step: "#b5c1cd",
      accent: "#1e4d70",
      text: "#526072"
    }
  ];

  const STYLE_PART_A = ["Nobile", "Severa", "Basilica", "Loggia", "Portico", "Serliana"];
  const STYLE_PART_B = ["Classico", "Civico", "Monumentale", "Teatrale", "Rustico", "Ordinato"];

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
  regenerateWithNewSeed("Startansicht generiert.");

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
      regenerateWithNewSeed("Neuer Seed");
    });

    ui.regenerate.addEventListener("click", () => {
      regenerateWithNewSeed("Neu generiert");
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
        regenerateWithNewSeed("Neu generiert");
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

  function regenerateWithNewSeed(prefix) {
    state.seed = makeSeed();
    ui.seedInput.value = state.seed;
    render(`${prefix} (${state.seed})`);
  }

  function setAuto(enabled) {
    state.auto = enabled;
    if (autoTimer) {
      window.clearInterval(autoTimer);
      autoTimer = null;
    }
    if (enabled) {
      autoTimer = window.setInterval(() => {
        regenerateWithNewSeed("Auto-Update");
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
    const variation = buildVariation(rng);
    const metrics = computeMetrics(variation);
    const root = svgEl("g", { class: "facade-root" }, ui.svg);

    drawScene(root, rng, metrics, variation);
    setStatus(`${statusText} | Typus: ${variation.label}`);
  }

  function drawScene(root, rng, metrics, variation) {
    drawBackdrop(root, variation);
    drawGroundPlane(root, metrics, variation);

    const segments = buildSegments(metrics);
    const drawingOrder = [...segments].sort((a, b) => b.tier - a.tier);
    drawingOrder.forEach((segment) => {
      drawSegment(root, segment, rng, metrics, variation);
    });

    drawCentralStairs(root, segments[0], metrics, variation);
    drawCaption(root, variation);
  }

  function drawBackdrop(root, variation) {
    svgEl(
      "rect",
      {
        x: 0,
        y: 0,
        width: VIEWBOX.width,
        height: VIEWBOX.height,
        fill: variation.palette.sky
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
        fill: variation.palette.skyBand
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

  function drawGroundPlane(root, metrics, variation) {
    const tileWidth = clamp(metrics.unit * 1.35, 15, 36);
    const tileCount = Math.ceil((VIEWBOX.width - 140) / tileWidth);

    svgEl(
      "rect",
      {
        x: 70,
        y: GROUND_Y,
        width: VIEWBOX.width - 140,
        height: 34,
        fill: variation.palette.plinth
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

  function buildVariation(rng) {
    const roofStyle = pickOne(rng, ["pediment", "flat", "broken", "balustrade"]);
    const wingRoofMode = pickOne(rng, ["sync", "flat", "mixed"]);
    const windowPattern = pickOne(rng, ["alternating", "checker", "bands", "dense", "sparse"]);
    const pilasterMode = pickOne(rng, ["none", "thin", "thick"]);
    const portalStyle = pickOne(rng, ["single", "triple", "arcade"]);
    const palette = pickOne(rng, COLOR_SCHEMES);
    const label = `${pickOne(rng, STYLE_PART_A)} ${pickOne(rng, STYLE_PART_B)}`;

    return {
      label,
      palette,
      roofStyle,
      wingRoofMode,
      windowPattern,
      pilasterMode,
      portalStyle,
      roundBias: 0.22 + rng() * 0.54,
      windowDensityJitter: (rng() - 0.5) * 0.28,
      balconyChance: 0.1 + rng() * 0.42,
      rusticationChance: 0.18 + rng() * 0.54,
      atticBand: rng() < 0.56,
      stairSteps: 3 + Math.floor(rng() * 5),
      pedimentPeakScale: 0.13 + rng() * 0.17,
      corniceScale: 0.42 + rng() * 0.72,
      floorStretch: 0.1 + rng() * 0.7,
      wingWidthSlope: 0.16 + rng() * 0.2,
      wingFloorDrop: 0.7 + rng() * 1.2,
      sectionInsetChance: 0.2 + rng() * 0.4,
      leftWidthDelta: [randStep(rng, 2), randStep(rng, 2), randStep(rng, 1)],
      rightWidthDelta: [randStep(rng, 2), randStep(rng, 2), randStep(rng, 1)],
      leftFloorDelta: [randStep(rng, 1), randStep(rng, 1), randStep(rng, 1)],
      rightFloorDelta: [randStep(rng, 1), randStep(rng, 1), randStep(rng, 1)]
    };
  }

  function computeMetrics(variation) {
    const wingConfigs = [];
    for (let tier = 1; tier <= state.wings; tier += 1) {
      const baseWidth = Math.max(6, Math.round(state.widthUnits * (1 - tier * variation.wingWidthSlope)));
      const baseFloors = Math.max(2, Math.round(state.floors - tier * variation.wingFloorDrop));

      const leftWidth = clamp(baseWidth + (variation.leftWidthDelta[tier - 1] || 0), 5, state.widthUnits + 4);
      const rightWidth = clamp(baseWidth + (variation.rightWidthDelta[tier - 1] || 0), 5, state.widthUnits + 4);
      const leftFloors = clamp(baseFloors + (variation.leftFloorDelta[tier - 1] || 0), 2, 8);
      const rightFloors = clamp(baseFloors + (variation.rightFloorDelta[tier - 1] || 0), 2, 8);

      wingConfigs.push({ tier, leftWidth, rightWidth, leftFloors, rightFloors });
    }

    const halfBudget = VIEWBOX.width / 2 - 80;
    const gap = clamp(14 + state.wings * 2, 14, 24);
    const leftDenominator = state.widthUnits / 2 + wingConfigs.reduce((sum, it) => sum + it.leftWidth, 0);
    const rightDenominator = state.widthUnits / 2 + wingConfigs.reduce((sum, it) => sum + it.rightWidth, 0);
    const denominator = Math.max(leftDenominator, rightDenominator, 1);
    const unit = clamp((halfBudget - gap * state.wings) / denominator, 6, 24);
    const floorHeight = clamp(unit * (3.1 + variation.floorStretch), 52, 112);

    return { unit, floorHeight, gap, wingConfigs };
  }

  function buildSegments(metrics) {
    const centerX = VIEWBOX.width / 2;
    const segments = [
      {
        x: centerX,
        widthUnits: state.widthUnits,
        floors: state.floors,
        tier: 0,
        side: "center"
      }
    ];

    let leftEdge = (state.widthUnits * metrics.unit) / 2;
    let rightEdge = (state.widthUnits * metrics.unit) / 2;

    metrics.wingConfigs.forEach((config) => {
      const leftHalf = (config.leftWidth * metrics.unit) / 2;
      const rightHalf = (config.rightWidth * metrics.unit) / 2;

      const leftOffset = leftEdge + metrics.gap + leftHalf;
      const rightOffset = rightEdge + metrics.gap + rightHalf;

      segments.push({
        x: centerX - leftOffset,
        widthUnits: config.leftWidth,
        floors: config.leftFloors,
        tier: config.tier,
        side: "left"
      });

      segments.push({
        x: centerX + rightOffset,
        widthUnits: config.rightWidth,
        floors: config.rightFloors,
        tier: config.tier,
        side: "right"
      });

      leftEdge = leftOffset + leftHalf;
      rightEdge = rightOffset + rightHalf;
    });

    return segments;
  }

  function drawSegment(root, segment, rng, metrics, variation) {
    const widthPx = segment.widthUnits * metrics.unit;
    const heightPx = segment.floors * metrics.floorHeight;
    const left = segment.x - widthPx / 2;
    const top = GROUND_Y - heightPx;
    const inset = segment.tier > 0 && rng() < variation.sectionInsetChance ? clamp(metrics.unit * 0.45, 2, 8) : 0;
    const bodyLeft = left + inset / 2;
    const bodyWidth = widthPx - inset;

    const block = svgEl("g", { "data-tier": segment.tier, "data-side": segment.side }, root);
    const facadeColor = segment.tier === 0 ? variation.palette.facadeMain : segment.tier === 1 ? variation.palette.facadeWing : variation.palette.facadeDeep;

    svgEl(
      "rect",
      {
        x: bodyLeft,
        y: top,
        width: bodyWidth,
        height: heightPx,
        rx: 2,
        fill: facadeColor,
        stroke: variation.palette.line,
        "stroke-width": 1.2
      },
      block
    );

    if (variation.atticBand && segment.tier === 0) {
      svgEl(
        "rect",
        {
          x: bodyLeft,
          y: top + 6,
          width: bodyWidth,
          height: clamp(metrics.unit * 0.22, 3, 6),
          fill: variation.palette.trim
        },
        block
      );
    }

    for (let level = 1; level < segment.floors; level += 1) {
      const y = GROUND_Y - level * metrics.floorHeight;
      svgEl(
        "line",
        {
          x1: bodyLeft,
          y1: y,
          x2: bodyLeft + bodyWidth,
          y2: y,
          stroke: "rgba(119,128,141,0.55)",
          "stroke-width": 1
        },
        block
      );
    }

    if (rng() < variation.rusticationChance) {
      drawRustication(block, bodyLeft, top, bodyWidth, heightPx, metrics, variation);
    }

    if (variation.pilasterMode !== "none" && segment.widthUnits >= 8) {
      drawPilasters(block, bodyLeft, top, bodyWidth, heightPx, metrics, variation);
    }

    if (segment.tier === 0 && rng() < 0.45) {
      drawOculus(block, bodyLeft + bodyWidth / 2, top + metrics.floorHeight * 0.8, metrics, variation);
    }

    drawWindows(block, segment, bodyLeft, bodyWidth, rng, metrics, variation);
    drawRoof(block, segment, bodyLeft, top, bodyWidth, rng, metrics, variation);
  }

  function drawRustication(parent, left, top, widthPx, heightPx, metrics, variation) {
    const verticalStep = variation.pilasterMode === "thick" ? metrics.unit * 1.7 : metrics.unit * 2.1;
    const horizontalStep = metrics.floorHeight / 2;
    for (let x = left + verticalStep; x < left + widthPx - verticalStep * 0.4; x += verticalStep) {
      svgEl(
        "line",
        {
          x1: x,
          y1: top,
          x2: x,
          y2: top + heightPx,
          stroke: "rgba(119,128,141,0.18)",
          "stroke-width": 0.9
        },
        parent
      );
    }
    for (let y = top + horizontalStep; y < top + heightPx; y += horizontalStep) {
      svgEl(
        "line",
        {
          x1: left,
          y1: y,
          x2: left + widthPx,
          y2: y,
          stroke: "rgba(119,128,141,0.16)",
          "stroke-width": 0.9
        },
        parent
      );
    }
  }

  function drawPilasters(parent, left, top, widthPx, heightPx, metrics, variation) {
    const thick = variation.pilasterMode === "thick";
    const spacing = thick ? metrics.unit * 1.8 : metrics.unit * 2.4;
    const pilasterWidth = thick ? clamp(metrics.unit * 0.23, 4, 8) : clamp(metrics.unit * 0.14, 2.5, 5);
    const capHeight = clamp(metrics.unit * 0.12, 2, 4);

    for (let x = left + spacing; x < left + widthPx - spacing * 0.5; x += spacing) {
      svgEl(
        "rect",
        {
          x: x - pilasterWidth / 2,
          y: top + 7,
          width: pilasterWidth,
          height: heightPx - 14,
          fill: "rgba(119,128,141,0.28)"
        },
        parent
      );
      svgEl(
        "rect",
        {
          x: x - pilasterWidth,
          y: top + 6,
          width: pilasterWidth * 2,
          height: capHeight,
          fill: "rgba(119,128,141,0.35)"
        },
        parent
      );
    }
  }

  function drawOculus(parent, centerX, centerY, metrics, variation) {
    const outer = clamp(metrics.unit * 0.42, 5, 10);
    const inner = outer * 0.62;
    svgEl("circle", { cx: centerX, cy: centerY, r: outer, fill: variation.palette.line }, parent);
    svgEl("circle", { cx: centerX, cy: centerY, r: inner, fill: variation.palette.opening }, parent);
  }

  function drawWindows(parent, segment, left, widthPx, rng, metrics, variation) {
    const sidePadding = metrics.unit * (variation.pilasterMode === "none" ? 0.7 : 1.05);
    const nominal = variation.windowPattern === "dense" ? 0.94 : variation.windowPattern === "sparse" ? 1.35 : 1.12;
    const slots = Math.max(3, Math.round((widthPx - sidePadding * 2) / (metrics.unit * nominal)));
    const slotWidth = (widthPx - sidePadding * 2) / slots;
    const openChance = clamp(state.rhythm / 100 + variation.windowDensityJitter - segment.tier * 0.04, 0.22, 0.96);

    for (let floor = 0; floor < segment.floors; floor += 1) {
      const baseY = GROUND_Y - floor * metrics.floorHeight - metrics.unit * 0.85;

      if (floor === 0 && segment.tier === 0) {
        drawPortals(parent, left, widthPx, baseY, metrics, variation);
        continue;
      }

      if (floor > 0 && floor < segment.floors && rng() < variation.balconyChance * (1 - segment.tier * 0.15)) {
        drawBalconyBand(parent, left, widthPx, baseY, metrics, variation);
      }

      for (let i = 0; i < slots; i += 1) {
        if (!windowSlotActive(variation.windowPattern, floor, i, segment.tier, rng, openChance)) {
          continue;
        }

        const x = left + sidePadding + slotWidth * i + slotWidth / 2;
        const roundChance = clamp(variation.roundBias + (segment.tier === 0 ? 0.06 : -0.04), 0.08, 0.92);
        const widthScale = variation.windowPattern === "dense" ? 0.62 : variation.windowPattern === "sparse" ? 0.48 : 0.56;
        const windowWidth = slotWidth * widthScale;
        const windowHeight = metrics.floorHeight * clamp(0.42 + variation.floorStretch * 0.12, 0.4, 0.56);

        if (rng() < roundChance) {
          drawRoundWindow(parent, x, baseY, windowWidth, windowHeight, variation);
        } else {
          drawSquareWindow(parent, x, baseY, windowWidth, windowHeight, variation);
        }
      }
    }
  }

  function drawSquareWindow(parent, centerX, baseY, width, height, variation) {
    svgEl(
      "rect",
      {
        x: centerX - width / 2,
        y: baseY - height,
        width,
        height,
        fill: variation.palette.opening
      },
      parent
    );
  }

  function drawRoundWindow(parent, centerX, baseY, width, height, variation) {
    const radius = width / 2;
    const capY = baseY - height + radius;
    svgEl(
      "rect",
      {
        x: centerX - radius,
        y: capY,
        width,
        height: Math.max(4, baseY - capY),
        fill: variation.palette.opening
      },
      parent
    );
    svgEl(
      "circle",
      {
        cx: centerX,
        cy: capY,
        r: radius,
        fill: variation.palette.opening
      },
      parent
    );
  }

  function drawBalconyBand(parent, left, widthPx, baseY, metrics, variation) {
    const start = left + metrics.unit * 0.4;
    const width = widthPx - metrics.unit * 0.8;
    const y = baseY - metrics.floorHeight * 0.12;
    const rail = clamp(metrics.unit * 0.11, 2, 4);
    const picketCount = Math.max(6, Math.floor(width / (metrics.unit * 0.65)));

    svgEl("rect", { x: start, y: y - rail, width, height: rail, fill: variation.palette.line }, parent);
    svgEl("rect", { x: start, y, width, height: rail, fill: variation.palette.line }, parent);

    for (let i = 0; i <= picketCount; i += 1) {
      const x = start + (width * i) / picketCount;
      svgEl(
        "rect",
        {
          x: x - rail / 2,
          y: y - rail,
          width: rail,
          height: rail * 2,
          fill: variation.palette.line
        },
        parent
      );
    }
  }

  function drawPortals(parent, left, widthPx, baseY, metrics, variation) {
    if (variation.portalStyle === "single") {
      drawPortalUnit(parent, left + widthPx / 2, baseY, metrics.unit * 1.18, metrics.floorHeight * 0.82, variation);
      return;
    }

    if (variation.portalStyle === "triple") {
      const spacing = widthPx / 4;
      for (let i = 1; i <= 3; i += 1) {
        drawPortalUnit(parent, left + spacing * i, baseY, metrics.unit * 0.82, metrics.floorHeight * 0.74, variation);
      }
      return;
    }

    const count = Math.max(3, Math.floor(widthPx / (metrics.unit * 2.8)));
    const spacing = widthPx / (count + 1);
    for (let i = 1; i <= count; i += 1) {
      drawPortalUnit(parent, left + spacing * i, baseY, metrics.unit * 0.72, metrics.floorHeight * 0.68, variation);
    }
  }

  function drawPortalUnit(parent, centerX, baseY, doorWidth, doorHeight, variation) {
    const archRadius = doorWidth / 2;
    const capY = baseY - doorHeight + archRadius * 0.6;

    svgEl(
      "rect",
      {
        x: centerX - doorWidth / 2,
        y: capY,
        width: doorWidth,
        height: doorHeight - archRadius * 0.6,
        fill: variation.palette.opening
      },
      parent
    );

    svgEl(
      "circle",
      {
        cx: centerX,
        cy: capY,
        r: archRadius,
        fill: variation.palette.opening
      },
      parent
    );

    svgEl(
      "rect",
      {
        x: centerX - doorWidth * 0.66,
        y: capY - archRadius * 0.62,
        width: doorWidth * 1.32,
        height: clamp(doorWidth * 0.15, 2, 5),
        fill: variation.palette.line
      },
      parent
    );
  }

  function drawRoof(parent, segment, left, top, widthPx, rng, metrics, variation) {
    const entablatureHeight = clamp(metrics.unit * (0.4 + variation.corniceScale * 0.36), 8, 16);
    const entablatureY = top - entablatureHeight;

    svgEl(
      "rect",
      {
        x: left - 8,
        y: entablatureY,
        width: widthPx + 16,
        height: entablatureHeight,
        fill: variation.palette.trim,
        stroke: variation.palette.line,
        "stroke-width": 1
      },
      parent
    );

    const roofType = roofTypeForSegment(segment, rng, variation);
    if (roofType === "pediment") {
      drawPediment(parent, left, entablatureY, widthPx, variation);
      return;
    }
    if (roofType === "broken") {
      drawBrokenPediment(parent, left, entablatureY, widthPx, variation);
      return;
    }
    if (roofType === "balustrade") {
      drawBalustradeRoof(parent, left, entablatureY, widthPx, metrics, variation);
      return;
    }
    drawFlatRoof(parent, left, entablatureY, widthPx, metrics, variation);
  }

  function roofTypeForSegment(segment, rng, variation) {
    if (segment.tier === 0) {
      return variation.roofStyle;
    }
    if (variation.wingRoofMode === "flat") {
      return "flat";
    }
    if (variation.wingRoofMode === "sync") {
      return variation.roofStyle === "broken" ? "pediment" : variation.roofStyle;
    }
    return pickOne(rng, ["pediment", "flat", "balustrade"]);
  }

  function drawPediment(parent, left, y, widthPx, variation) {
    const peak = clamp(widthPx * variation.pedimentPeakScale, 20, 80);
    const path = [
      `M ${left - 6} ${y}`,
      `L ${left + widthPx / 2} ${y - peak}`,
      `L ${left + widthPx + 6} ${y}`,
      "Z"
    ].join(" ");

    svgEl(
      "path",
      {
        d: path,
        fill: variation.palette.roof,
        stroke: variation.palette.line,
        "stroke-width": 1.4
      },
      parent
    );
  }

  function drawBrokenPediment(parent, left, y, widthPx, variation) {
    const peak = clamp(widthPx * variation.pedimentPeakScale, 20, 76);
    const gap = clamp(widthPx * 0.13, 20, 42);
    const center = left + widthPx / 2;

    const leftPath = [
      `M ${left - 5} ${y}`,
      `L ${center - gap / 2} ${y - peak}`,
      `L ${center - gap / 2} ${y}`,
      "Z"
    ].join(" ");
    const rightPath = [
      `M ${center + gap / 2} ${y}`,
      `L ${center + gap / 2} ${y - peak}`,
      `L ${left + widthPx + 5} ${y}`,
      "Z"
    ].join(" ");

    svgEl("path", { d: leftPath, fill: variation.palette.roof, stroke: variation.palette.line, "stroke-width": 1.3 }, parent);
    svgEl("path", { d: rightPath, fill: variation.palette.roof, stroke: variation.palette.line, "stroke-width": 1.3 }, parent);
    svgEl(
      "rect",
      {
        x: center - gap * 0.32,
        y: y - peak * 0.45,
        width: gap * 0.64,
        height: peak * 0.25,
        fill: variation.palette.trim,
        stroke: variation.palette.line,
        "stroke-width": 1
      },
      parent
    );
  }

  function drawFlatRoof(parent, left, y, widthPx, metrics, variation) {
    const height = clamp(metrics.unit * 0.78, 10, 20);
    svgEl(
      "rect",
      {
        x: left - 5,
        y: y - height,
        width: widthPx + 10,
        height,
        fill: variation.palette.roof,
        stroke: variation.palette.line,
        "stroke-width": 1.1
      },
      parent
    );
  }

  function drawBalustradeRoof(parent, left, y, widthPx, metrics, variation) {
    const railHeight = clamp(metrics.unit * 0.2, 3, 6);
    const balusterCount = Math.max(7, Math.floor(widthPx / (metrics.unit * 0.8)));
    const balusterWidth = clamp(metrics.unit * 0.1, 2, 4);

    svgEl(
      "rect",
      {
        x: left - 4,
        y: y - railHeight * 2.6,
        width: widthPx + 8,
        height: railHeight,
        fill: variation.palette.roof
      },
      parent
    );
    svgEl(
      "rect",
      {
        x: left - 4,
        y: y - railHeight,
        width: widthPx + 8,
        height: railHeight,
        fill: variation.palette.roof
      },
      parent
    );

    for (let i = 0; i <= balusterCount; i += 1) {
      const x = left + (widthPx * i) / balusterCount;
      svgEl(
        "rect",
        {
          x: x - balusterWidth / 2,
          y: y - railHeight * 2.6,
          width: balusterWidth,
          height: railHeight * 1.6,
          fill: variation.palette.line
        },
        parent
      );
    }
  }

  function drawCentralStairs(root, centralSegment, metrics, variation) {
    const widthPx = centralSegment.widthUnits * metrics.unit;
    const stairWidth = widthPx * 0.74;
    const left = centralSegment.x - stairWidth / 2;
    const stepHeight = clamp(metrics.unit * 0.32, 5, 9);
    const insetStep = clamp(metrics.unit * 0.54, 8, 14);

    for (let step = 0; step < variation.stairSteps; step += 1) {
      const inset = step * insetStep;
      svgEl(
        "rect",
        {
          x: left - inset,
          y: GROUND_Y + step * stepHeight,
          width: stairWidth + inset * 2,
          height: stepHeight,
          fill: variation.palette.step
        },
        root
      );
    }
  }

  function drawCaption(root, variation) {
    const line1 = svgEl(
      "text",
      {
        x: 92,
        y: 72,
        fill: variation.palette.accent,
        "font-family": "IBM Plex Sans, sans-serif",
        "font-size": 16,
        "font-weight": 600,
        "letter-spacing": "0.08em"
      },
      root
    );
    line1.textContent = "PALLADIAN FACADE STUDIO";

    const line2 = svgEl(
      "text",
      {
        x: 92,
        y: 95,
        fill: variation.palette.text,
        "font-family": "IBM Plex Sans, sans-serif",
        "font-size": 12,
        "letter-spacing": "0.08em"
      },
      root
    );
    line2.textContent = `seed: ${state.seed} | typus: ${variation.label}`;
  }

  function windowSlotActive(pattern, floor, slot, tier, rng, openChance) {
    if (pattern === "checker") {
      if ((floor + slot + tier) % 2 !== 0) {
        return rng() < openChance * 0.22;
      }
      return rng() < Math.min(0.98, openChance + 0.2);
    }
    if (pattern === "bands") {
      const denseBand = floor % 2 === 0;
      return rng() < (denseBand ? Math.min(0.98, openChance + 0.18) : openChance * 0.48);
    }
    if (pattern === "dense") {
      return rng() < Math.min(0.98, openChance + 0.2);
    }
    if (pattern === "sparse") {
      return rng() < Math.max(0.15, openChance - 0.26);
    }
    if ((floor + slot) % 2 === 0) {
      return rng() < Math.min(0.98, openChance + 0.1);
    }
    return rng() < openChance * 0.5;
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

  function randStep(rng, maxAbs) {
    const roll = rng();
    if (roll < 0.5) {
      return 0;
    }
    const sign = rng() < 0.5 ? -1 : 1;
    if (roll < 0.82) {
      return sign;
    }
    return sign * (1 + Math.floor(rng() * maxAbs));
  }

  function pickOne(rng, items) {
    return items[Math.floor(rng() * items.length)];
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
