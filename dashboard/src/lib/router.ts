import type { Component } from "svelte";

import NotFoundPage from "$lib/pages/not-found-page.svelte";

type RouteDefinition = {
	path: RegExp | string;
	load: () => Promise<{ default: Component<any> }>;
};

type RoutePayload = {
	result: {
		path: {
			original: string;
			params?: Record<string, string>;
		};
	};
};

export const appRoutes: RouteDefinition[] = [
	{ path: "/", load: () => import("$lib/pages/landing-page.svelte") },
	{ path: "/about", load: () => import("$lib/pages/about-page.svelte") },
	{ path: "/contact", load: () => import("$lib/pages/contact-page.svelte") },
	{ path: "/privacy", load: () => import("$lib/pages/privacy-page.svelte") },
	{ path: "/login", load: () => import("$lib/pages/login-page.svelte") },
	{ path: "/register", load: () => import("$lib/pages/register-page.svelte") },
	{ path: "/verify", load: () => import("$lib/pages/verify-page.svelte") },
	{
		path: /^\/app(?:\/(?<tab>overview|transactions|audit|webhooks|docs|stores|profile))?$/,
		load: () => import("$lib/pages/dashboard-page.svelte"),
	},
];

export function resolveRoute(pathname: string): {
	load: () => Promise<{ default: Component<any> }>;
	route: RoutePayload;
} {
	for (const entry of appRoutes) {
		if (typeof entry.path === "string") {
			if (entry.path === pathname) {
				return {
					load: entry.load,
					route: {
						result: {
							path: {
								original: pathname,
								params: {},
							},
						},
					},
				};
			}
			continue;
		}

		const match = entry.path.exec(pathname);
		if (match) {
			return {
				load: entry.load,
				route: {
					result: {
						path: {
							original: pathname,
							params: (match.groups ?? {}) as Record<string, string>,
						},
					},
				},
			};
		}
	}

	return {
		load: async () => ({ default: NotFoundPage }),
		route: {
			result: {
				path: {
					original: pathname,
					params: {},
				},
			},
		},
	};
}
