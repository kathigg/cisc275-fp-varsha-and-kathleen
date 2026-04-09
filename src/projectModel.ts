export const STORAGE_KEY = "drafter-planner-projects";
export const PAGE_CARD_WIDTH = 220;
export const PAGE_CARD_HEIGHT = 164;

export const COMPONENT_TYPES = [
    "Text",
    "TextBox",
    "TextArea",
    "CheckBox",
    "SelectBox",
    "Button",
    "Header",
] as const;

export const FONT_OPTIONS = [
    "Georgia, serif",
    "'Trebuchet MS', sans-serif",
    "'Courier New', monospace",
    "Garamond, serif",
    "Verdana, sans-serif",
] as const;

export const FLEX_DIRECTIONS = ["column", "row"] as const;
export const JUSTIFY_OPTIONS = [
    "flex-start",
    "center",
    "flex-end",
    "space-between",
    "space-around",
] as const;
export const ALIGN_OPTIONS = [
    "flex-start",
    "center",
    "flex-end",
    "stretch",
] as const;

export const PRIMARY_TYPE_OPTIONS = [
    "str",
    "int",
    "float",
    "bool",
    "list[str]",
    "list[int]",
    "list[bool]",
] as const;

export const ANNOTATION_TYPES = ["state-change", "if", "for"] as const;
export const PROJECT_TABS = [
    "overview",
    "graph",
    "pages",
    "state",
    "logic",
] as const;

export type ComponentType = (typeof COMPONENT_TYPES)[number];
export type FontOption = (typeof FONT_OPTIONS)[number];
export type FlexDirection = (typeof FLEX_DIRECTIONS)[number];
export type JustifyOption = (typeof JUSTIFY_OPTIONS)[number];
export type AlignOption = (typeof ALIGN_OPTIONS)[number];
export type AnnotationType = (typeof ANNOTATION_TYPES)[number];
export type ProjectTab = (typeof PROJECT_TABS)[number];

export interface StyleSettings {
    backgroundColor: string;
    textColor: string;
    borderColor: string;
    fontFamily: FontOption;
    direction: FlexDirection;
    justifyContent: JustifyOption;
    alignItems: AlignOption;
    gap: number;
    padding: number;
    borderRadius: number;
    borderWidth: number;
    width: string;
}

export interface TextComponent {
    id: string;
    type: "Text";
    content: string;
    style: StyleSettings;
}

export interface HeaderComponent {
    id: string;
    type: "Header";
    content: string;
    level: 1 | 2 | 3 | 4;
    style: StyleSettings;
}

export interface TextBoxComponent {
    id: string;
    type: "TextBox";
    name: string;
    defaultValue: string;
    style: StyleSettings;
}

export interface TextAreaComponent {
    id: string;
    type: "TextArea";
    name: string;
    defaultValue: string;
    style: StyleSettings;
}

export interface CheckBoxComponent {
    id: string;
    type: "CheckBox";
    name: string;
    defaultValue: boolean;
    style: StyleSettings;
}

export interface SelectBoxComponent {
    id: string;
    type: "SelectBox";
    name: string;
    options: string[];
    defaultValue: string;
    style: StyleSettings;
}

export interface ButtonComponent {
    id: string;
    type: "Button";
    label: string;
    routeId: string;
    style: StyleSettings;
}

export type UIComponent =
    | TextComponent
    | HeaderComponent
    | TextBoxComponent
    | TextAreaComponent
    | CheckBoxComponent
    | SelectBoxComponent
    | ButtonComponent;

export interface Annotation {
    id: string;
    type: AnnotationType;
    explanation: string;
    relatedStateFieldId: string;
    relatedComponentId: string;
}

export interface PageNode {
    id: string;
    name: string;
    purpose: string;
    x: number;
    y: number;
    components: UIComponent[];
    style: StyleSettings;
    annotations: Annotation[];
}

export interface RouteDefinition {
    id: string;
    label: string;
    sourcePageId: string;
    targetPageId: string;
    annotations: Annotation[];
}

export interface StateField {
    id: string;
    name: string;
    type: string;
    description: string;
    updatedByPageIds: string[];
    updatedByRouteIds: string[];
}

export interface SecondaryStateField {
    id: string;
    name: string;
    type: string;
    description: string;
}

export interface SecondaryDataclass {
    id: string;
    name: string;
    description: string;
    linkedPrimaryFieldId: string;
    fields: SecondaryStateField[];
}

export interface StateModel {
    primaryName: string;
    primaryFields: StateField[];
    secondaryClasses: SecondaryDataclass[];
}

export interface Project {
    id: string;
    name: string;
    description: string;
    lastModified: string;
    pages: PageNode[];
    routes: RouteDefinition[];
    stateModel: StateModel;
}

export interface PlannerRoute {
    screen: "dashboard" | "project";
    projectId: string;
    tab: ProjectTab;
}

export type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];

export interface JsonObject {
    [key: string]: JsonValue;
}

const DEFAULT_STYLE: StyleSettings = {
    backgroundColor: "#fffdf6",
    textColor: "#1f2933",
    borderColor: "#d8d4cc",
    fontFamily: "Georgia, serif",
    direction: "column",
    justifyContent: "flex-start",
    alignItems: "stretch",
    gap: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    width: "100%",
};

const DEFAULT_PRIMARY_FIELDS = [
    {
        name: "page_title",
        type: "str",
        description: "The current heading shown in the interface.",
    },
    {
        name: "search_query",
        type: "str",
        description: "The text a visitor typed into the main search box.",
    },
    {
        name: "is_logged_in",
        type: "bool",
        description: "Whether the student is signed into the website.",
    },
    {
        name: "scores",
        type: "list[int]",
        description: "A simple list of saved score values for the user.",
    },
] as const;

export function createId(prefix: string): string {
    const randomValue =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.round(Math.random() * 100000)}`;
    return `${prefix}-${randomValue}`;
}

export function nowIsoString(): string {
    return new Date().toISOString();
}

export function createStyleSettings(
    overrides: Partial<StyleSettings> = {},
): StyleSettings {
    return { ...DEFAULT_STYLE, ...overrides };
}

export function createAnnotation(
    type: AnnotationType,
    explanation: string,
): Annotation {
    return {
        id: createId("annotation"),
        type,
        explanation,
        relatedStateFieldId: "",
        relatedComponentId: "",
    };
}

export function createStateField(
    name = "new_field",
    type = "str",
    description = "Describe how this state is used.",
): StateField {
    return {
        id: createId("state-field"),
        name,
        type,
        description,
        updatedByPageIds: [],
        updatedByRouteIds: [],
    };
}

export function createSecondaryStateField(
    name = "item_name",
    type = "str",
    description = "Describe this nested value.",
): SecondaryStateField {
    return {
        id: createId("secondary-field"),
        name,
        type,
        description,
    };
}

export function createDefaultStateModel(): StateModel {
    return {
        primaryName: "AppState",
        primaryFields: DEFAULT_PRIMARY_FIELDS.map((field) =>
            createStateField(field.name, field.type, field.description),
        ),
        secondaryClasses: [],
    };
}

export function toSnakeCase(value: string): string {
    const normalized = value
        .trim()
        .replace(/([a-z])([A-Z])/g, "$1_$2")
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
    return normalized.length > 0 ? normalized.toLowerCase() : "item";
}

export function pluralize(value: string): string {
    if (value.endsWith("s")) {
        return `${value}es`;
    }
    if (value.endsWith("y")) {
        return `${value.slice(0, -1)}ies`;
    }
    return `${value}s`;
}

export function createSecondaryDataclass(
    name = "TaskItem",
): {
    secondaryClass: SecondaryDataclass;
    linkedPrimaryField: StateField;
} {
    const linkedPrimaryField = createStateField(
        pluralize(toSnakeCase(name)),
        `list[${name}]`,
        `Collection of ${name} records stored in the main state.`,
    );
    return {
        linkedPrimaryField,
        secondaryClass: {
            id: createId("secondary-class"),
            name,
            description: `Nested record used by the ${pluralize(
                toSnakeCase(name),
            )} field.`,
            linkedPrimaryFieldId: linkedPrimaryField.id,
            fields: [
                createSecondaryStateField(
                    "title",
                    "str",
                    "Main label shown for the item.",
                ),
                createSecondaryStateField(
                    "is_done",
                    "bool",
                    "Tracks whether the item is complete.",
                ),
            ],
        },
    };
}

export function createPage(name = "New Page", x = 80, y = 80): PageNode {
    return {
        id: createId("page"),
        name,
        purpose: "Describe what this page helps the user accomplish.",
        x,
        y,
        components: [
            {
                id: createId("component"),
                type: "Header",
                content: name,
                level: 1,
                style: createStyleSettings({
                    backgroundColor: "#f5e7cf",
                    borderColor: "#d4b483",
                    width: "100%",
                }),
            },
            {
                id: createId("component"),
                type: "Text",
                content: "Add page instructions, prompts, or summary text here.",
                style: createStyleSettings({
                    backgroundColor: "#fffdf6",
                    borderColor: "#ebe6dc",
                    width: "100%",
                }),
            },
        ],
        style: createStyleSettings({
            backgroundColor: "#fff8e8",
            borderColor: "#d8b684",
            gap: 16,
            padding: 20,
        }),
        annotations: [],
    };
}

export function createRoute(
    sourcePageId: string,
    targetPageId: string,
    label = "go_to_next_page",
): RouteDefinition {
    return {
        id: createId("route"),
        label,
        sourcePageId,
        targetPageId,
        annotations: [],
    };
}

export function createComponent(type: ComponentType): UIComponent {
    switch (type) {
        case "Text":
            return {
                id: createId("component"),
                type,
                content: "New body text",
                style: createStyleSettings(),
            };
        case "Header":
            return {
                id: createId("component"),
                type,
                content: "New heading",
                level: 2,
                style: createStyleSettings({
                    backgroundColor: "#f5e7cf",
                    borderColor: "#d4b483",
                }),
            };
        case "TextBox":
            return {
                id: createId("component"),
                type,
                name: "text_input",
                defaultValue: "",
                style: createStyleSettings(),
            };
        case "TextArea":
            return {
                id: createId("component"),
                type,
                name: "long_text",
                defaultValue: "",
                style: createStyleSettings(),
            };
        case "CheckBox":
            return {
                id: createId("component"),
                type,
                name: "accept_terms",
                defaultValue: false,
                style: createStyleSettings(),
            };
        case "SelectBox":
            return {
                id: createId("component"),
                type,
                name: "selection",
                options: ["Option A", "Option B"],
                defaultValue: "Option A",
                style: createStyleSettings(),
            };
        case "Button":
            return {
                id: createId("component"),
                type,
                label: "Continue",
                routeId: "",
                style: createStyleSettings({
                    backgroundColor: "#d17a2b",
                    textColor: "#fff9f0",
                    borderColor: "#b25f17",
                    width: "fit-content",
                }),
            };
    }
}

export function createEmptyProject(name = "Untitled Planner"): Project {
    return {
        id: createId("project"),
        name,
        description: "Plan the pages, routes, state, and logic for your Drafter app.",
        lastModified: nowIsoString(),
        pages: [],
        routes: [],
        stateModel: createDefaultStateModel(),
    };
}

export function touchProject(project: Project): Project {
    return {
        ...project,
        lastModified: nowIsoString(),
    };
}

export function formatLastModified(value: string): string {
    const date = new Date(value);
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(date);
}

export function parsePlannerRoute(hash: string): PlannerRoute {
    const normalized = hash.replace(/^#/, "");
    if (normalized.length === 0 || normalized === "/dashboard") {
        return {
            screen: "dashboard",
            projectId: "",
            tab: "overview",
        };
    }
    const parts = normalized.split("/").filter(Boolean);
    if (parts.length > 1 && parts[0] === "project") {
        const candidateTab = parts[2];
        const tab = PROJECT_TABS.includes(candidateTab as ProjectTab)
            ? (candidateTab as ProjectTab)
            : "overview";
        return {
            screen: "project",
            projectId: parts[1],
            tab,
        };
    }
    return {
        screen: "dashboard",
        projectId: "",
        tab: "overview",
    };
}

export function getProjectHash(projectId: string, tab: ProjectTab): string {
    return `#/project/${projectId}/${tab}`;
}

export function getDashboardHash(): string {
    return "#/dashboard";
}

function isJsonObject(value: JsonValue): value is JsonObject {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(object: JsonObject, key: string, fallback = ""): string {
    const value = object[key];
    return typeof value === "string" ? value : fallback;
}

function readNumber(object: JsonObject, key: string, fallback = 0): number {
    const value = object[key];
    return typeof value === "number" ? value : fallback;
}

function readBoolean(
    object: JsonObject,
    key: string,
    fallback = false,
): boolean {
    const value = object[key];
    return typeof value === "boolean" ? value : fallback;
}

function readStringArray(object: JsonObject, key: string): string[] {
    const value = object[key];
    if (!Array.isArray(value)) {
        return [];
    }
    return value.filter((entry): entry is string => typeof entry === "string");
}

function parseStyleSettings(value: JsonValue): StyleSettings {
    if (!isJsonObject(value)) {
        return createStyleSettings();
    }
    const direction = readString(value, "direction", DEFAULT_STYLE.direction);
    const justifyContent = readString(
        value,
        "justifyContent",
        DEFAULT_STYLE.justifyContent,
    );
    const alignItems = readString(
        value,
        "alignItems",
        DEFAULT_STYLE.alignItems,
    );
    const fontFamily = readString(value, "fontFamily", DEFAULT_STYLE.fontFamily);
    return createStyleSettings({
        backgroundColor: readString(
            value,
            "backgroundColor",
            DEFAULT_STYLE.backgroundColor,
        ),
        textColor: readString(value, "textColor", DEFAULT_STYLE.textColor),
        borderColor: readString(value, "borderColor", DEFAULT_STYLE.borderColor),
        fontFamily: FONT_OPTIONS.includes(fontFamily as FontOption)
            ? (fontFamily as FontOption)
            : DEFAULT_STYLE.fontFamily,
        direction: FLEX_DIRECTIONS.includes(direction as FlexDirection)
            ? (direction as FlexDirection)
            : DEFAULT_STYLE.direction,
        justifyContent: JUSTIFY_OPTIONS.includes(
            justifyContent as JustifyOption,
        )
            ? (justifyContent as JustifyOption)
            : DEFAULT_STYLE.justifyContent,
        alignItems: ALIGN_OPTIONS.includes(alignItems as AlignOption)
            ? (alignItems as AlignOption)
            : DEFAULT_STYLE.alignItems,
        gap: readNumber(value, "gap", DEFAULT_STYLE.gap),
        padding: readNumber(value, "padding", DEFAULT_STYLE.padding),
        borderRadius: readNumber(
            value,
            "borderRadius",
            DEFAULT_STYLE.borderRadius,
        ),
        borderWidth: readNumber(
            value,
            "borderWidth",
            DEFAULT_STYLE.borderWidth,
        ),
        width: readString(value, "width", DEFAULT_STYLE.width),
    });
}

function parseAnnotation(value: JsonValue): Annotation | null {
    if (!isJsonObject(value)) {
        return null;
    }
    const type = readString(value, "type");
    if (!ANNOTATION_TYPES.includes(type as AnnotationType)) {
        return null;
    }
    return {
        id: readString(value, "id", createId("annotation")),
        type: type as AnnotationType,
        explanation: readString(value, "explanation"),
        relatedStateFieldId: readString(value, "relatedStateFieldId"),
        relatedComponentId: readString(value, "relatedComponentId"),
    };
}

function parseComponent(value: JsonValue): UIComponent | null {
    if (!isJsonObject(value)) {
        return null;
    }
    const type = readString(value, "type");
    const style = parseStyleSettings(value.style ?? null);
    const id = readString(value, "id", createId("component"));
    switch (type) {
        case "Text":
            return {
                id,
                type,
                content: readString(value, "content", "New body text"),
                style,
            };
        case "Header": {
            const rawLevel = readNumber(value, "level", 2);
            const level = rawLevel >= 1 && rawLevel <= 4 ? rawLevel : 2;
            return {
                id,
                type,
                content: readString(value, "content", "New heading"),
                level: level as 1 | 2 | 3 | 4,
                style,
            };
        }
        case "TextBox":
            return {
                id,
                type,
                name: readString(value, "name", "text_input"),
                defaultValue: readString(value, "defaultValue"),
                style,
            };
        case "TextArea":
            return {
                id,
                type,
                name: readString(value, "name", "long_text"),
                defaultValue: readString(value, "defaultValue"),
                style,
            };
        case "CheckBox":
            return {
                id,
                type,
                name: readString(value, "name", "accept_terms"),
                defaultValue: readBoolean(value, "defaultValue"),
                style,
            };
        case "SelectBox": {
            const rawOptions = value.options;
            const options = Array.isArray(rawOptions)
                ? rawOptions.filter(
                      (entry): entry is string => typeof entry === "string",
                  )
                : ["Option A", "Option B"];
            return {
                id,
                type,
                name: readString(value, "name", "selection"),
                options,
                defaultValue: readString(
                    value,
                    "defaultValue",
                    options[0] ?? "",
                ),
                style,
            };
        }
        case "Button":
            return {
                id,
                type,
                label: readString(value, "label", "Continue"),
                routeId: readString(value, "routeId"),
                style,
            };
        default:
            return null;
    }
}

function parsePage(value: JsonValue): PageNode | null {
    if (!isJsonObject(value)) {
        return null;
    }
    const rawComponents = value.components;
    const rawAnnotations = value.annotations;
    const components = Array.isArray(rawComponents)
        ? rawComponents
              .map((entry) => parseComponent(entry))
              .filter((entry): entry is UIComponent => entry !== null)
        : [];
    const annotations = Array.isArray(rawAnnotations)
        ? rawAnnotations
              .map((entry) => parseAnnotation(entry))
              .filter((entry): entry is Annotation => entry !== null)
        : [];
    return {
        id: readString(value, "id", createId("page")),
        name: readString(value, "name", "Imported Page"),
        purpose: readString(value, "purpose"),
        x: readNumber(value, "x", 80),
        y: readNumber(value, "y", 80),
        components,
        style: parseStyleSettings(value.style ?? null),
        annotations,
    };
}

function parseRoute(value: JsonValue): RouteDefinition | null {
    if (!isJsonObject(value)) {
        return null;
    }
    const rawAnnotations = value.annotations;
    const annotations = Array.isArray(rawAnnotations)
        ? rawAnnotations
              .map((entry) => parseAnnotation(entry))
              .filter((entry): entry is Annotation => entry !== null)
        : [];
    return {
        id: readString(value, "id", createId("route")),
        label: readString(value, "label", "go_to_next_page"),
        sourcePageId: readString(value, "sourcePageId"),
        targetPageId: readString(value, "targetPageId"),
        annotations,
    };
}

function parsePrimaryField(value: JsonValue): StateField | null {
    if (!isJsonObject(value)) {
        return null;
    }
    return {
        id: readString(value, "id", createId("state-field")),
        name: readString(value, "name", "new_field"),
        type: readString(value, "type", "str"),
        description: readString(value, "description"),
        updatedByPageIds: readStringArray(value, "updatedByPageIds"),
        updatedByRouteIds: readStringArray(value, "updatedByRouteIds"),
    };
}

function parseSecondaryField(value: JsonValue): SecondaryStateField | null {
    if (!isJsonObject(value)) {
        return null;
    }
    return {
        id: readString(value, "id", createId("secondary-field")),
        name: readString(value, "name", "nested_field"),
        type: readString(value, "type", "str"),
        description: readString(value, "description"),
    };
}

function parseSecondaryClass(value: JsonValue): SecondaryDataclass | null {
    if (!isJsonObject(value)) {
        return null;
    }
    const rawFields = value.fields;
    const fields = Array.isArray(rawFields)
        ? rawFields
              .map((entry) => parseSecondaryField(entry))
              .filter((entry): entry is SecondaryStateField => entry !== null)
        : [];
    return {
        id: readString(value, "id", createId("secondary-class")),
        name: readString(value, "name", "NestedRecord"),
        description: readString(value, "description"),
        linkedPrimaryFieldId: readString(value, "linkedPrimaryFieldId"),
        fields,
    };
}

function parseStateModel(value: JsonValue): StateModel {
    if (!isJsonObject(value)) {
        return createDefaultStateModel();
    }
    const rawPrimaryFields = value.primaryFields;
    const rawSecondaryClasses = value.secondaryClasses;
    const primaryFields = Array.isArray(rawPrimaryFields)
        ? rawPrimaryFields
              .map((entry) => parsePrimaryField(entry))
              .filter((entry): entry is StateField => entry !== null)
        : createDefaultStateModel().primaryFields;
    const secondaryClasses = Array.isArray(rawSecondaryClasses)
        ? rawSecondaryClasses
              .map((entry) => parseSecondaryClass(entry))
              .filter((entry): entry is SecondaryDataclass => entry !== null)
        : [];
    return {
        primaryName: readString(value, "primaryName", "AppState"),
        primaryFields:
            primaryFields.length > 0
                ? primaryFields
                : createDefaultStateModel().primaryFields,
        secondaryClasses,
    };
}

function parseProject(value: JsonValue): Project | null {
    if (!isJsonObject(value)) {
        return null;
    }
    const rawPages = value.pages;
    const rawRoutes = value.routes;
    const pages = Array.isArray(rawPages)
        ? rawPages
              .map((entry) => parsePage(entry))
              .filter((entry): entry is PageNode => entry !== null)
        : [];
    const routes = Array.isArray(rawRoutes)
        ? rawRoutes
              .map((entry) => parseRoute(entry))
              .filter((entry): entry is RouteDefinition => entry !== null)
        : [];
    return {
        id: readString(value, "id", createId("project")),
        name: readString(value, "name", "Imported Project"),
        description: readString(value, "description"),
        lastModified: readString(value, "lastModified", nowIsoString()),
        pages,
        routes,
        stateModel: parseStateModel(value.stateModel ?? null),
    };
}

export function parseProjectCollection(value: JsonValue): Project[] | null {
    if (!Array.isArray(value)) {
        return null;
    }
    const projects = value
        .map((entry) => parseProject(entry))
        .filter((entry): entry is Project => entry !== null);
    return projects.length > 0 ? projects : [];
}

export function getInputComponents(page: PageNode): Array<
    TextBoxComponent | TextAreaComponent | CheckBoxComponent | SelectBoxComponent
> {
    return page.components.filter(
        (
            component,
        ): component is
            | TextBoxComponent
            | TextAreaComponent
            | CheckBoxComponent
            | SelectBoxComponent =>
            component.type === "TextBox" ||
            component.type === "TextArea" ||
            component.type === "CheckBox" ||
            component.type === "SelectBox",
    );
}

export function getAnnotationCounts(project: Project): {
    ifCount: number;
    forCount: number;
    stateChangeCount: number;
} {
    const pageAnnotations = project.pages.flatMap((page) => page.annotations);
    const routeAnnotations = project.routes.flatMap((route) => route.annotations);
    const allAnnotations = [...pageAnnotations, ...routeAnnotations];
    return {
        ifCount: allAnnotations.filter((item) => item.type === "if").length,
        forCount: allAnnotations.filter((item) => item.type === "for").length,
        stateChangeCount: allAnnotations.filter(
            (item) => item.type === "state-change",
        ).length,
    };
}
