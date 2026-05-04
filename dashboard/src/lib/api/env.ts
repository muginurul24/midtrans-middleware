const localhostFallbackApiBaseURL = "http://localhost:8080";

function isLoopbackOrigin(value: string) {
	try {
		const url = new URL(value);
		return url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1";
	} catch {
		return false;
	}
}

function resolveApiBaseURL() {
	const configured = import.meta.env.VITE_API_BASE_URL?.trim();
	if (configured) {
		if (
			typeof window !== "undefined" &&
			window.location.origin &&
			isLoopbackOrigin(configured) &&
			!isLoopbackOrigin(window.location.origin)
		) {
			return window.location.origin;
		}

		return configured;
	}

	if (typeof window !== "undefined" && window.location.origin) {
		return window.location.origin;
	}

	return localhostFallbackApiBaseURL;
}

export const env = {
	apiBaseURL: resolveApiBaseURL(),
};
