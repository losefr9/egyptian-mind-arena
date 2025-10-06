// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { componentTagger } from "file:///home/project/node_modules/lovable-tagger/dist/index.js";
var __vite_injected_original_dirname = "/home/project";
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    fs: {
      strict: false
    }
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src"),
      react: path.resolve(__vite_injected_original_dirname, "./node_modules/react"),
      "react-dom": path.resolve(__vite_injected_original_dirname, "./node_modules/react-dom")
    },
    dedupe: ["react", "react-dom"]
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
              external: false
            }));
          }
        }
      ]
    }
  },
  build: {
    commonjsOptions: {
      exclude: ["@radix-ui/react-tooltip"]
    },
    rollupOptions: {
      external: (id) => id.includes("@radix-ui/react-tooltip")
    }
  },
  clearScreen: false
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgeyBjb21wb25lbnRUYWdnZXIgfSBmcm9tIFwibG92YWJsZS10YWdnZXJcIjtcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+ICh7XG4gIHNlcnZlcjoge1xuICAgIGhvc3Q6IFwiOjpcIixcbiAgICBwb3J0OiA4MDgwLFxuICAgIGZzOiB7XG4gICAgICBzdHJpY3Q6IGZhbHNlLFxuICAgIH0sXG4gIH0sXG4gIHBsdWdpbnM6IFtyZWFjdCgpLCBtb2RlID09PSBcImRldmVsb3BtZW50XCIgJiYgY29tcG9uZW50VGFnZ2VyKCldLmZpbHRlcihCb29sZWFuKSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyY1wiKSxcbiAgICAgIHJlYWN0OiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vbm9kZV9tb2R1bGVzL3JlYWN0XCIpLFxuICAgICAgXCJyZWFjdC1kb21cIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL25vZGVfbW9kdWxlcy9yZWFjdC1kb21cIiksXG4gICAgfSxcbiAgICBkZWR1cGU6IFtcInJlYWN0XCIsIFwicmVhY3QtZG9tXCJdLFxuICB9LFxuICBvcHRpbWl6ZURlcHM6IHtcbiAgICBpbmNsdWRlOiBbXCJyZWFjdFwiLCBcInJlYWN0LWRvbVwiXSxcbiAgICBleGNsdWRlOiBbXCJAcmFkaXgtdWkvcmVhY3QtdG9vbHRpcFwiXSxcbiAgICBmb3JjZTogdHJ1ZSxcbiAgICBlc2J1aWxkT3B0aW9uczoge1xuICAgICAgcGx1Z2luczogW1xuICAgICAgICB7XG4gICAgICAgICAgbmFtZTogXCJleGNsdWRlLXJhZGl4LXRvb2x0aXBcIixcbiAgICAgICAgICBzZXR1cChidWlsZCkge1xuICAgICAgICAgICAgYnVpbGQub25SZXNvbHZlKHsgZmlsdGVyOiAvQHJhZGl4LXVpXFwvcmVhY3QtdG9vbHRpcC8gfSwgKCkgPT4gKHtcbiAgICAgICAgICAgICAgcGF0aDogXCJkYXRhOnRleHQvamF2YXNjcmlwdCxleHBvcnQgZGVmYXVsdCB7fVwiLFxuICAgICAgICAgICAgICBleHRlcm5hbDogZmFsc2UsXG4gICAgICAgICAgICB9KSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSxcbiAgfSxcbiAgYnVpbGQ6IHtcbiAgICBjb21tb25qc09wdGlvbnM6IHtcbiAgICAgIGV4Y2x1ZGU6IFtcIkByYWRpeC11aS9yZWFjdC10b29sdGlwXCJdLFxuICAgIH0sXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgZXh0ZXJuYWw6IChpZCkgPT4gaWQuaW5jbHVkZXMoXCJAcmFkaXgtdWkvcmVhY3QtdG9vbHRpcFwiKSxcbiAgICB9LFxuICB9LFxuICBjbGVhclNjcmVlbjogZmFsc2UsXG59KSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXlOLFNBQVMsb0JBQW9CO0FBQ3RQLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFDakIsU0FBUyx1QkFBdUI7QUFIaEMsSUFBTSxtQ0FBbUM7QUFNekMsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE9BQU87QUFBQSxFQUN6QyxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixJQUFJO0FBQUEsTUFDRixRQUFRO0FBQUEsSUFDVjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFNBQVMsQ0FBQyxNQUFNLEdBQUcsU0FBUyxpQkFBaUIsZ0JBQWdCLENBQUMsRUFBRSxPQUFPLE9BQU87QUFBQSxFQUM5RSxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsTUFDcEMsT0FBTyxLQUFLLFFBQVEsa0NBQVcsc0JBQXNCO0FBQUEsTUFDckQsYUFBYSxLQUFLLFFBQVEsa0NBQVcsMEJBQTBCO0FBQUEsSUFDakU7QUFBQSxJQUNBLFFBQVEsQ0FBQyxTQUFTLFdBQVc7QUFBQSxFQUMvQjtBQUFBLEVBQ0EsY0FBYztBQUFBLElBQ1osU0FBUyxDQUFDLFNBQVMsV0FBVztBQUFBLElBQzlCLFNBQVMsQ0FBQyx5QkFBeUI7QUFBQSxJQUNuQyxPQUFPO0FBQUEsSUFDUCxnQkFBZ0I7QUFBQSxNQUNkLFNBQVM7QUFBQSxRQUNQO0FBQUEsVUFDRSxNQUFNO0FBQUEsVUFDTixNQUFNLE9BQU87QUFDWCxrQkFBTSxVQUFVLEVBQUUsUUFBUSwyQkFBMkIsR0FBRyxPQUFPO0FBQUEsY0FDN0QsTUFBTTtBQUFBLGNBQ04sVUFBVTtBQUFBLFlBQ1osRUFBRTtBQUFBLFVBQ0o7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxpQkFBaUI7QUFBQSxNQUNmLFNBQVMsQ0FBQyx5QkFBeUI7QUFBQSxJQUNyQztBQUFBLElBQ0EsZUFBZTtBQUFBLE1BQ2IsVUFBVSxDQUFDLE9BQU8sR0FBRyxTQUFTLHlCQUF5QjtBQUFBLElBQ3pEO0FBQUEsRUFDRjtBQUFBLEVBQ0EsYUFBYTtBQUNmLEVBQUU7IiwKICAibmFtZXMiOiBbXQp9Cg==
