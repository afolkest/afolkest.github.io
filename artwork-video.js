// Video artworks play once, then their still fades in over the final frames.
// Visitors who prefer reduced motion, or whose browser can't play the video, just get the still.
(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Start fading into the still this long before the video ends. The slowdown
    // at the end is baked into the video file; keep this in step with the CSS fade.
    const FADE_SECONDS = 3;

    // The <source> elements carry data-src rather than src, so the browser doesn't
    // start downloading one on its own. Pick the first format this device decodes
    // in hardware (smooth and power-efficient); otherwise use the last listed, the
    // most widely supported one.
    async function chooseSource(video) {
        const sources = Array.from(video.querySelectorAll("source[data-src]"));
        if (!sources.length) return null;

        const fallback = sources.at(-1).dataset.src;
        if (!navigator.mediaCapabilities?.decodingInfo) {
            return sources.find((source) => video.canPlayType(source.type))?.dataset.src ?? fallback;
        }

        const width = Number(video.getAttribute("width")) || 1920;
        const height = Number(video.getAttribute("height")) || 1080;
        for (const source of sources) {
            try {
                const info = await navigator.mediaCapabilities.decodingInfo({
                    type: "file",
                    video: { contentType: source.type, width, height, bitrate: 10_000_000, framerate: 30 }
                });
                if (info.supported && info.powerEfficient) return source.dataset.src;
            } catch {
                // Unrecognised codec string: try the next format.
            }
        }
        return fallback;
    }

    async function setup(video) {
        const frame = video.closest(".artwork-video-frame");
        if (!frame) return;

        frame.classList.remove("is-video-done");
        if (reducedMotion.matches) {
            frame.classList.remove("is-video-active");
            video.remove();
            return;
        }

        let done = false;
        let observer = null;
        const finish = () => {
            if (done) return;
            done = true;
            observer?.disconnect();
            frame.classList.add("is-video-done");
        };
        const play = () => {
            video.play()?.catch((error) => {
                // An interrupted play() (e.g. a background tab) can be retried; anything else falls back to the still.
                if (error.name !== "AbortError") finish();
            });
        };

        video.addEventListener("timeupdate", () => {
            if (done || !Number.isFinite(video.duration)) return;
            if (video.duration - video.currentTime <= FADE_SECONDS) finish();
        });

        frame.classList.add("is-video-active");
        video.muted = true;
        video.addEventListener("ended", finish, { once: true });
        video.addEventListener("error", finish, { once: true });

        const src = await chooseSource(video);
        if (!src) {
            finish();
            return;
        }
        video.dataset.chosenSrc = src;
        video.src = src;

        if (!("IntersectionObserver" in window)) {
            play();
            return;
        }

        // Play while any part of the artwork is on screen; pause only once it is fully scrolled away.
        observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting) play();
                else if (!done) video.pause();
            }
        }, { threshold: 0 });
        observer.observe(frame);
    }

    function setupAll(root = document) {
        root.querySelectorAll(".artwork-video").forEach((video) => {
            setup(video);
        });
    }

    window.artworkVideo = { setupAll };
    setupAll();
})();
