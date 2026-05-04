import openApiSpecText from "$lib/contracts/paygate-store-api.openapi.yaml?raw";
import postmanCollectionText from "$lib/contracts/paygate-store-api.postman_collection.json?raw";

export const paygateStoreOpenApiContract = {
	label: "OpenAPI 3.1",
	filename: "paygate-store-api.openapi.yaml",
	mimeType: "application/yaml;charset=utf-8",
	content: openApiSpecText,
	description:
		"Kontrak machine-readable untuk QA, SDK generation, import client, dan sinkronisasi dokumentasi Store API.",
};

export const paygateStorePostmanCollection = {
	label: "Postman Collection v2.1",
	filename: "paygate-store-api.postman_collection.json",
	mimeType: "application/json;charset=utf-8",
	content: postmanCollectionText,
	description:
		"Collection siap import untuk Postman atau Insomnia agar backend merchant bisa mencoba charge, polling status, dan audit log lebih cepat.",
};
