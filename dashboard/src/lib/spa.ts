import { writable } from "svelte/store";

function normalizePath(path: string) {
	if (!path) return "/";
	if (!path.startsWith("/")) return `/${path}`;
	return path;
}

export const currentPath = writable("/");

export function syncCurrentPath() {
	if (typeof window === "undefined") return;
	currentPath.set(normalizePath(window.location.pathname));
}

export function goto(path: string) {
	if (typeof window === "undefined") return;
	const nextPath = normalizePath(path);
	if (window.location.pathname !== nextPath) {
		window.history.pushState({}, "", nextPath);
	}
	currentPath.set(nextPath);
}

export function route(node: HTMLElement) {
	function handleClick(event: MouseEvent) {
		if (
			event.defaultPrevented ||
			event.button !== 0 ||
			event.metaKey ||
			event.ctrlKey ||
			event.shiftKey ||
			event.altKey
		) {
			return;
		}

		const href = node.getAttribute("href");
		const target = node.getAttribute("target");

		if (!href || href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("#") || target === "_blank") {
			return;
		}

		event.preventDefault();
		goto(href);
	}

	node.addEventListener("click", handleClick);

	return {
		destroy() {
			node.removeEventListener("click", handleClick);
		},
	};
}
