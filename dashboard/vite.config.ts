import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
    plugins: [tailwindcss(), svelte()],
    resolve: {
        alias: {
            $lib: path.resolve("./src/lib"),
            components: path.resolve("./src/lib/components"),
            ui: path.resolve("./src/lib/components/ui"),
            hooks: path.resolve("./src/lib/hooks"),
            utils: path.resolve("./src/lib/utils.ts"),
        },
    },
});
