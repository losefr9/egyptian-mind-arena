import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Plugin to completely block @radix-ui/react-tooltip loading
const blockTooltipPlugin = (): Plugin => ({
  name: 'block-radix-tooltip',
  enforce: 'pre',
  resolveId(id) {
    if (id === '@radix-ui/react-tooltip' || id.includes('@radix-ui/react-tooltip')) {
      return path.resolve(__dirname, './src/components/ui/tooltip.tsx');
    }
    return null;
  },
  load(id) {
    if (id.includes('@radix-ui/react-tooltip')) {
      return `export * from '${path.resolve(__dirname, './src/components/ui/tooltip.tsx')}';`;
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
  cacheDir: '.vite-custom',
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
    blockTooltipPlugin()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@radix-ui/react-tooltip": path.resolve(__dirname, "./src/components/ui/tooltip.tsx"),
      react: path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
    },
    dedupe: ["react", "react-dom"],
    conditions: ['import', 'module', 'browser', 'default'],
  },
  optimizeDeps: {
    include: ["react", "react-dom"],
    exclude: ["@radix-ui/react-tooltip"],
    esbuildOptions: {
      resolveExtensions: ['.tsx', '.ts', '.jsx', '.js'],
    },
  },
  build: {
    commonjsOptions: {
      exclude: ["@radix-ui/react-tooltip"]
    }
  },
  clearScreen: false,
}));
