import path from "node:path";

import type { Rule } from "eslint";
import ts from "typescript";

import { isTypeScriptFilename } from "./file-tsdoc-utils.js";

const INVALID_LAYER_DEPENDENCY_MESSAGE_ID = "invalidLayerDependency";
const DEFAULT_COMPILER_OPTIONS: ts.CompilerOptions = {
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
};
const TYPESCRIPT_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts"]);
const compilerOptionsCache = new Map<string, ts.CompilerOptions>();
const configDirectoryCache = new Map<string, string | null>();

interface CompilerConfig {
  configDirectory: string | null;
  options: ts.CompilerOptions;
}

interface LayerLocation {
  layerName: string;
  relativePath: string;
}

function isDeclarationFile(filename: string): boolean {
  return /\.d\.(?:ts|cts|mts)$/.test(filename);
}

function getCompilerConfig(filename: string): CompilerConfig {
  const configPath = ts.findConfigFile(path.dirname(filename), (candidate) =>
    ts.sys.fileExists(candidate),
  );

  if (!configPath) {
    return {
      configDirectory: null,
      options: DEFAULT_COMPILER_OPTIONS,
    };
  }

  const cachedOptions = compilerOptionsCache.get(configPath);
  const cachedConfigDirectory = configDirectoryCache.get(configPath);

  if (cachedOptions && cachedConfigDirectory !== undefined) {
    return {
      configDirectory: cachedConfigDirectory,
      options: cachedOptions,
    };
  }

  const configFile = ts.readConfigFile(configPath, (candidate) =>
    ts.sys.readFile(candidate),
  );
  const configDirectory = path.dirname(configPath);

  if (configFile.error) {
    compilerOptionsCache.set(configPath, DEFAULT_COMPILER_OPTIONS);
    configDirectoryCache.set(configPath, configDirectory);

    return {
      configDirectory,
      options: DEFAULT_COMPILER_OPTIONS,
    };
  }

  const parsedConfig = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    configDirectory,
  );

  compilerOptionsCache.set(configPath, parsedConfig.options);
  configDirectoryCache.set(configPath, configDirectory);

  return {
    configDirectory,
    options: parsedConfig.options,
  };
}

function resolveModule(
  containingFile: string,
  specifier: string,
): string | null {
  const compilerConfig = getCompilerConfig(containingFile);
  const resolvedModule = ts.resolveModuleName(
    specifier,
    containingFile,
    compilerConfig.options,
    ts.sys,
  ).resolvedModule;

  if (!resolvedModule) {
    return null;
  }

  const resolvedFilename = path.normalize(resolvedModule.resolvedFileName);
  const extension = path.extname(resolvedFilename);

  if (
    isDeclarationFile(resolvedFilename) ||
    !TYPESCRIPT_EXTENSIONS.has(extension)
  ) {
    return null;
  }

  return resolvedFilename;
}

function getConfiguredLayerLocation(
  filename: string,
  configuredLayers: readonly string[],
): LayerLocation | null {
  const { configDirectory } = getCompilerConfig(filename);
  const projectRoot = configDirectory ?? process.cwd();
  const relativePath = path.relative(projectRoot, filename);

  if (
    relativePath === "" ||
    relativePath.startsWith("..") ||
    path.isAbsolute(relativePath)
  ) {
    return null;
  }

  const [topLevelDirectory] = relativePath.split(path.sep);

  if (!configuredLayers.includes(topLevelDirectory)) {
    return null;
  }

  return {
    layerName: topLevelDirectory,
    relativePath: relativePath.replaceAll(path.sep, "/"),
  };
}

export const enforceModuleLayerDependenciesRule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require configured top-level module directories to depend only on themselves or lower layers.",
    },
    hasSuggestions: false,
    schema: [
      {
        type: "array",
        items: {
          type: "string",
        },
        minItems: 1,
      },
    ],
    messages: {
      [INVALID_LAYER_DEPENDENCY_MESSAGE_ID]:
        "Layer '{{sourceLayer}}' must not depend on higher layer '{{targetLayer}}'. '{{sourcePath}}' imports '{{targetPath}}'.",
    },
  },
  create(context) {
    const filename = context.filename;

    if (!isTypeScriptFilename(filename) || filename === "<input>") {
      return {};
    }

    const configuredLayers = context.options[0];

    if (
      !Array.isArray(configuredLayers) ||
      configuredLayers.length === 0 ||
      !configuredLayers.every(
        (layer): layer is string => typeof layer === "string",
      )
    ) {
      return {};
    }

    const sourceLocation = getConfiguredLayerLocation(
      filename,
      configuredLayers,
    );

    if (!sourceLocation) {
      return {};
    }

    const layerOrder = new Map(
      configuredLayers.map((layer, index) => [layer, index] as const),
    );
    const sourceLayerIndex = layerOrder.get(sourceLocation.layerName);

    if (sourceLayerIndex === undefined) {
      return {};
    }

    return {
      ImportDeclaration(node) {
        if (typeof node.source.value !== "string") {
          return;
        }

        const resolvedFilename = resolveModule(filename, node.source.value);

        if (!resolvedFilename) {
          return;
        }

        const targetLocation = getConfiguredLayerLocation(
          resolvedFilename,
          configuredLayers,
        );

        if (!targetLocation) {
          return;
        }

        const targetLayerIndex = layerOrder.get(targetLocation.layerName);

        if (
          targetLayerIndex === undefined ||
          targetLayerIndex <= sourceLayerIndex
        ) {
          return;
        }

        context.report({
          node: node.source,
          messageId: INVALID_LAYER_DEPENDENCY_MESSAGE_ID,
          data: {
            sourceLayer: sourceLocation.layerName,
            sourcePath: sourceLocation.relativePath,
            targetLayer: targetLocation.layerName,
            targetPath: targetLocation.relativePath,
          },
        });
      },
    };
  },
};
