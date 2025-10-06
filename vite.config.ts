import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    fs: {
      strict: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      react: path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
    },
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: ["react", "react-dom"],
    exclude: ["@radix-ui/react-tooltip"],
    force: true,
    esbuildOptions: {
      plugins: [
        {
          name: "exclude-radix-tooltip",
          setup(build) {
            build.onResolve({ filter: /@radix-ui\/react-tooltip/ }, () => ({
              path: "data:text/javascript,export default {}",
              external: false,
            }));
          },
        },
      ],
    },
  },
  build: {
    commonjsOptions: {
      exclude: ["@radix-ui/react-tooltip"],
    },
    rollupOptions: {
      external: (id) => id.includes("@radix-ui/react-tooltip"),
    },
  },
  clearScreen: false,
}));
