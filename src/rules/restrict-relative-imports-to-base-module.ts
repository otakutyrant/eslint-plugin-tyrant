import path from "node:path";

import type { Rule } from "eslint";
import ts from "typescript";

import { isTypeScriptFilename } from "./file-tsdoc-utils.js";

const RELATIVE_IMPORT_MESSAGE_ID = "unexpectedRelativeImport";
const REQUIRE_RELATIVE_BASE_IMPORT_MESSAGE_ID =
  "requireRelativeBaseModuleImport";
const DEFAULT_COMPILER_OPTIONS: ts.CompilerOptions = {
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
};
const compilerOptionsCache = new Map<string, ts.CompilerOptions>();
const TYPESCRIPT_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts"]);

interface SubmoduleInfo {
  baseModuleName: string;
  submoduleName: string;
}

interface CompilerConfig {
  configDirectory: string | null;
  options: ts.CompilerOptions;
}

function isDeclarationFile(filename: string): boolean {
  return /\.d\.(?:ts|cts|mts)$/.test(filename);
}

function isRelativeSpecifier(specifier: string): boolean {
  return (
    specifier === "." ||
    specifier === ".." ||
    specifier.startsWith("./") ||
    specifier.startsWith("../")
  );
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

  if (cachedOptions) {
    return {
      configDirectory: path.dirname(configPath),
      options: cachedOptions,
    };
  }

  const configFile = ts.readConfigFile(configPath, (candidate) =>
    ts.sys.readFile(candidate),
  );

  if (configFile.error) {
    compilerOptionsCache.set(configPath, DEFAULT_COMPILER_OPTIONS);
    return {
      configDirectory: path.dirname(configPath),
      options: DEFAULT_COMPILER_OPTIONS,
    };
  }

  const parsedConfig = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(configPath),
  );

  compilerOptionsCache.set(configPath, parsedConfig.options);
  return {
    configDirectory: path.dirname(configPath),
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

function getExtensionlessImportPath(resolvedFilename: string): string {
  const extension = path.extname(resolvedFilename);
  return resolvedFilename.slice(0, -extension.length).replaceAll(path.sep, "/");
}

function getNonRelativeImportSpecifier(
  containingFile: string,
  resolvedFilename: string,
): string | null {
  const compilerConfig = getCompilerConfig(containingFile);
  const baseUrl = compilerConfig.options.baseUrl;

  if (!baseUrl) {
    return null;
  }

  const absoluteBaseUrl = path.isAbsolute(baseUrl)
    ? baseUrl
    : compilerConfig.configDirectory
      ? path.resolve(compilerConfig.configDirectory, baseUrl)
      : path.resolve(path.dirname(containingFile), baseUrl);
  const importPath = getExtensionlessImportPath(resolvedFilename);
  const relativeToBaseUrl = path.relative(absoluteBaseUrl, importPath);

  if (
    relativeToBaseUrl === "" ||
    relativeToBaseUrl.startsWith("..") ||
    path.isAbsolute(relativeToBaseUrl)
  ) {
    return null;
  }

  const candidateSpecifier = relativeToBaseUrl.replaceAll(path.sep, "/");

  if (resolveModule(containingFile, candidateSpecifier) !== resolvedFilename) {
    return null;
  }

  return candidateSpecifier;
}

function getRequiredRelativeBaseImportSpecifier(
  containingFile: string,
  baseModuleName: string,
  resolvedFilename: string,
): string | null {
  const candidateSpecifier = `./${baseModuleName}`;

  if (resolveModule(containingFile, candidateSpecifier) !== resolvedFilename) {
    return null;
  }

  return candidateSpecifier;
}

function getQuoteCharacter(rawSpecifier: string | undefined): string {
  return rawSpecifier?.startsWith("'") ? "'" : '"';
}

function getSubmoduleInfo(filename: string): SubmoduleInfo | null {
  const stem = path.parse(filename).name;
  const separatorIndex = stem.indexOf(".");

  if (separatorIndex <= 0) {
    return null;
  }

  return {
    baseModuleName: stem.slice(0, separatorIndex),
    submoduleName: stem,
  };
}

function isSameDirectoryBaseModule(
  currentFilename: string,
  resolvedFilename: string,
  submoduleInfo: SubmoduleInfo | null,
): boolean {
  if (!submoduleInfo) {
    return false;
  }

  return (
    path.dirname(currentFilename) === path.dirname(resolvedFilename) &&
    path.parse(resolvedFilename).name === submoduleInfo.baseModuleName
  );
}

export const restrictRelativeImportsToBaseModuleRule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow relative imports except when a sibling submodule imports its base module from the same directory.",
    },
    fixable: "code",
    hasSuggestions: false,
    schema: [],
    messages: {
      [RELATIVE_IMPORT_MESSAGE_ID]:
        "Relative imports are only allowed when a sibling submodule imports its base module from the same directory.",
      [REQUIRE_RELATIVE_BASE_IMPORT_MESSAGE_ID]:
        "When '{{submoduleName}}' imports the sibling base module '{{baseModuleName}}', use a relative import such as './{{baseModuleName}}'.",
    },
  },
  create(context) {
    const filename = context.filename;

    if (!isTypeScriptFilename(filename) || filename === "<input>") {
      return {};
    }

    const submoduleInfo = getSubmoduleInfo(filename);

    return {
      ImportDeclaration(node) {
        if (typeof node.source.value !== "string") {
          return;
        }

        const specifier = node.source.value;
        const resolvedFilename = resolveModule(filename, specifier);

        if (isRelativeSpecifier(specifier)) {
          if (
            resolvedFilename &&
            isSameDirectoryBaseModule(filename, resolvedFilename, submoduleInfo)
          ) {
            return;
          }

          context.report({
            messageId: RELATIVE_IMPORT_MESSAGE_ID,
            node: node.source,
            fix: resolvedFilename
              ? (fixer) => {
                  const replacementSpecifier = getNonRelativeImportSpecifier(
                    filename,
                    resolvedFilename,
                  );

                  if (!replacementSpecifier) {
                    return null;
                  }

                  const quote = getQuoteCharacter(node.source.raw);

                  return fixer.replaceText(
                    node.source,
                    `${quote}${replacementSpecifier}${quote}`,
                  );
                }
              : null,
          });
          return;
        }

        if (
          submoduleInfo &&
          resolvedFilename &&
          isSameDirectoryBaseModule(filename, resolvedFilename, submoduleInfo)
        ) {
          context.report({
            messageId: REQUIRE_RELATIVE_BASE_IMPORT_MESSAGE_ID,
            node: node.source,
            data: {
              baseModuleName: submoduleInfo.baseModuleName,
              submoduleName: submoduleInfo.submoduleName,
            },
            fix(fixer) {
              const replacementSpecifier = getRequiredRelativeBaseImportSpecifier(
                filename,
                submoduleInfo.baseModuleName,
                resolvedFilename,
              );

              if (!replacementSpecifier) {
                return null;
              }

              const quote = getQuoteCharacter(node.source.raw);

              return fixer.replaceText(
                node.source,
                `${quote}${replacementSpecifier}${quote}`,
              );
            },
          });
        }
      },
    };
  },
};
