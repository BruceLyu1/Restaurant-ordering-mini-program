import { defineConfig } from "vite";
import { readFileSync } from "node:fs";
import ts from "typescript";

const reactExports = [
  "Activity",
  "Children",
  "Component",
  "Fragment",
  "Profiler",
  "PureComponent",
  "StrictMode",
  "Suspense",
  "__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE",
  "__COMPILER_RUNTIME",
  "act",
  "cache",
  "cacheSignal",
  "captureOwnerStack",
  "cloneElement",
  "createContext",
  "createElement",
  "createRef",
  "forwardRef",
  "isValidElement",
  "lazy",
  "memo",
  "startTransition",
  "unstable_useCacheRefresh",
  "use",
  "useActionState",
  "useCallback",
  "useContext",
  "useDebugValue",
  "useDeferredValue",
  "useEffect",
  "useEffectEvent",
  "useId",
  "useImperativeHandle",
  "useInsertionEffect",
  "useLayoutEffect",
  "useMemo",
  "useOptimistic",
  "useReducer",
  "useRef",
  "useState",
  "useSyncExternalStore",
  "useTransition",
  "version",
];

const reactDomExports = [
  "__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE",
  "createPortal",
  "flushSync",
  "preconnect",
  "prefetchDNS",
  "preinit",
  "preinitModule",
  "preload",
  "preloadModule",
  "requestFormReset",
  "unstable_batchedUpdates",
  "useFormState",
  "useFormStatus",
  "version",
];

const schedulerExports = [
  "unstable_IdlePriority",
  "unstable_ImmediatePriority",
  "unstable_LowPriority",
  "unstable_NormalPriority",
  "unstable_Profiling",
  "unstable_UserBlockingPriority",
  "unstable_cancelCallback",
  "unstable_forceFrameRate",
  "unstable_getCurrentPriorityLevel",
  "unstable_next",
  "unstable_now",
  "unstable_requestPaint",
  "unstable_runWithPriority",
  "unstable_scheduleCallback",
  "unstable_shouldYield",
  "unstable_wrapCallback",
];

function exportLines(exports: string[], sourceName: string) {
  return exports.map((name) => `export const ${name} = ${sourceName}.${name};`).join("\n");
}

export function typescriptTranspilePlugin(isDev: boolean) {
  return {
    name: "typescript-transpile",
    enforce: "pre" as const,
    transform(code: string, id: string) {
      const cleanId = id.split("?")[0];

      if (
        cleanId.includes("/node_modules/") ||
        cleanId.includes("\\node_modules\\") ||
        !/\.[cm]?[tj]sx?$/.test(cleanId)
      ) {
        return null;
      }

      const replacedCode = code
        .replaceAll("import.meta.env.DEV", JSON.stringify(isDev))
        .replaceAll("import.meta.env.BASE_URL", JSON.stringify("./"));

      const result = ts.transpileModule(replacedCode, {
        compilerOptions: {
          jsx: ts.JsxEmit.ReactJSX,
          module: ts.ModuleKind.ESNext,
          sourceMap: true,
          target: ts.ScriptTarget.ES2020,
          useDefineForClassFields: true,
        },
        fileName: cleanId,
      });

      return {
        code: result.outputText,
        map: result.sourceMapText ? JSON.parse(result.sourceMapText) : null,
      };
    },
  };
}

export function commonJsDependencyPlugin(isDev: boolean) {
  const mode = isDev ? "development" : "production";
  const modules = {
    "\0cjs-react": {
      imports: "",
      requires: "{}",
      source: `node_modules/react/cjs/react.${mode}.js`,
      exports: reactExports,
    },
    "\0cjs-react-jsx-runtime": {
      imports: 'import React from "react";',
      requires: '{ react: React }',
      source: `node_modules/react/cjs/react-jsx-runtime.${mode}.js`,
      exports: ["Fragment", "jsx", "jsxs"],
    },
    "\0cjs-react-dom": {
      imports: 'import React from "react";',
      requires: '{ react: React }',
      source: `node_modules/react-dom/cjs/react-dom.${mode}.js`,
      exports: reactDomExports,
    },
    "\0cjs-react-dom-client": {
      imports: [
        'import React from "react";',
        'import ReactDOM from "react-dom";',
        'import Scheduler from "scheduler";',
      ].join("\n"),
      requires: '{ react: React, "react-dom": ReactDOM, scheduler: Scheduler }',
      source: `node_modules/react-dom/cjs/react-dom-client.${mode}.js`,
      exports: ["createRoot", "hydrateRoot", "version"],
    },
    "\0cjs-scheduler": {
      imports: "",
      requires: "{}",
      source: `node_modules/scheduler/cjs/scheduler.${mode}.js`,
      exports: schedulerExports,
    },
  } as const;

  const aliases: Record<string, keyof typeof modules> = {
    react: "\0cjs-react",
    "react/jsx-runtime": "\0cjs-react-jsx-runtime",
    "react-dom": "\0cjs-react-dom",
    "react-dom/client": "\0cjs-react-dom-client",
    scheduler: "\0cjs-scheduler",
  };

  return {
    name: "commonjs-dependency-shims",
    enforce: "pre" as const,
    resolveId(id: string) {
      return aliases[id] ?? null;
    },
    load(id: string) {
      const mod = modules[id as keyof typeof modules];

      if (!mod) {
        return null;
      }

      const source = readFileSync(mod.source, "utf8").replaceAll(
        "process.env.NODE_ENV",
        JSON.stringify(mode),
      );

      return `
${mod.imports}
const process = { env: { NODE_ENV: ${JSON.stringify(mode)} } };
const module = { exports: {} };
const exports = module.exports;
const requireMap = ${mod.requires};
const require = (name) => {
  if (Object.prototype.hasOwnProperty.call(requireMap, name)) {
    return requireMap[name];
  }
  throw new Error("Unsupported CommonJS dependency: " + name);
};
(function (module, exports, require, process) {
${source}
})(module, exports, require, process);
const commonjsExports = module.exports;
export default commonjsExports;
${exportLines([...mod.exports], "commonjsExports")}
`;
    },
  };
}

export default defineConfig(({ command }) => ({
  base: "./",
  build: {
    cssMinify: false,
    minify: false,
  },
  esbuild: false,
  optimizeDeps: {
    include: [],
    noDiscovery: true,
  },
  plugins: [commonJsDependencyPlugin(command === "serve"), typescriptTranspilePlugin(command === "serve")],
  resolve: {
    preserveSymlinks: true,
  },
}));
