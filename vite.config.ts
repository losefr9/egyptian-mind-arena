import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Plugin to prevent loading @radix-ui/react-tooltip
const excludeTooltipPlugin = (): Plugin => ({
  name: 'exclude-radix-tooltip',
  enforce: 'pre',
  resolveId(id) {
    if (id === '@radix-ui/react-tooltip' || id.includes('@radix-ui/react-tooltip')) {
      return path.resolve(__dirname, './src/components/ui/tooltip.tsx');
    }
    return null;
  }
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    fs: {
      strict: false,
    },
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
    excludeTooltipPlugin()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@radix-ui/react-tooltip": path.resolve(__dirname, "./src/components/ui/tooltip.tsx"),
      react: path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
    },
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: ["react", "react-dom"],
    exclude: ["@radix-ui/react-tooltip"],
    force: true,
  },
  build: {
    commonjsOptions: {
      exclude: ["@radix-ui/react-tooltip"]
    }
  },
  clearScreen: false,
}));
