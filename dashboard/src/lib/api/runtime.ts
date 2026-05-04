import { env } from "$lib/api/env";

function safeURL(value: string) {
	try {
		return new URL(value);
	} catch {
		return null;
	}
}

function isLoopbackHost(hostname: string) {
	return (
		hostname === "localhost" ||
		hostname === "127.0.0.1" ||
		hostname === "::1" ||
		hostname.endsWith(".local")
	);
}

const apiURL = safeURL(env.apiBaseURL);
const apiHost = apiURL?.host ?? env.apiBaseURL;
const localConnection = apiURL ? isLoopbackHost(apiURL.hostname) : false;

export const runtimeConnection = {
	apiBaseURL: env.apiBaseURL,
	apiHost,
	label: localConnection ? "Local API" : "Live API",
	description: localConnection
		? "Frontend ini sedang terhubung ke backend lokal untuk development atau preview internal."
		: `Frontend ini terhubung ke backend aktif di ${apiHost}.`,
	toneClass: localConnection
		? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
		: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
	dotClass: localConnection ? "bg-amber-500" : "bg-emerald-500",
};
