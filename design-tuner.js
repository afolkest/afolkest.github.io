/* Temporary homepage design tuner.
   Open /?tune=1 to use it; without that query parameter this file is inert. */

(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('tune') || !document.body.classList.contains('home')) return;

    const root = document.documentElement;
    const storageKey = 'afolkestad-homepage-tuner-v1';

    /* Texture recipes only need neutral CSS layers plus these gain values.
       A future recipe picker can swap the layer variables and gains without
       changing the sliders or persistence machinery. */
    const textureRecipes = {
        laidPaper: {
            label: 'Laid paper',
            matGain: 0.5,
            sheetGain: 0.5,
        },
    };
    const textureRecipe = textureRecipes.laidPaper;

    /* Candidate color schemes. Every scheme holds the same ink ladder —
       L* 8.5 / 37.0 / 39.1 / 63.9 on the sheet, accent L* 36.2 — so contrast
       and reading hierarchy are constant and the mat is the variable.
       matHsl/sheetHsl seed the surface sliders, accent seeds the accent sliders,
       and matTexture seeds the mat's texture slider (a dark mat shows the same
       grain more, so it needs less); the remaining tokens are set directly.
       Promote a winner into paper.css and delete the rest. */
    const schemes = [
        {
            id: 'original',
            label: 'Original',
            note: 'peach clay + cream, oxblood accent',
            matHsl: [32.3, 43.3, 76.5],
            sheetHsl: [38.2, 52.4, 91.8],
            canvas: '#ddc5a9',
            surface: '#f5eddf',
            primary: '#1b1815',
            secondary: '#5d564d',
            muted: '#635b4f',
            subtle: '#a39a88',
            accent: '#93381b',
            shadow: '94 70 46',
            textureDark: '122 92 62',
            textureLight: '255 252 244',
        },
        {
            id: 'slate',
            label: 'Slate',
            note: 'semi-dark blue-gray wall, warm page — the lightest of the dark mats',
            matHsl: [226.2, 5.8, 44.1],
            sheetHsl: [36.0, 38.5, 92.4],
            matTexture: 29,
            canvas: '#6a6d77',
            surface: '#f3ede4',
            primary: '#1b1815',
            secondary: '#5c564f',
            muted: '#625b52',
            subtle: '#a4998c',
            accent: '#93381b',
            shadow: '30 31 37',
            textureDark: '100 93 85',
            textureLight: '252 249 245',
        },
        {
            id: 'paynes',
            label: 'Payne’s Grey',
            note: 'the bluest mat against a warm bone sheet; bister accent — the watercolour pairing',
            matHsl: [214.3, 10.9, 37.8],
            sheetHsl: [33.3, 24.3, 92.7],
            matTexture: 32,
            canvas: '#565f6b',
            surface: '#f1ede8',
            primary: '#1a1816',
            secondary: '#5b5751',
            muted: '#615b54',
            subtle: '#a29a8f',
            accent: '#754c26',
            shadow: '23 28 34',
            textureDark: '99 94 86',
            textureLight: '251 249 245',
        },
        {
            id: 'graphite',
            label: 'Graphite',
            note: 'violet-leaning charcoal — the blue and the warmth sit in the same tone',
            matHsl: [247.5, 4.9, 22.4],
            sheetHsl: [34.3, 27.5, 95.2],
            matTexture: 63,
            sheetTexture: 129,
            canvas: '#37363c',
            surface: '#f6f3ef',
            primary: '#1b1815',
            secondary: '#5c564f',
            muted: '#625b52',
            subtle: '#a4998c',
            accent: '#93381b',
            shadow: '25 25 29',
            textureDark: '100 93 85',
            textureLight: '252 249 245',
        },
        {
            id: 'charcoal',
            label: 'Charcoal',
            note: 'gallery-wall dark, warmest sheet — the page reads as lit',
            matHsl: [250.0, 4.8, 24.3],
            sheetHsl: [31.8, 41.5, 92.0],
            matTexture: 50,
            canvas: '#3c3b41',
            surface: '#f3ebe2',
            primary: '#1b1815',
            secondary: '#5d564f',
            muted: '#635b52',
            subtle: '#a5998b',
            accent: '#93381b',
            shadow: '20 19 22',
            textureDark: '101 93 83',
            textureLight: '252 249 245',
        },
        {
            id: 'inkwash',
            label: 'Ink Wash',
            note: 'wholly achromatic field — the only hue on the page is the petrol accent',
            matHsl: [240.0, 2.8, 28.2],
            sheetHsl: [0.0, 0.0, 93.7],
            matTexture: 35,
            canvas: '#46464a',
            surface: '#efefef',
            primary: '#181818',
            secondary: '#575757',
            muted: '#5c5c5c',
            subtle: '#9b9b9b',
            accent: '#095f63',
            shadow: '25 25 25',
            textureDark: '94 94 94',
            textureLight: '249 249 249',
        },
        {
            id: 'gallery',
            label: 'Gallery',
            note: 'warm-neutral wall against an achromatic sheet — the only color left on the page is the ink',
            matHsl: [60.0, 2.2, 25.0],
            sheetHsl: [33.3, 34.7, 94.1],
            matTexture: 55,
            sheetTexture: 75,
            canvas: '#41413e',
            surface: '#f5f1eb',
            primary: '#1b1815',
            secondary: '#5d564f',
            muted: '#635b52',
            subtle: '#a5998b',
            accent: '#93381b',
            shadow: '0 0 0',
            textureDark: '104 96 86',
            textureLight: '255 251 242',
        },
    ];

    const schemeById = id => schemes.find(entry => entry.id === id) || schemes[0];

    function hexToHsl(hex) {
        const value = hex.replace('#', '');
        const red = Number.parseInt(value.slice(0, 2), 16) / 255;
        const green = Number.parseInt(value.slice(2, 4), 16) / 255;
        const blue = Number.parseInt(value.slice(4, 6), 16) / 255;
        const max = Math.max(red, green, blue);
        const min = Math.min(red, green, blue);
        const delta = max - min;
        const lightness = (max + min) / 2;
        let hue = 0;

        if (delta) {
            if (max === red) hue = 60 * (((green - blue) / delta) % 6);
            else if (max === green) hue = 60 * ((blue - red) / delta + 2);
            else hue = 60 * ((red - green) / delta + 4);
        }

        const saturation = delta
            ? delta / (1 - Math.abs(2 * lightness - 1))
            : 0;

        return [
            (hue + 360) % 360,
            saturation * 100,
            lightness * 100,
        ];
    }

    const originalAccentHsl = hexToHsl(schemes[0].accent);

    const defaults = {
        scheme: 'original',
        headingGap: 0.4,
        listGap: 0,
        sectionGap: 2.82,
        aboutLineHeight: 1.45,
        matTexture: 61,
        sheetTexture: 90,
        matHue: 32.3,
        matSaturation: 43.3,
        matBrightness: 76.5,
        paperHue: 38.2,
        paperSaturation: 52.4,
        paperBrightness: 91.8,
        accentHue: originalAccentHsl[0],
        accentSaturation: originalAccentHsl[1],
        accentBrightness: originalAccentHsl[2],
    };

    /* These sliders start from the active scheme, so double-clicking one
       returns it to that scheme's value rather than to the peach original. */
    const schemeSeeds = {
        matHue: entry => entry.matHsl[0],
        matSaturation: entry => entry.matHsl[1],
        matBrightness: entry => entry.matHsl[2],
        paperHue: entry => entry.sheetHsl[0],
        paperSaturation: entry => entry.sheetHsl[1],
        paperBrightness: entry => entry.sheetHsl[2],
        accentHue: entry => hexToHsl(entry.accent)[0],
        accentSaturation: entry => hexToHsl(entry.accent)[1],
        accentBrightness: entry => hexToHsl(entry.accent)[2],
        matTexture: entry => entry.matTexture ?? defaults.matTexture,
        sheetTexture: entry => entry.sheetTexture ?? defaults.sheetTexture,
    };

    function controlDefault(key) {
        const seed = schemeSeeds[key];
        return seed ? seed(schemeById(state.scheme)) : defaults[key];
    }

    const groups = [
        {
            title: 'Rhythm',
            controls: [
                { key: 'headingGap', label: 'Heading → content', min: 0.2, max: 1.6, step: 0.01, unit: 'rem', digits: 2 },
                { key: 'listGap', label: 'Between list rows', min: 0, max: 1, step: 0.01, unit: 'rem', digits: 2 },
                { key: 'sectionGap', label: 'Between sections', min: 1, max: 5, step: 0.01, unit: 'rem', digits: 2 },
                { key: 'aboutLineHeight', label: 'About line spacing', min: 1.45, max: 1.8, step: 0.01, unit: '', digits: 2 },
            ],
        },
        {
            title: 'Paper texture',
            controls: [
                { key: 'matTexture', label: 'Outer mat', min: 0, max: 200, step: 1, unit: '%', digits: 0 },
                { key: 'sheetTexture', label: 'Center sheet', min: 0, max: 200, step: 1, unit: '%', digits: 0 },
            ],
        },
        {
            title: 'Outer mat color',
            controls: [
                { key: 'matHue', label: 'Hue', min: 0, max: 360, step: 0.1, unit: '°', digits: 1 },
                { key: 'matSaturation', label: 'Saturation', min: 0, max: 100, step: 0.1, unit: '%', digits: 1 },
                { key: 'matBrightness', label: 'Brightness', min: 8, max: 95, step: 0.1, unit: '%', digits: 1 },
            ],
        },
        {
            title: 'Center sheet color',
            controls: [
                { key: 'paperHue', label: 'Hue', min: 0, max: 360, step: 0.1, unit: '°', digits: 1 },
                { key: 'paperSaturation', label: 'Saturation', min: 0, max: 100, step: 0.1, unit: '%', digits: 1 },
                { key: 'paperBrightness', label: 'Brightness', min: 60, max: 100, step: 0.1, unit: '%', digits: 1 },
            ],
        },
        {
            title: 'Accent color',
            controls: [
                { key: 'accentHue', label: 'Hue', min: 0, max: 360, step: 0.1, unit: '°', digits: 1 },
                { key: 'accentSaturation', label: 'Saturation', min: 0, max: 100, step: 0.1, unit: '%', digits: 1 },
                { key: 'accentBrightness', label: 'Brightness', min: 0, max: 100, step: 0.1, unit: '%', digits: 1 },
            ],
        },
    ];

    const allControls = groups.flatMap(group => group.controls);
    let state = loadState();

    function loadState() {
        try {
            const saved = JSON.parse(localStorage.getItem(storageKey));
            if (!saved || typeof saved !== 'object') return applyRequestedScheme({ ...defaults });

            const valid = Object.fromEntries(
                Object.entries(saved)
                    .filter(([key, value]) => key in defaults && key !== 'scheme' && Number.isFinite(Number(value)))
                    .map(([key, value]) => [key, Number(value)])
            );
            const stored = schemes.some(entry => entry.id === saved.scheme) ? saved.scheme : defaults.scheme;
            const next = { ...defaults, ...valid, scheme: stored };
            const scheme = schemeById(stored);
            Object.entries(schemeSeeds).forEach(([key, seed]) => {
                if (!(key in valid)) next[key] = seed(scheme);
            });
            return applyRequestedScheme(next);
        } catch {
            return applyRequestedScheme({ ...defaults });
        }
    }

    /* ?tune=1&scheme=cobalt opens straight into one scheme, so a particular
       comparison can be linked or screenshotted without clicking through. */
    function applyRequestedScheme(next) {
        const requested = params.get('scheme');
        if (!schemes.some(entry => entry.id === requested)) return next;
        const scheme = schemeById(requested);
        Object.entries(schemeSeeds).forEach(([key, seed]) => { next[key] = seed(scheme); });
        next.scheme = scheme.id;
        return next;
    }

    function saveState() {
        try {
            localStorage.setItem(storageKey, JSON.stringify(state));
        } catch {
            // The controls still work if storage is unavailable.
        }
    }

    function hsl(hue, saturation, brightness) {
        return `hsl(${hue} ${saturation}% ${brightness}%)`;
    }

    function applyState() {
        root.style.setProperty('--home-heading-content-gap', `${state.headingGap}rem`);
        root.style.setProperty('--home-row-padding', `${state.listGap / 2}rem`);
        root.style.setProperty('--home-section-gap', `${state.sectionGap}rem`);
        root.style.setProperty('--home-about-line-height', state.aboutLineHeight);
        root.style.setProperty('--mat-texture-opacity', Math.min(1, state.matTexture / 100 * textureRecipe.matGain));
        root.style.setProperty('--sheet-texture-opacity', Math.min(1, state.sheetTexture / 100 * textureRecipe.sheetGain));

        /* The scheme sets the ink and material hues; the mat, sheet, and accent
           colors come from sliders that the scheme picker re-seeds. */
        const scheme = schemeById(state.scheme);
        root.style.setProperty('--color-text-primary', scheme.primary);
        root.style.setProperty('--color-text-secondary', scheme.secondary);
        root.style.setProperty('--color-text-muted', scheme.muted);
        root.style.setProperty('--color-text-subtle', scheme.subtle);
        root.style.setProperty('--color-accent', hsl(state.accentHue, state.accentSaturation, state.accentBrightness));
        root.style.setProperty('--rgb-shadow', scheme.shadow);
        root.style.setProperty('--rgb-texture-dark', scheme.textureDark);
        root.style.setProperty('--rgb-texture-light', scheme.textureLight);
        root.style.setProperty('--color-canvas', hsl(state.matHue, state.matSaturation, state.matBrightness));
        root.style.setProperty('--color-surface', hsl(state.paperHue, state.paperSaturation, state.paperBrightness));
    }

    /* Switching schemes re-seeds the mat, sheet, and accent sliders so that the
       panel and page never disagree about the current colors. */
    function selectScheme(id, { announce = true } = {}) {
        const scheme = schemeById(id);
        state.scheme = scheme.id;
        Object.entries(schemeSeeds).forEach(([key, seed]) => { state[key] = seed(scheme); });
        applyState();
        saveState();
        syncControls();
        syncSchemeButtons();
        if (announce) setStatus(scheme.label);
    }

    function stepScheme(delta) {
        const index = schemes.findIndex(entry => entry.id === state.scheme);
        const next = (index + delta + schemes.length) % schemes.length;
        selectScheme(schemes[next].id);
    }

    function formatValue(control) {
        return `${Number(state[control.key]).toFixed(control.digits)}${control.unit}`;
    }

    function makeControl(control) {
        const row = document.createElement('label');
        row.className = 'design-tuner__control';

        const name = document.createElement('span');
        name.className = 'design-tuner__label';
        name.textContent = control.label;

        const input = document.createElement('input');
        input.type = 'range';
        input.min = control.min;
        input.max = control.max;
        input.step = control.step;
        input.value = state[control.key];
        input.dataset.key = control.key;
        input.id = `design-tuner-${control.key}`;
        input.setAttribute('aria-label', control.label);
        input.title = 'Double-click to reset';

        const output = document.createElement('output');
        output.htmlFor = input.id;
        output.textContent = formatValue(control);

        input.addEventListener('input', () => {
            state[control.key] = Number(input.value);
            output.textContent = formatValue(control);
            applyState();
            saveState();
            syncSchemeButtons();
            setStatus('Saved');
        });

        input.addEventListener('dblclick', () => {
            state[control.key] = controlDefault(control.key);
            input.value = state[control.key];
            output.textContent = formatValue(control);
            applyState();
            saveState();
            syncSchemeButtons();
            setStatus(`${control.label} reset`);
        });

        row.append(name, input, output);
        return row;
    }

    function syncControls() {
        allControls.forEach(control => {
            const input = panel.querySelector(`input[data-key="${control.key}"]`);
            if (!input) return;
            input.value = state[control.key];
            input.nextElementSibling.textContent = formatValue(control);
        });
    }

    function syncSchemeButtons() {
        panel.querySelectorAll('.design-tuner__scheme').forEach(button => {
            const active = button.dataset.scheme === state.scheme;
            button.classList.toggle('is-active', active);
            button.setAttribute('aria-pressed', String(active));

            const scheme = schemeById(button.dataset.scheme);
            const colors = active
                ? [
                    hsl(state.matHue, state.matSaturation, state.matBrightness),
                    hsl(state.paperHue, state.paperSaturation, state.paperBrightness),
                    hsl(state.accentHue, state.accentSaturation, state.accentBrightness),
                ]
                : [scheme.canvas, scheme.surface, scheme.accent];
            button.querySelectorAll('.design-tuner__swatch span').forEach((chip, index) => {
                chip.style.background = colors[index];
            });
        });
        const scheme = schemeById(state.scheme);
        schemeNote.textContent = scheme.note;
    }

    function exportCss() {
        const scheme = schemeById(state.scheme);
        return `/* Values copied from /?tune=1 — scheme: ${scheme.label} */
:root {
    --color-canvas: ${hsl(state.matHue.toFixed(1), state.matSaturation.toFixed(1), state.matBrightness.toFixed(1))};
    --color-surface: ${hsl(state.paperHue.toFixed(1), state.paperSaturation.toFixed(1), state.paperBrightness.toFixed(1))};
    --color-text-primary: ${scheme.primary};
    --color-text-secondary: ${scheme.secondary};
    --color-text-muted: ${scheme.muted};
    --color-text-subtle: ${scheme.subtle};
    --color-accent: ${hsl(state.accentHue.toFixed(1), state.accentSaturation.toFixed(1), state.accentBrightness.toFixed(1))};
    --rgb-shadow: ${scheme.shadow};
    --rgb-texture-dark: ${scheme.textureDark};
    --rgb-texture-light: ${scheme.textureLight};

    --home-heading-content-gap: ${state.headingGap.toFixed(2)}rem;
    --home-row-padding: ${(state.listGap / 2).toFixed(3)}rem; /* ${state.listGap.toFixed(2)}rem between rows */
    --home-section-gap: ${state.sectionGap.toFixed(2)}rem;
    --home-about-line-height: ${state.aboutLineHeight.toFixed(2)};
    --mat-texture-opacity: ${Math.min(1, state.matTexture / 100 * textureRecipe.matGain).toFixed(3)}; /* ${textureRecipe.label}, ${state.matTexture.toFixed(0)}% */
    --sheet-texture-opacity: ${Math.min(1, state.sheetTexture / 100 * textureRecipe.sheetGain).toFixed(3)}; /* ${textureRecipe.label}, ${state.sheetTexture.toFixed(0)}% */
}`;
    }

    async function copyCss() {
        const css = exportCss();
        try {
            await navigator.clipboard.writeText(css);
        } catch {
            const textarea = document.createElement('textarea');
            textarea.value = css;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.append(textarea);
            textarea.select();
            document.execCommand('copy');
            textarea.remove();
        }
        setStatus('CSS copied');
    }

    function reset() {
        state = { ...defaults };
        selectScheme(defaults.scheme, { announce: false });
        setStatus('Reset');
    }

    let statusTimer;
    function setStatus(message) {
        status.textContent = message;
        clearTimeout(statusTimer);
        statusTimer = setTimeout(() => { status.textContent = ''; }, 1300);
    }

    const style = document.createElement('style');
    style.textContent = `
        .design-tuner {
            position: fixed;
            right: 14px;
            bottom: 14px;
            z-index: 2147483647;
            width: min(310px, calc(100vw - 28px));
            max-height: calc(100vh - 28px);
            overflow: auto;
            color: #26221d;
            background: rgba(249, 246, 239, 0.97);
            border: 1px solid rgba(57, 47, 37, 0.22);
            border-radius: 8px;
            box-shadow: 0 5px 22px rgba(39, 29, 19, 0.22);
            font: 12px/1.3 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            font-synthesis: none;
            scrollbar-width: thin;
        }

        .design-tuner * { box-sizing: border-box; }

        .design-tuner__header {
            position: sticky;
            top: 0;
            z-index: 1;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 11px 8px;
            background: rgba(249, 246, 239, 0.98);
            border-bottom: 1px solid rgba(57, 47, 37, 0.13);
        }

        .design-tuner__title { font-size: 13px; font-weight: 650; }

        .design-tuner__toggle,
        .design-tuner__button {
            appearance: none;
            border: 1px solid rgba(57, 47, 37, 0.22);
            border-radius: 5px;
            color: inherit;
            background: rgba(255, 255, 255, 0.55);
            font: inherit;
            cursor: pointer;
        }

        .design-tuner__toggle { padding: 3px 7px; }
        .design-tuner__toggle:hover,
        .design-tuner__button:hover { border-color: rgba(147, 56, 27, 0.65); }

        .design-tuner__body { padding: 2px 11px 10px; }
        .design-tuner.is-collapsed { width: auto; }
        .design-tuner.is-collapsed .design-tuner__body { display: none; }
        .design-tuner.is-collapsed .design-tuner__header { gap: 14px; border-bottom: 0; }

        .design-tuner__group {
            margin: 0;
            padding: 9px 0 8px;
            border: 0;
            border-bottom: 1px solid rgba(57, 47, 37, 0.11);
        }

        .design-tuner__group legend {
            margin-bottom: 5px;
            padding: 0;
            color: #6a6055;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.06em;
            text-transform: uppercase;
        }

        .design-tuner__schemes {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 5px;
        }

        .design-tuner__scheme {
            appearance: none;
            display: block;
            padding: 0 0 3px;
            border: 1px solid rgba(57, 47, 37, 0.22);
            border-radius: 5px;
            background: rgba(255, 255, 255, 0.55);
            color: inherit;
            font: inherit;
            font-size: 10px;
            line-height: 1.25;
            text-align: center;
            cursor: pointer;
            overflow: hidden;
        }

        .design-tuner__scheme:hover { border-color: rgba(147, 56, 27, 0.65); }

        .design-tuner__scheme.is-active {
            border-color: #93381b;
            box-shadow: inset 0 0 0 1px #93381b;
            font-weight: 650;
        }

        .design-tuner__swatch {
            display: flex;
            height: 20px;
            margin-bottom: 3px;
        }

        .design-tuner__swatch span { flex: 1; }
        .design-tuner__swatch span:last-child { flex: 0 0 22%; }

        .design-tuner__note {
            display: block;
            padding-top: 7px;
            color: #6a6055;
            font-size: 10px;
            line-height: 1.35;
        }

        .design-tuner__control {
            display: grid;
            grid-template-columns: 105px minmax(72px, 1fr) 49px;
            align-items: center;
            gap: 6px;
            min-height: 26px;
        }

        .design-tuner__label { white-space: nowrap; }

        .design-tuner input[type="range"] {
            width: 100%;
            margin: 0;
            accent-color: #93381b;
            cursor: ew-resize;
        }

        .design-tuner output {
            color: #6a6055;
            font-variant-numeric: tabular-nums;
            text-align: right;
        }

        .design-tuner__footer {
            display: flex;
            align-items: center;
            gap: 6px;
            padding-top: 9px;
        }

        .design-tuner__button { padding: 5px 8px; }
        .design-tuner__button--copy { margin-left: auto; }
        .design-tuner__status { color: #7b3a25; min-width: 42px; }

        .design-tuner__hint {
            display: block;
            padding-top: 7px;
            color: #81776c;
            font-size: 10px;
            text-align: center;
        }

        @media (max-height: 590px) {
            .design-tuner { max-height: calc(100vh - 16px); right: 8px; bottom: 8px; }
            .design-tuner__control { min-height: 24px; }
        }
    `;
    document.head.append(style);

    const panel = document.createElement('aside');
    panel.className = 'design-tuner';
    panel.setAttribute('aria-label', 'Homepage design tuning controls');

    const header = document.createElement('div');
    header.className = 'design-tuner__header';

    const title = document.createElement('strong');
    title.className = 'design-tuner__title';
    title.textContent = 'Design tuning';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'design-tuner__toggle';
    toggle.textContent = 'Hide';
    toggle.setAttribute('aria-expanded', 'true');
    toggle.addEventListener('click', () => {
        const collapsed = panel.classList.toggle('is-collapsed');
        toggle.textContent = collapsed ? 'Show' : 'Hide';
        toggle.setAttribute('aria-expanded', String(!collapsed));
    });

    header.append(title, toggle);

    const body = document.createElement('div');
    body.className = 'design-tuner__body';

    const schemeNote = document.createElement('small');
    schemeNote.className = 'design-tuner__note';

    const schemeField = document.createElement('fieldset');
    schemeField.className = 'design-tuner__group';
    const schemeLegend = document.createElement('legend');
    schemeLegend.textContent = 'Color scheme';
    const schemeGrid = document.createElement('div');
    schemeGrid.className = 'design-tuner__schemes';

    schemes.forEach(scheme => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'design-tuner__scheme';
        button.dataset.scheme = scheme.id;
        button.title = scheme.note;

        /* mat, sheet, accent — the three decisions each scheme actually makes */
        const swatch = document.createElement('span');
        swatch.className = 'design-tuner__swatch';
        [scheme.canvas, scheme.surface, scheme.accent].forEach(color => {
            const chip = document.createElement('span');
            chip.style.background = color;
            swatch.append(chip);
        });

        const label = document.createElement('span');
        label.textContent = scheme.label;

        button.append(swatch, label);
        button.addEventListener('click', () => selectScheme(scheme.id));
        schemeGrid.append(button);
    });

    schemeField.append(schemeLegend, schemeGrid, schemeNote);
    body.append(schemeField);

    groups.forEach(group => {
        const fieldset = document.createElement('fieldset');
        fieldset.className = 'design-tuner__group';
        const legend = document.createElement('legend');
        legend.textContent = group.title;
        fieldset.append(legend, ...group.controls.map(makeControl));
        body.append(fieldset);
    });

    const footer = document.createElement('div');
    footer.className = 'design-tuner__footer';

    const resetButton = document.createElement('button');
    resetButton.type = 'button';
    resetButton.className = 'design-tuner__button';
    resetButton.textContent = 'Reset';
    resetButton.addEventListener('click', reset);

    const status = document.createElement('span');
    status.className = 'design-tuner__status';
    status.setAttribute('role', 'status');

    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.className = 'design-tuner__button design-tuner__button--copy';
    copyButton.textContent = 'Copy CSS';
    copyButton.addEventListener('click', copyCss);

    footer.append(resetButton, status, copyButton);
    const hint = document.createElement('small');
    hint.className = 'design-tuner__hint';
    hint.textContent = '[ and ] leaf through schemes · double-click a slider to reset it';

    body.append(footer, hint);
    panel.append(header, body);

    /* Leafing through schemes is the point of the picker, so give it keys. */
    window.addEventListener('keydown', event => {
        if (event.metaKey || event.ctrlKey || event.altKey) return;
        if (event.key === '[') stepScheme(-1);
        else if (event.key === ']') stepScheme(1);
        else return;
        event.preventDefault();
    });

    applyState();
    document.body.append(panel);
    syncSchemeButtons();
})();
