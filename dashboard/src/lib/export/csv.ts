type CSVPrimitive = string | number | boolean | null | undefined;
type CSVValue = CSVPrimitive | Record<string, unknown> | unknown[];

export type CSVColumn<T> = {
	header: string;
	value: (row: T) => CSVValue;
};

function normalizeValue(value: CSVValue) {
	if (value == null) return "";
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean") return String(value);
	return JSON.stringify(value);
}

function escapeCell(value: CSVValue) {
	const normalized = normalizeValue(value).replaceAll("\r\n", "\n").replaceAll("\r", "\n");
	if (/[",\n]/.test(normalized)) {
		return `"${normalized.replaceAll('"', '""')}"`;
	}
	return normalized;
}

export function slugifyFilenamePart(value: string) {
	return value
		.trim()
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[^\w\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^[-_]+|[-_]+$/g, "") || "data";
}

export function exportTimestamp(date = new Date()) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	const hour = String(date.getHours()).padStart(2, "0");
	const minute = String(date.getMinutes()).padStart(2, "0");
	return `${year}${month}${day}-${hour}${minute}`;
}

export function buildCSV<T>(columns: CSVColumn<T>[], rows: T[]) {
	const header = columns.map((column) => escapeCell(column.header)).join(",");
	const body = rows.map((row) => columns.map((column) => escapeCell(column.value(row))).join(",")).join("\n");
	return `\uFEFF${header}${body ? `\n${body}` : ""}`;
}

export function downloadCSV<T>(options: {
	filename: string;
	columns: CSVColumn<T>[];
	rows: T[];
}) {
	const csv = buildCSV(options.columns, options.rows);
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = options.filename;
	link.style.display = "none";
	document.body.append(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}
