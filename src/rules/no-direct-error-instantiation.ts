import type { Rule } from "eslint";

const MESSAGE_ID = "noDirectErrorInstantiation";

interface IdentifierLike {
  name: string;
  type: string;
}

interface MemberExpressionLike {
  computed: boolean;
  object: { type: string; name?: string };
  property: { type: string; name?: string };
  type: string;
}

interface ScopeReferenceLike {
  identifier: unknown;
  resolved: {
    defs: unknown[];
  } | null;
}

interface ScopeLike {
  references?: ScopeReferenceLike[];
}

function isIdentifierLike(node: unknown): node is IdentifierLike {
  return (
    typeof node === "object" &&
    node !== null &&
    "type" in node &&
    "name" in node &&
    typeof (node as { type: unknown }).type === "string" &&
    typeof (node as { name: unknown }).name === "string"
  );
}

function isMemberExpressionLike(node: unknown): node is MemberExpressionLike {
  return (
    typeof node === "object" &&
    node !== null &&
    "type" in node &&
    "computed" in node &&
    "object" in node &&
    "property" in node &&
    typeof (node as { type: unknown }).type === "string" &&
    typeof (node as { computed: unknown }).computed === "boolean"
  );
}

function isErrorConstructorReference(node: unknown): boolean {
  if (isIdentifierLike(node) && node.type === "Identifier") {
    return node.name === "Error";
  }

  if (
    isMemberExpressionLike(node) &&
    node.type === "MemberExpression" &&
    !node.computed &&
    node.object.type === "Identifier" &&
    typeof node.object.name === "string" &&
    node.property.type === "Identifier" &&
    typeof node.property.name === "string"
  ) {
    return (
      node.property.name === "Error" &&
      ["globalThis", "window", "self"].includes(node.object.name)
    );
  }

  return false;
}

function isShadowedErrorIdentifier(
  context: Rule.RuleContext,
  node: unknown,
): boolean {
  if (!isIdentifierLike(node) || node.type !== "Identifier" || node.name !== "Error") {
    return false;
  }

  const scope = context.sourceCode.getScope(node as never) as ScopeLike;
  const reference = scope.references?.find((candidate) => candidate.identifier === node);

  return Boolean(reference?.resolved && reference.resolved.defs.length > 0);
}

export const noDirectErrorInstantiationRule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow direct Error instantiation and require domain-specific Error subclasses instead.",
    },
    hasSuggestions: false,
    schema: [],
    messages: {
      [MESSAGE_ID]:
        "Do not instantiate Error directly. Define and use a DomainError class that extends Error instead.",
    },
  },
  create(context) {
    return {
      NewExpression(node) {
        if (node.callee.type === "Super") {
          return;
        }

        if (isShadowedErrorIdentifier(context, node.callee)) {
          return;
        }

        if (!isErrorConstructorReference(node.callee)) {
          return;
        }

        context.report({
          node: node.callee,
          messageId: MESSAGE_ID,
        });
      },
    };
  },
};
