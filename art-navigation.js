(() => {
    const pageCache = new Map();

    function resolvedUrl(element, attribute, baseUrl) {
        return new URL(element.getAttribute(attribute), baseUrl).href;
    }

    function pageData(documentRoot, url) {
        const previous = documentRoot.querySelector(".artwork-arrow-previous");
        const next = documentRoot.querySelector(".artwork-arrow-next");
        const imageLink = documentRoot.querySelector(".artwork-image-link");
        const image = imageLink?.querySelector("img");
        const heading = documentRoot.querySelector(".artwork-caption h1");
        const stage = documentRoot.querySelector(".artwork-stage");

        if (!previous || !next || !imageLink || !image || !heading || !stage) return null;

        const metadata = {};
        for (const selector of [
            'meta[name="description"]',
            'meta[property="og:title"]',
            'meta[property="og:description"]',
            'meta[property="og:image"]',
            'meta[property="og:url"]'
        ]) {
            metadata[selector] = documentRoot.querySelector(selector)?.content;
        }

        const canonical = documentRoot.querySelector('link[rel="canonical"]');
        const preload = documentRoot.querySelector('link[rel="preload"][as="image"]');

        return {
            url: new URL(url, window.location.href).href,
            title: documentRoot.title,
            previousHref: resolvedUrl(previous, "href", url),
            nextHref: resolvedUrl(next, "href", url),
            imageHref: resolvedUrl(imageLink, "href", url),
            imageLabel: imageLink.getAttribute("aria-label"),
            imageAttributes: Object.fromEntries(
                ["src", "alt", "width", "height"].map((name) => [name, image.getAttribute(name)])
            ),
            artworkWidth: stage.style.getPropertyValue("--artwork-width"),
            headingNodes: Array.from(heading.childNodes, (node) => node.cloneNode(true)),
            canonicalHref: canonical ? resolvedUrl(canonical, "href", url) : null,
            preloadHref: preload ? resolvedUrl(preload, "href", url) : null,
            metadata
        };
    }

    function loadPage(url) {
        const absoluteUrl = new URL(url, window.location.href).href;
        if (pageCache.has(absoluteUrl)) return pageCache.get(absoluteUrl);

        const request = fetch(absoluteUrl)
            .then((response) => {
                if (!response.ok) throw new Error(`Artwork request failed: ${response.status}`);
                return response.text();
            })
            .then((html) => {
                const parsed = new DOMParser().parseFromString(html, "text/html");
                const data = pageData(parsed, absoluteUrl);
                if (!data) throw new Error("Artwork page is missing gallery markup");
                return data;
            });

        pageCache.set(absoluteUrl, request);
        request.catch(() => pageCache.delete(absoluteUrl));
        return request;
    }

    function updateMetadata(data) {
        document.title = data.title;

        for (const [selector, content] of Object.entries(data.metadata)) {
            const element = document.querySelector(selector);
            if (element && content) element.content = content;
        }

        const canonical = document.querySelector('link[rel="canonical"]');
        if (canonical && data.canonicalHref) canonical.href = data.canonicalHref;

        const preload = document.querySelector('link[rel="preload"][as="image"]');
        if (preload && data.preloadHref) preload.href = data.preloadHref;
    }

    function warmNeighbors(data) {
        loadPage(data.previousHref).catch(() => {});
        loadPage(data.nextHref).catch(() => {});
    }

    async function showPage(url, pushHistory) {
        const data = await loadPage(url);
        const previous = document.querySelector(".artwork-arrow-previous");
        const next = document.querySelector(".artwork-arrow-next");
        const imageLink = document.querySelector(".artwork-image-link");
        const image = imageLink.querySelector("img");
        const heading = document.querySelector(".artwork-caption h1");
        const stage = document.querySelector(".artwork-stage");

        previous.href = data.previousHref;
        next.href = data.nextHref;
        imageLink.href = data.imageHref;
        imageLink.setAttribute("aria-label", data.imageLabel);

        for (const [name, value] of Object.entries(data.imageAttributes)) {
            image.setAttribute(name, value);
        }

        stage.style.setProperty("--artwork-width", data.artworkWidth);
        heading.replaceChildren(...data.headingNodes.map((node) => node.cloneNode(true)));
        updateMetadata(data);

        if (pushHistory) history.pushState(null, "", data.url);
        warmNeighbors(data);
    }

    if (!document.body.matches(".artwork-detail-page")) return;

    const initialData = pageData(document, window.location.href);
    if (initialData) {
        pageCache.set(initialData.url, Promise.resolve(initialData));
        warmNeighbors(initialData);
    }

    document.addEventListener("click", (event) => {
        const arrow = event.target.closest(".artwork-arrow");
        if (!arrow || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

        event.preventDefault();
        showPage(arrow.href, true).catch(() => window.location.assign(arrow.href));
    });

    document.addEventListener("pointerover", (event) => {
        const arrow = event.target.closest(".artwork-arrow");
        if (arrow) loadPage(arrow.href).catch(() => {});
    });

    window.addEventListener("popstate", () => {
        showPage(window.location.href, false).catch(() => window.location.reload());
    });
})();
