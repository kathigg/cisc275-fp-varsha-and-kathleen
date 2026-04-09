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

function escapePythonString(value: string): string {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
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

function componentToPython(component: UIComponent, project: Project): string {
    switch (component.type) {
        case "Text":
            return `Text(${escapePythonString(component.content)})`;
        case "Header":
            return `Header(${escapePythonString(component.content)}, ${component.level})`;
        case "TextBox":
            return `TextBox(${escapePythonString(
                component.name,
            )}, ${escapePythonString(component.defaultValue)})`;
        case "TextArea":
            return `TextArea(${escapePythonString(
                component.name,
            )}, ${escapePythonString(component.defaultValue)})`;
        case "CheckBox":
            return `CheckBox(${escapePythonString(component.name)}, ${
                component.defaultValue ? "True" : "False"
            })`;
        case "SelectBox":
            return `SelectBox(${escapePythonString(
                component.name,
            )}, [${component.options
                .map((option) => escapePythonString(option))
                .join(", ")}], ${escapePythonString(component.defaultValue)})`;
        case "Button":
            return buildButtonPython(component, project.routes, project.pages);
    }
}

function buildButtonPython(
    component: ButtonComponent,
    routes: RouteDefinition[],
    pages: PageNode[],
): string {
    const route = routes.find((candidate) => candidate.id === component.routeId);
    const targetPage = pages.find((page) => page.id === route?.targetPageId);
    const targetName =
        targetPage !== undefined ? toFunctionName(targetPage.name) : "missing_route";
    return `Button(${escapePythonString(component.label)}, ${targetName})`;
}

function toFunctionName(value: string): string {
    const snakeCase = toSnakeCase(value);
    return /^[a-z]/.test(snakeCase) ? snakeCase : `page_${snakeCase}`;
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
            const parameterName = toSnakeCase(component.name);
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
    if (component.type === "TextBox" || component.type === "TextArea") {
        return `str = ${escapePythonString(component.defaultValue)}`;
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

function buildPageFunction(page: PageNode, project: Project): string {
    const functionName = toFunctionName(page.name);
    const parameters = getRouteParameters(page, project);
    const signature =
        parameters.length > 0
            ? `state: ${project.stateModel.primaryName}, ${parameters.join(", ")}`
            : `state: ${project.stateModel.primaryName}`;
    const commentLines = buildAnnotationComments(page, project);
    const componentLines = page.components.map(
        (component) => `            ${componentToPython(component, project)},`,
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

function buildSecondaryClass(className: Project["stateModel"]["secondaryClasses"][number]): string {
    const fieldLines = className.fields.map(
        (field) =>
            `    ${toSnakeCase(field.name)}: ${field.type} = ${getDefaultValue({
                id: field.id,
                name: field.name,
                type: field.type,
                description: field.description,
                updatedByPageIds: [],
                updatedByRouteIds: [],
            })}`,
    );
    return `@dataclass
class ${className.name}:
    """${className.description}"""
${fieldLines.join("\n")}`;
}

function buildPrimaryState(project: Project): string {
    const fieldLines = project.stateModel.primaryFields.map(
        (field) =>
            `    ${toSnakeCase(field.name)}: ${field.type} = ${getDefaultValue(field)}`,
    );
    return `@dataclass
class ${project.stateModel.primaryName}:
    """Primary application state for ${project.name}."""
${fieldLines.join("\n")}`;
}

export function buildPythonStarter(project: Project): string {
    const imports = [
        "from dataclasses import dataclass, field",
        "from drafter import Button, CheckBox, Header, Page, SelectBox, Text, TextArea, TextBox, route, start_server",
    ];
    const secondaryClasses = project.stateModel.secondaryClasses.map((item) =>
        buildSecondaryClass(item),
    );
    const pageFunctions = project.pages.map((page) => buildPageFunction(page, project));
    const rootFunction =
        project.pages.length > 0
            ? toFunctionName(project.pages[0].name)
            : "home_page";
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
        buildPrimaryState(project),
        "",
        ...routeNotes,
        ...(routeNotes.length > 0 ? [""] : []),
        ...pageFunctions,
        "",
        `start_server(${rootFunction})`,
    ].join("\n");
}
