export function setupRevealObserver(selector = ".reveal") {
	if (typeof window === "undefined") {
		return () => {};
	}

	const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
	if (!elements.length) {
		return () => {};
	}

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					entry.target.classList.add("visible");
				}
			}
		},
		{
			threshold: 0.1,
			rootMargin: "0px 0px -40px 0px",
		}
	);

	for (const element of elements) {
		observer.observe(element);
	}

	return () => observer.disconnect();
}
