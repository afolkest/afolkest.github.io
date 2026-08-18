/* Temporary homepage design tuner.
   Open /?tune=1 to use it; without that query parameter this file is inert. */

(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('tune') || !document.body.classList.contains('home')) return;

    const root = document.documentElement;
    const storageKey = 'afolkestad-homepage-tuner-v1';

    /* Each texture recipe obeys the same neutral-overlay contract. */
    const textureRecipes = {
        laidPaper: {
            label: 'Laid paper',
            mat: {
                image: 'var(--texture-laid-mat-image)',
                blend: 'normal, normal, soft-light, soft-light',
                neutral: 'rgb(101, 101, 101)',
                contrast: 2,
                gain: 0.5,
            },
            sheet: {
                image: 'var(--texture-laid-sheet-image)',
                blend: 'normal, normal, soft-light, soft-light',
                neutral: 'rgb(100, 100, 100)',
                contrast: 2,
                gain: 0.5,
            },
        },
        fineGrain: {
            label: 'Fine grain',
            mat: {
                image: 'var(--texture-grain-mat-image)',
                blend: 'soft-light, soft-light',
                neutral: 'rgb(101, 101, 101)',
                contrast: 2,
                gain: 0.5,
            },
            sheet: {
                image: 'var(--texture-grain-sheet-image)',
                blend: 'soft-light, soft-light',
                neutral: 'rgb(100, 100, 100)',
                contrast: 2,
                gain: 0.5,
            },
        },
        linen: {
            label: 'Linen weave',
            mat: {
                image: 'var(--texture-linen-mat-image)',
                blend: 'soft-light, soft-light, soft-light',
                neutral: 'rgb(88, 88, 88)',
                contrast: 2,
                gain: 0.5,
            },
            sheet: {
                image: 'var(--texture-linen-sheet-image)',
                blend: 'soft-light, soft-light, soft-light',
                neutral: 'rgb(87, 87, 87)',
                contrast: 2,
                gain: 0.5,
            },
        },
    };

    const defaults = {
        headingGap: 0.4,
        listGap: 0,
        sectionGap: 2.82,
        aboutLineHeight: 1.45,
        matRecipe: 'laidPaper',
        matTexture: 74,
        sheetRecipe: 'laidPaper',
        sheetTexture: 100,
        matHue: 32.3,
        matSaturation: 43.3,
        matBrightness: 76.5,
        paperHue: 38.2,
        paperSaturation: 52.4,
        paperBrightness: 91.8,
    };

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
                { key: 'matRecipe', label: 'Outer texture', type: 'select' },
                { key: 'matTexture', label: 'Outer strength', min: 0, max: 200, step: 1, unit: '%', digits: 0 },
                { key: 'sheetRecipe', label: 'Center texture', type: 'select' },
                { key: 'sheetTexture', label: 'Center strength', min: 0, max: 200, step: 1, unit: '%', digits: 0 },
            ],
        },
        {
            title: 'Outer mat color',
            controls: [
                { key: 'matHue', label: 'Hue', min: 0, max: 360, step: 0.1, unit: '°', digits: 1 },
                { key: 'matSaturation', label: 'Saturation', min: 0, max: 100, step: 0.1, unit: '%', digits: 1 },
                { key: 'matBrightness', label: 'Brightness', min: 45, max: 95, step: 0.1, unit: '%', digits: 1 },
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
    ];

    const allControls = groups.flatMap(group => group.controls);
    let state = loadState();

    function loadState() {
        try {
            const saved = JSON.parse(localStorage.getItem(storageKey));
            if (!saved || typeof saved !== 'object') return { ...defaults };

            const valid = Object.fromEntries(Object.entries(saved).flatMap(([key, value]) => {
                if (!(key in defaults)) return [];
                if (typeof defaults[key] === 'number' && Number.isFinite(Number(value))) {
                    return [[key, Number(value)]];
                }
                if (typeof defaults[key] === 'string' && value in textureRecipes) {
                    return [[key, value]];
                }
                return [];
            }));
            return { ...defaults, ...valid };
        } catch {
            return { ...defaults };
        }
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

    function getRecipe(key) {
        return textureRecipes[key] || textureRecipes.laidPaper;
    }

    function textureOpacity(config, strength) {
        return Math.min(1, strength / 100 * config.gain);
    }

    function applyTexture(surface, recipeKey, strength) {
        const config = getRecipe(recipeKey)[surface];
        root.style.setProperty(`--${surface}-texture-image`, config.image);
        root.style.setProperty(`--${surface}-texture-blend`, config.blend);
        root.style.setProperty(`--${surface}-texture-neutral`, config.neutral);
        root.style.setProperty(`--${surface}-texture-contrast`, config.contrast);
        root.style.setProperty(`--${surface}-texture-opacity`, textureOpacity(config, strength));
    }

    function applyState() {
        root.style.setProperty('--home-heading-content-gap', `${state.headingGap}rem`);
        root.style.setProperty('--home-row-padding', `${state.listGap / 2}rem`);
        root.style.setProperty('--home-section-gap', `${state.sectionGap}rem`);
        root.style.setProperty('--home-about-line-height', state.aboutLineHeight);
        applyTexture('mat', state.matRecipe, state.matTexture);
        applyTexture('sheet', state.sheetRecipe, state.sheetTexture);
        root.style.setProperty('--mat', hsl(state.matHue, state.matSaturation, state.matBrightness));
        root.style.setProperty('--paper', hsl(state.paperHue, state.paperSaturation, state.paperBrightness));
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

        if (control.type === 'select') {
            row.classList.add('design-tuner__control--select');
            const select = document.createElement('select');
            select.dataset.key = control.key;
            select.id = `design-tuner-${control.key}`;
            select.setAttribute('aria-label', control.label);

            Object.entries(textureRecipes).forEach(([value, recipe]) => {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = recipe.label;
                select.append(option);
            });

            select.value = state[control.key];
            select.addEventListener('change', () => {
                state[control.key] = select.value;
                applyState();
                saveState();
                setStatus(`${control.label} changed`);
            });

            row.append(name, select);
            return row;
        }

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
            setStatus('Saved');
        });

        input.addEventListener('dblclick', () => {
            state[control.key] = defaults[control.key];
            input.value = state[control.key];
            output.textContent = formatValue(control);
            applyState();
            saveState();
            setStatus(`${control.label} reset`);
        });

        row.append(name, input, output);
        return row;
    }

    function exportCss() {
        const matRecipe = getRecipe(state.matRecipe);
        const sheetRecipe = getRecipe(state.sheetRecipe);
        const matConfig = matRecipe.mat;
        const sheetConfig = sheetRecipe.sheet;

        return `/* Values copied from /?tune=1 */
:root {
    --home-heading-content-gap: ${state.headingGap.toFixed(2)}rem;
    --home-row-padding: ${(state.listGap / 2).toFixed(3)}rem; /* ${state.listGap.toFixed(2)}rem between rows */
    --home-section-gap: ${state.sectionGap.toFixed(2)}rem;
    --home-about-line-height: ${state.aboutLineHeight.toFixed(2)};
    --mat-texture-image: ${matConfig.image}; /* ${matRecipe.label} */
    --mat-texture-blend: ${matConfig.blend};
    --mat-texture-neutral: ${matConfig.neutral};
    --mat-texture-contrast: ${matConfig.contrast};
    --mat-texture-opacity: ${textureOpacity(matConfig, state.matTexture).toFixed(3)}; /* ${state.matTexture.toFixed(0)}% */
    --sheet-texture-image: ${sheetConfig.image}; /* ${sheetRecipe.label} */
    --sheet-texture-blend: ${sheetConfig.blend};
    --sheet-texture-neutral: ${sheetConfig.neutral};
    --sheet-texture-contrast: ${sheetConfig.contrast};
    --sheet-texture-opacity: ${textureOpacity(sheetConfig, state.sheetTexture).toFixed(3)}; /* ${state.sheetTexture.toFixed(0)}% */
    --mat: ${hsl(state.matHue.toFixed(1), state.matSaturation.toFixed(1), state.matBrightness.toFixed(1))};
    --paper: ${hsl(state.paperHue.toFixed(1), state.paperSaturation.toFixed(1), state.paperBrightness.toFixed(1))};
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
        applyState();
        saveState();
        allControls.forEach(control => {
            const field = panel.querySelector(`[data-key="${control.key}"]`);
            field.value = state[control.key];
            const output = field.nextElementSibling;
            if (output?.tagName === 'OUTPUT') output.textContent = formatValue(control);
        });
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

        .design-tuner__control--select {
            grid-template-columns: 105px minmax(0, 1fr);
            padding-bottom: 2px;
        }

        .design-tuner select {
            width: 100%;
            min-width: 0;
            padding: 3px 5px;
            border: 1px solid rgba(57, 47, 37, 0.22);
            border-radius: 4px;
            color: inherit;
            background: rgba(255, 255, 255, 0.55);
            font: inherit;
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
    hint.textContent = 'Double-click any slider to reset it';

    body.append(footer, hint);
    panel.append(header, body);

    applyState();
    document.body.append(panel);
})();
