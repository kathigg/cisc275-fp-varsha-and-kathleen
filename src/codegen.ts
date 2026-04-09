import type {
    ButtonComponent,
    CheckBoxComponent,
    PageNode,
    Project,
    RouteDefinition,
    SelectBoxComponent,
    StateField,
    TextAreaComponent,
    TextBoxComponent,
    UIComponent,
} from "./projectModel";
import { getInputComponents, toSnakeCase } from "./projectModel";

const PYTHON_KEYWORDS = new Set([
    "and",
    "as",
    "assert",
    "async",
    "await",
    "break",
    "class",
    "continue",
    "def",
    "del",
    "elif",
    "else",
    "except",
    "false",
    "finally",
    "for",
    "from",
    "global",
    "if",
    "import",
    "in",
    "is",
    "lambda",
    "none",
    "nonlocal",
    "not",
    "or",
    "pass",
    "raise",
    "return",
    "true",
    "try",
    "while",
    "with",
    "yield",
]);

function escapePythonString(value: string): string {
    return `"${value
        .replace(/\\/g, "\\\\")
        .replace(/\r/g, "\\r")
        .replace(/\n/g, "\\n")
        .replace(/"/g, '\\"')}"`;
}

function toPythonIdentifier(value: string, fallback: string): string {
    const normalized = toSnakeCase(value);
    const safeBase = normalized.length > 0 ? normalized : fallback;
    const prefixed =
        /^[a-z_]/.test(safeBase) ? safeBase : `${fallback}_${safeBase}`;
    return PYTHON_KEYWORDS.has(prefixed) ? `${fallback}_${prefixed}` : prefixed;
}

function toPythonClassName(value: string, fallback: string): string {
    const tokens = value
        .trim()
        .split(/[^a-zA-Z0-9]+/g)
        .filter((token) => token.length > 0);
    const baseName = tokens
        .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
        .join("");
    const candidate = baseName.length > 0 ? baseName : fallback;
    const prefixed = /^[A-Za-z_]/.test(candidate)
        ? candidate
        : `${fallback}${candidate}`;
    return PYTHON_KEYWORDS.has(prefixed.toLowerCase())
        ? `Generated${prefixed}`
        : prefixed;
}

function getDefaultValue(field: StateField): string {
    if (field.type.startsWith("list[")) {
        return "field(default_factory=list)";
    }
    if (field.type === "int") {
        return "0";
    }
    if (field.type === "float") {
        return "0.0";
    }
    if (field.type === "bool") {
        return "False";
    }
    return '""';
}

function createFunctionNameMap(project: Project): Map<string, string> {
    const functionNames = new Map<string, string>();
    const usedNames = new Set<string>();
    project.pages.forEach((page, index) => {
        if (index === 0) {
            functionNames.set(page.id, "index");
            usedNames.add("index");
            return;
        }
        const baseName = toFunctionName(page.name);
        let candidateName = baseName === "index" ? "page_index" : baseName;
        let suffix = 2;
        while (usedNames.has(candidateName)) {
            candidateName = `${baseName}_${suffix}`;
            suffix += 1;
        }
        functionNames.set(page.id, candidateName);
        usedNames.add(candidateName);
    });
    return functionNames;
}

function createClassNameMap(project: Project): {
    primaryStateName: string;
    secondaryClassNames: Map<string, string>;
} {
    const usedNames = new Set<string>();
    const primaryStateName = toPythonClassName(
        project.stateModel.primaryName,
        "AppState",
    );
    usedNames.add(primaryStateName);
    const secondaryClassNames = new Map<string, string>();
    project.stateModel.secondaryClasses.forEach((secondaryClass, index) => {
        const baseName = toPythonClassName(
            secondaryClass.name,
            `NestedRecord${index + 1}`,
        );
        let candidateName = baseName;
        let suffix = 2;
        while (usedNames.has(candidateName)) {
            candidateName = `${baseName}${suffix}`;
            suffix += 1;
        }
        secondaryClassNames.set(secondaryClass.id, candidateName);
        usedNames.add(candidateName);
    });
    return { primaryStateName, secondaryClassNames };
}

function componentToPython(
    component: UIComponent,
    currentPage: PageNode,
    project: Project,
    functionNames: Map<string, string>,
): string {
    switch (component.type) {
        case "Text":
            return escapePythonString(component.content);
        case "Header":
            return `Header(${escapePythonString(component.content)}, ${component.level})`;
        case "TextBox":
            return `TextBox(${escapePythonString(
                toPythonIdentifier(component.name, "field"),
            )}, ${escapePythonString(component.defaultValue)})`;
        case "TextArea":
            return `TextArea(${escapePythonString(
                toPythonIdentifier(component.name, "field"),
            )}, ${escapePythonString(component.defaultValue)})`;
        case "CheckBox":
            return `CheckBox(${escapePythonString(
                toPythonIdentifier(component.name, "field"),
            )}, ${component.defaultValue ? "True" : "False"})`;
        case "SelectBox":
            return `SelectBox(${escapePythonString(
                toPythonIdentifier(component.name, "field"),
            )}, [${component.options
                .map((option) => escapePythonString(option))
                .join(", ")}], ${escapePythonString(component.defaultValue)})`;
        case "Button":
            return buildButtonPython(
                component,
                currentPage,
                project.routes,
                project.pages,
                functionNames,
            );
    }
}

function buildButtonPython(
    component: ButtonComponent,
    currentPage: PageNode,
    routes: RouteDefinition[],
    pages: PageNode[],
    functionNames: Map<string, string>,
): string {
    const route = routes.find((candidate) => candidate.id === component.routeId);
    const targetPage = pages.find((page) => page.id === route?.targetPageId);
    const targetName =
        targetPage !== undefined
            ? (functionNames.get(targetPage.id) ?? "index")
            : (functionNames.get(currentPage.id) ?? "index");
    return `Button(${escapePythonString(component.label)}, ${targetName})`;
}

function toFunctionName(value: string): string {
    return toPythonIdentifier(value, "page");
}

function resolvePythonType(
    rawType: string,
    project: Project,
    secondaryClassNames: Map<string, string>,
): string {
    const normalizedType = rawType.trim();
    if (normalizedType.length === 0) {
        return "str";
    }
    const directMatch = project.stateModel.secondaryClasses.find(
        (secondaryClass) => secondaryClass.name === normalizedType,
    );
    if (directMatch !== undefined) {
        return secondaryClassNames.get(directMatch.id) ?? normalizedType;
    }
    if (normalizedType.startsWith("list[") && normalizedType.endsWith("]")) {
        const innerType = normalizedType.slice(5, -1).trim();
        const nestedMatch = project.stateModel.secondaryClasses.find(
            (secondaryClass) => secondaryClass.name === innerType,
        );
        if (nestedMatch !== undefined) {
            return `list[${secondaryClassNames.get(nestedMatch.id) ?? innerType}]`;
        }
    }
    return normalizedType;
}

function getRouteParameters(page: PageNode, project: Project): string[] {
    const incomingRoutes = project.routes.filter(
        (route) => route.targetPageId === page.id,
    );
    const parameterMap = new Map<string, string>();
    incomingRoutes.forEach((route) => {
        const sourcePage = project.pages.find(
            (candidate) => candidate.id === route.sourcePageId,
        );
        if (sourcePage === undefined) {
            return;
        }
        getInputComponents(sourcePage).forEach((component) => {
            const parameterName = toPythonIdentifier(component.name, "field");
            const parameterValue = buildParameterValue(component);
            parameterMap.set(parameterName, parameterValue);
        });
    });
    return Array.from(parameterMap.entries()).map(
        ([name, value]) => `${name}: ${value}`,
    );
}

function buildParameterValue(
    component:
        | TextBoxComponent
        | TextAreaComponent
        | CheckBoxComponent
        | SelectBoxComponent,
): string {
    if (component.type === "CheckBox") {
        return `bool = ${component.defaultValue ? "True" : "False"}`;
    }
    return `str = ${escapePythonString(component.defaultValue)}`;
}

function buildAnnotationComments(page: PageNode, project: Project): string[] {
    const pageComments = page.annotations.map((annotation) => {
        const prefix =
            annotation.type === "state-change"
                ? "State"
                : annotation.type === "if"
                  ? "If"
                  : "For";
        return `    # ${prefix}: ${annotation.explanation}`;
    });
    const incomingRouteComments = project.routes
        .filter((route) => route.targetPageId === page.id)
        .flatMap((route) =>
            route.annotations.map((annotation) => {
                const prefix =
                    annotation.type === "state-change"
                        ? "State"
                        : annotation.type === "if"
                          ? "If"
                          : "For";
                return `    # ${prefix} on route ${route.label}: ${annotation.explanation}`;
            }),
        );
    return [...pageComments, ...incomingRouteComments];
}

function buildPageFunction(
    page: PageNode,
    project: Project,
    functionNames: Map<string, string>,
    primaryStateName: string,
): string {
    const functionName = functionNames.get(page.id) ?? "index";
    const parameters = getRouteParameters(page, project);
    const signature =
        parameters.length > 0
            ? `state: ${primaryStateName}, ${parameters.join(", ")}`
            : `state: ${primaryStateName}`;
    const commentLines = buildAnnotationComments(page, project);
    const componentLines = page.components.map(
        (component) =>
            `            ${componentToPython(
                component,
                page,
                project,
                functionNames,
            )},`,
    );
    const commentBlock = commentLines.length > 0 ? `${commentLines.join("\n")}\n` : "";
    return `@route
def ${functionName}(${signature}):
    """${page.purpose}"""
${commentBlock}    return Page(
        state,
        [
${componentLines.join("\n")}
        ],
    )`;
}

function buildSecondaryClassWithNames(
    className: Project["stateModel"]["secondaryClasses"][number],
    naming: {
        primaryStateName: string;
        secondaryClassNames: Map<string, string>;
    },
    project: Project,
): string {
    const fieldLines = className.fields.map(
        (field) =>
            `    ${toPythonIdentifier(field.name, "field")}: ${resolvePythonType(
                field.type,
                project,
                naming.secondaryClassNames,
            )} = ${getDefaultValue({
                id: field.id,
                name: field.name,
                type: resolvePythonType(
                    field.type,
                    project,
                    naming.secondaryClassNames,
                ),
                description: field.description,
                updatedByPageIds: [],
                updatedByRouteIds: [],
            })}`,
    );
    return `@dataclass
class ${naming.secondaryClassNames.get(className.id) ?? "NestedRecord"}:
    """${className.description}"""
${fieldLines.join("\n")}`;
}

function buildPrimaryState(
    project: Project,
    naming: {
        primaryStateName: string;
        secondaryClassNames: Map<string, string>;
    },
): string {
    const fieldLines = project.stateModel.primaryFields.map(
        (field) =>
            `    ${toPythonIdentifier(field.name, "field")}: ${resolvePythonType(
                field.type,
                project,
                naming.secondaryClassNames,
            )} = ${getDefaultValue({
                ...field,
                type: resolvePythonType(
                    field.type,
                    project,
                    naming.secondaryClassNames,
                ),
            })}`,
    );
    return `@dataclass
class ${naming.primaryStateName}:
    """Primary application state for ${project.name}."""
${fieldLines.join("\n")}`;
}

export function buildPythonStarter(project: Project): string {
    const functionNames = createFunctionNameMap(project);
    const naming = createClassNameMap(project);
    const imports = [
        "from dataclasses import dataclass, field",
        "from drafter import *",
    ];
    const secondaryClasses = project.stateModel.secondaryClasses.map((item) =>
        buildSecondaryClassWithNames(item, naming, project),
    );
    const pageFunctions = project.pages.map((page) =>
        buildPageFunction(page, project, functionNames, naming.primaryStateName),
    );
    const routeNotes = project.routes.map((route) => {
        const sourcePage = project.pages.find(
            (page) => page.id === route.sourcePageId,
        );
        const targetPage = project.pages.find(
            (page) => page.id === route.targetPageId,
        );
        return `# Route: ${route.label} (${sourcePage?.name ?? "Missing Source"} -> ${
            targetPage?.name ?? "Missing Target"
        })`;
    });

    return [
        ...imports,
        "",
        ...secondaryClasses,
        ...(secondaryClasses.length > 0 ? [""] : []),
        buildPrimaryState(project, naming),
        "",
        ...routeNotes,
        ...(routeNotes.length > 0 ? [""] : []),
        ...pageFunctions,
        "",
        `start_server(${naming.primaryStateName}())`,
    ].join("\n");
}
