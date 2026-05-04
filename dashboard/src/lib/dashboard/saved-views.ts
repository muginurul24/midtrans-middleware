export type SavedViewTab = "transactions" | "webhooks" | "audit";

export type DashboardSavedView<TFilters> = {
	id: string;
	name: string;
	storeId: string;
	filters: TFilters;
	createdAt: string;
	updatedAt: string;
};

const MAX_SAVED_VIEWS = 8;

function storageKey(userId: string, tab: SavedViewTab) {
	return `paygate:saved-view:${userId}:${tab}`;
}

export function loadSavedViews<TFilters>(userId: string, tab: SavedViewTab) {
	if (typeof localStorage === "undefined") return [] as DashboardSavedView<TFilters>[];
	const raw = localStorage.getItem(storageKey(userId, tab));
	if (!raw) return [] as DashboardSavedView<TFilters>[];

	try {
		const parsed = JSON.parse(raw) as DashboardSavedView<TFilters>[];
		if (!Array.isArray(parsed)) return [] as DashboardSavedView<TFilters>[];
		return parsed.slice(0, MAX_SAVED_VIEWS);
	} catch {
		return [] as DashboardSavedView<TFilters>[];
	}
}

export function persistSavedViews<TFilters>(
	userId: string,
	tab: SavedViewTab,
	views: DashboardSavedView<TFilters>[],
) {
	if (typeof localStorage === "undefined") return;
	localStorage.setItem(storageKey(userId, tab), JSON.stringify(views.slice(0, MAX_SAVED_VIEWS)));
}

export function createSavedView<TFilters>(input: {
	name: string;
	storeId: string;
	filters: TFilters;
}) {
	const timestamp = new Date().toISOString();
	return {
		id: crypto.randomUUID(),
		name: input.name,
		storeId: input.storeId,
		filters: input.filters,
		createdAt: timestamp,
		updatedAt: timestamp,
	} satisfies DashboardSavedView<TFilters>;
}
