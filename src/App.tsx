import type { CSSProperties, JSX } from "react";
import { useEffect, useRef, useState } from "react";
import "./App.css";
import { buildPythonStarter } from "./codegen";
import { createDemoProjects } from "./demoProjects";
import {
    exportProjectDocx,
    exportProjectJson,
    exportPythonStarter,
    parseImportedProjects,
} from "./exporters";
import type {
    Annotation,
    AnnotationType,
    ComponentType,
    PageNode,
    PlannerRoute,
    Project,
    ProjectTab,
    RouteDefinition,
    SecondaryDataclass,
    StateField,
    StyleSettings,
    UIComponent,
} from "./projectModel";
import {
    ALIGN_OPTIONS,
    ANNOTATION_TYPES,
    COMPONENT_TYPES,
    FLEX_DIRECTIONS,
    FONT_OPTIONS,
    JUSTIFY_OPTIONS,
    PAGE_CARD_HEIGHT,
    PAGE_CARD_WIDTH,
    PRIMARY_TYPE_OPTIONS,
    PROJECT_TABS,
    STORAGE_KEY,
    createAnnotation,
    createComponent,
    createEmptyProject,
    createPage,
    createRoute,
    createSecondaryDataclass,
    createSecondaryStateField,
    createStateField,
    formatLastModified,
    getAnnotationCounts,
    getDashboardHash,
    getProjectHash,
    parsePlannerRoute,
    pluralize,
    toSnakeCase,
    touchProject,
} from "./projectModel";

interface StatusMessage {
    tone: "success" | "info" | "error";
    text: string;
}

interface PageDragState {
    pageId: string;
    offsetX: number;
    offsetY: number;
}

interface ConnectionDraft {
    sourcePageId: string;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
}

interface AnnotationDraft {
    targetType: "page" | "route";
    targetId: string;
    type: AnnotationType;
    explanation: string;
    relatedStateFieldId: string;
    relatedComponentId: string;
}

interface RouteBuilderDraft {
    sourcePageId: string;
    targetPageId: string;
    label: string;
}

function loadProjectsFromBrowser(): Project[] {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) {
        return [];
    }
    return parseImportedProjects(saved) ?? [];
}

export function App() {
    const [projects, setProjects] = useState<Project[]>(loadProjectsFromBrowser);
    const [route, setRoute] = useState<PlannerRoute>(() =>
        parsePlannerRoute(window.location.hash),
    );
    const [selectedPageId, setSelectedPageId] = useState("");
    const [selectedRouteId, setSelectedRouteId] = useState("");
    const [selectedComponentId, setSelectedComponentId] = useState("");
    const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(
        null,
    );
    const [pageDrag, setPageDrag] = useState<PageDragState | null>(null);
    const [connectionDraft, setConnectionDraft] =
        useState<ConnectionDraft | null>(null);
    const [manualRouteDraft, setManualRouteDraft] = useState<RouteBuilderDraft>({
        sourcePageId: "",
        targetPageId: "",
        label: "",
    });
    const [annotationDraft, setAnnotationDraft] = useState<AnnotationDraft>({
        targetType: "page",
        targetId: "",
        type: "state-change",
        explanation: "",
        relatedStateFieldId: "",
        relatedComponentId: "",
    });
    const graphRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (window.location.hash.length === 0) {
            window.location.hash = getDashboardHash();
        }
        const handleHashChange = () => {
            setRoute(parsePlannerRoute(window.location.hash));
        };
        handleHashChange();
        window.addEventListener("hashchange", handleHashChange);
        return () => window.removeEventListener("hashchange", handleHashChange);
    }, []);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    }, [projects]);

    useEffect(() => {
        if (statusMessage === null) {
            return;
        }
        const timeout = window.setTimeout(() => setStatusMessage(null), 3200);
        return () => window.clearTimeout(timeout);
    }, [statusMessage]);

    const activeProject =
        route.screen === "project"
            ? projects.find((project) => project.id === route.projectId)
            : undefined;
    const selectedPage =
        activeProject?.pages.find((page) => page.id === selectedPageId) ??
        activeProject?.pages[0];
    const selectedRoute =
        activeProject?.routes.find((entry) => entry.id === selectedRouteId) ??
        activeProject?.routes[0];
    const selectedComponent =
        selectedPage?.components.find(
            (component) => component.id === selectedComponentId,
        ) ?? selectedPage?.components[0];
    const sortedProjects = [...projects].sort((left, right) =>
        right.lastModified.localeCompare(left.lastModified),
    );
    const annotationCounts =
        activeProject !== undefined
            ? getAnnotationCounts(activeProject)
            : { ifCount: 0, forCount: 0, stateChangeCount: 0 };
    const pythonPreview =
        activeProject !== undefined ? buildPythonStarter(activeProject) : "";

    useEffect(() => {
        if (route.screen === "project" && activeProject === undefined) {
            window.location.hash = getDashboardHash();
        }
    }, [activeProject, route.screen]);

    useEffect(() => {
        if (activeProject === undefined) {
            setSelectedPageId("");
            setSelectedRouteId("");
            setSelectedComponentId("");
            return;
        }

        if (
            activeProject.pages.length > 0 &&
            !activeProject.pages.some((page) => page.id === selectedPageId)
        ) {
            setSelectedPageId(activeProject.pages[0].id);
        }
        if (
            activeProject.routes.length > 0 &&
            !activeProject.routes.some((entry) => entry.id === selectedRouteId)
        ) {
            setSelectedRouteId(activeProject.routes[0].id);
        }
        if (activeProject.pages.length === 0) {
            setSelectedPageId("");
            setSelectedComponentId("");
        }
        if (activeProject.routes.length === 0) {
            setSelectedRouteId("");
        }
    }, [activeProject, selectedPageId, selectedRouteId]);

    useEffect(() => {
        if (selectedPage === undefined) {
            setSelectedComponentId("");
            return;
        }
        if (
            selectedPage.components.length > 0 &&
            !selectedPage.components.some(
                (component) => component.id === selectedComponentId,
            )
        ) {
            setSelectedComponentId(selectedPage.components[0].id);
        }
        if (selectedPage.components.length === 0) {
            setSelectedComponentId("");
        }
    }, [selectedComponentId, selectedPage]);

    useEffect(() => {
        if (activeProject === undefined) {
            setManualRouteDraft({
                sourcePageId: "",
                targetPageId: "",
                label: "",
            });
            setAnnotationDraft({
                targetType: "page",
                targetId: "",
                type: "state-change",
                explanation: "",
                relatedStateFieldId: "",
                relatedComponentId: "",
            });
            return;
        }

        const defaultSource = activeProject.pages[0]?.id ?? "";
        const defaultTarget = activeProject.pages[1]?.id ?? defaultSource;
        if (
            !activeProject.pages.some(
                (page) => page.id === manualRouteDraft.sourcePageId,
            ) ||
            !activeProject.pages.some(
                (page) => page.id === manualRouteDraft.targetPageId,
            )
        ) {
            setManualRouteDraft({
                sourcePageId: defaultSource,
                targetPageId: defaultTarget,
                label:
                    activeProject.pages.length > 1
                        ? `go_to_${toSnakeCase(activeProject.pages[1].name)}`
                        : "",
            });
        }

        const availableTargets =
            annotationDraft.targetType === "page"
                ? activeProject.pages.map((page) => page.id)
                : activeProject.routes.map((entry) => entry.id);
        const nextTargetId = availableTargets[0] ?? "";
        if (!availableTargets.includes(annotationDraft.targetId)) {
            setAnnotationDraft((currentDraft) => ({
                ...currentDraft,
                targetId: nextTargetId,
                relatedComponentId: "",
                relatedStateFieldId:
                    activeProject.stateModel.primaryFields[0]?.id ?? "",
            }));
        }
    }, [activeProject, annotationDraft.targetId, annotationDraft.targetType, manualRouteDraft.sourcePageId, manualRouteDraft.targetPageId]);

    useEffect(() => {
        if (
            activeProject === undefined ||
            graphRef.current === null ||
            (pageDrag === null && connectionDraft === null)
        ) {
            return;
        }

        const handleMouseMove = (event: MouseEvent) => {
            const bounds = graphRef.current?.getBoundingClientRect();
            if (bounds === undefined) {
                return;
            }
            const pointerX = event.clientX - bounds.left;
            const pointerY = event.clientY - bounds.top;

            if (pageDrag !== null) {
                setProjects((currentProjects) =>
                    currentProjects.map((project) => {
                        if (project.id !== activeProject.id) {
                            return project;
                        }
                        return touchProject({
                            ...project,
                            pages: project.pages.map((page) =>
                                page.id === pageDrag.pageId
                                    ? {
                                          ...page,
                                          x: clamp(
                                              pointerX - pageDrag.offsetX,
                                              24,
                                              Math.max(
                                                  24,
                                                  bounds.width -
                                                      PAGE_CARD_WIDTH -
                                                      24,
                                              ),
                                          ),
                                          y: clamp(
                                              pointerY - pageDrag.offsetY,
                                              24,
                                              Math.max(
                                                  24,
                                                  bounds.height -
                                                      PAGE_CARD_HEIGHT -
                                                      24,
                                              ),
                                          ),
                                      }
                                    : page,
                            ),
                        });
                    }),
                );
            }

            if (connectionDraft !== null) {
                setConnectionDraft((currentDraft) =>
                    currentDraft === null
                        ? null
                        : {
                              ...currentDraft,
                              currentX: pointerX,
                              currentY: pointerY,
                          },
                );
            }
        };

        const handleMouseUp = () => {
            setPageDrag(null);
            setConnectionDraft(null);
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [activeProject, connectionDraft, pageDrag]);

    function setStatus(text: string, tone: StatusMessage["tone"]): void {
        setStatusMessage({ text, tone });
    }

    function saveProjectsToBrowser(): void {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
        setStatus("Projects saved to localStorage.", "success");
    }

    function reloadProjectsFromBrowser(): void {
        const loadedProjects = loadProjectsFromBrowser();
        setProjects(loadedProjects);
        setStatus("Projects reloaded from localStorage.", "success");
    }

    function mergeProjects(incomingProjects: Project[]): void {
        setProjects((currentProjects) => {
            const survivors = currentProjects.filter(
                (project) =>
                    !incomingProjects.some(
                        (incomingProject) => incomingProject.id === project.id,
                    ),
            );
            return [...incomingProjects, ...survivors];
        });
    }

    function updateProject(
        projectId: string,
        updater: (project: Project) => Project,
    ): void {
        setProjects((currentProjects) => {
            const targetProject = currentProjects.find(
                (project) => project.id === projectId,
            );
            if (targetProject === undefined) {
                return currentProjects;
            }
            const updatedProject = touchProject(updater(targetProject));
            const remainingProjects = currentProjects.filter(
                (project) => project.id !== projectId,
            );
            return [updatedProject, ...remainingProjects];
        });
    }

    function handleCreateProject(): void {
        const nextProject = createEmptyProject(
            `Untitled Planner ${projects.length + 1}`,
        );
        setProjects((currentProjects) => [nextProject, ...currentProjects]);
        setSelectedPageId("");
        setSelectedRouteId("");
        window.location.hash = getProjectHash(nextProject.id, "overview");
        setStatus("Created a new planning project.", "success");
    }

    function handleLoadDemoProject(projectId: string): void {
        const demoProject = createDemoProjects().find(
            (project) => project.id === projectId,
        );
        if (demoProject === undefined) {
            setStatus("Demo project could not be loaded.", "error");
            return;
        }
        mergeProjects([demoProject]);
        window.location.hash = getProjectHash(demoProject.id, "overview");
        setStatus(`Loaded demo project "${demoProject.name}".`, "success");
    }

    function handleDeleteProject(projectId: string): void {
        if (!window.confirm("Delete this saved planning project?")) {
            return;
        }
        setProjects((currentProjects) =>
            currentProjects.filter((project) => project.id !== projectId),
        );
        if (route.projectId === projectId) {
            window.location.hash = getDashboardHash();
        }
        setStatus("Project deleted.", "info");
    }

    function openProject(projectId: string, tab: ProjectTab = "overview"): void {
        window.location.hash = getProjectHash(projectId, tab);
    }

    function handleProjectMetadataChange(
        field: "name" | "description",
        value: string,
    ): void {
        if (activeProject === undefined) {
            return;
        }
        updateProject(activeProject.id, (project) => ({
            ...project,
            [field]: value,
        }));
    }

    function handleAddPage(): void {
        if (activeProject === undefined) {
            return;
        }
        const pageIndex = activeProject.pages.length;
        const page = createPage(
            `Page ${pageIndex + 1}`,
            50 + (pageIndex % 3) * 270,
            40 + Math.floor(pageIndex / 3) * 210,
        );
        updateProject(activeProject.id, (project) => ({
            ...project,
            pages: [...project.pages, page],
        }));
        setSelectedPageId(page.id);
        openProject(activeProject.id, "graph");
    }

    function updatePage(
        projectId: string,
        pageId: string,
        updater: (page: PageNode) => PageNode,
    ): void {
        updateProject(projectId, (project) => ({
            ...project,
            pages: project.pages.map((page) =>
                page.id === pageId ? updater(page) : page,
            ),
        }));
    }

    function handleDeletePage(pageId: string): void {
        if (activeProject === undefined) {
            return;
        }
        const routeIdsToRemove = activeProject.routes
            .filter(
                (entry) =>
                    entry.sourcePageId === pageId || entry.targetPageId === pageId,
            )
            .map((entry) => entry.id);
        updateProject(activeProject.id, (project) => ({
            ...project,
            pages: project.pages
                .filter((page) => page.id !== pageId)
                .map((page) => ({
                    ...page,
                    components: page.components.map((component) =>
                        component.type === "Button" &&
                        routeIdsToRemove.includes(component.routeId)
                            ? { ...component, routeId: "" }
                            : component,
                    ),
                })),
            routes: project.routes.filter(
                (entry) =>
                    entry.sourcePageId !== pageId && entry.targetPageId !== pageId,
            ),
            stateModel: {
                ...project.stateModel,
                primaryFields: project.stateModel.primaryFields.map((field) => ({
                    ...field,
                    updatedByPageIds: field.updatedByPageIds.filter(
                        (candidate) => candidate !== pageId,
                    ),
                    updatedByRouteIds: field.updatedByRouteIds.filter(
                        (candidate) => !routeIdsToRemove.includes(candidate),
                    ),
                })),
            },
        }));
        setSelectedPageId("");
        setSelectedRouteId("");
    }

    function updateRoute(
        projectId: string,
        routeId: string,
        updater: (routeEntry: RouteDefinition) => RouteDefinition,
    ): void {
        updateProject(projectId, (project) => ({
            ...project,
            routes: project.routes.map((entry) =>
                entry.id === routeId ? updater(entry) : entry,
            ),
        }));
    }

    function handleCreateRoute(
        sourcePageId: string,
        targetPageId: string,
        label: string,
    ): void {
        if (activeProject === undefined) {
            return;
        }
        if (
            sourcePageId.length === 0 ||
            targetPageId.length === 0 ||
            sourcePageId === targetPageId
        ) {
            setStatus("Choose two different pages before creating a route.", "error");
            return;
        }
        const targetPage = activeProject.pages.find(
            (page) => page.id === targetPageId,
        );
        const route = createRoute(
            sourcePageId,
            targetPageId,
            label.length > 0
                ? label
                : `go_to_${toSnakeCase(targetPage?.name ?? "page")}`,
        );
        updateProject(activeProject.id, (project) => ({
            ...project,
            routes: [...project.routes, route],
        }));
        setSelectedRouteId(route.id);
        setManualRouteDraft((currentDraft) => ({
            ...currentDraft,
            label: "",
        }));
    }

    function handleDeleteRoute(routeId: string): void {
        if (activeProject === undefined) {
            return;
        }
        updateProject(activeProject.id, (project) => ({
            ...project,
            routes: project.routes.filter((entry) => entry.id !== routeId),
            pages: project.pages.map((page) => ({
                ...page,
                components: page.components.map((component) =>
                    component.type === "Button" && component.routeId === routeId
                        ? { ...component, routeId: "" }
                        : component,
                ),
            })),
            stateModel: {
                ...project.stateModel,
                primaryFields: project.stateModel.primaryFields.map((field) => ({
                    ...field,
                    updatedByRouteIds: field.updatedByRouteIds.filter(
                        (candidate) => candidate !== routeId,
                    ),
                })),
            },
        }));
        setSelectedRouteId("");
    }

    function handleStartPageDrag(
        pageId: string,
        event: React.MouseEvent<HTMLDivElement>,
    ): void {
        if (graphRef.current === null) {
            return;
        }
        const bounds = graphRef.current.getBoundingClientRect();
        const page = activeProject?.pages.find((entry) => entry.id === pageId);
        if (page === undefined) {
            return;
        }
        setPageDrag({
            pageId,
            offsetX: event.clientX - bounds.left - page.x,
            offsetY: event.clientY - bounds.top - page.y,
        });
        setSelectedPageId(pageId);
    }

    function handleStartConnection(
        pageId: string,
        event: React.MouseEvent<HTMLButtonElement>,
    ): void {
        event.stopPropagation();
        if (graphRef.current === null) {
            return;
        }
        const page = activeProject?.pages.find((entry) => entry.id === pageId);
        if (page === undefined) {
            return;
        }
        const bounds = graphRef.current.getBoundingClientRect();
        const startX = page.x + PAGE_CARD_WIDTH;
        const startY = page.y + PAGE_CARD_HEIGHT / 2;
        setConnectionDraft({
            sourcePageId: pageId,
            startX,
            startY,
            currentX: event.clientX - bounds.left,
            currentY: event.clientY - bounds.top,
        });
    }

    function handleCompleteConnection(targetPageId: string): void {
        if (connectionDraft === null) {
            return;
        }
        if (connectionDraft.sourcePageId === targetPageId) {
            setConnectionDraft(null);
            return;
        }
        const targetPage = activeProject?.pages.find(
            (page) => page.id === targetPageId,
        );
        handleCreateRoute(
            connectionDraft.sourcePageId,
            targetPageId,
            `go_to_${toSnakeCase(targetPage?.name ?? "page")}`,
        );
        setConnectionDraft(null);
    }

    function handleAddComponent(type: ComponentType): void {
        if (activeProject === undefined || selectedPage === undefined) {
            return;
        }
        const component = createComponent(type);
        const firstOutgoingRoute = activeProject.routes.find(
            (entry) => entry.sourcePageId === selectedPage.id,
        );
        const normalizedComponent =
            component.type === "Button"
                ? { ...component, routeId: firstOutgoingRoute?.id ?? "" }
                : component;
        updatePage(activeProject.id, selectedPage.id, (page) => ({
            ...page,
            components: [...page.components, normalizedComponent],
        }));
        setSelectedComponentId(component.id);
    }

    function updateComponent(
        pageId: string,
        componentId: string,
        updater: (component: UIComponent) => UIComponent,
    ): void {
        if (activeProject === undefined) {
            return;
        }
        updatePage(activeProject.id, pageId, (page) => ({
            ...page,
            components: page.components.map((component) =>
                component.id === componentId ? updater(component) : component,
            ),
        }));
    }

    function handleDeleteComponent(componentId: string): void {
        if (activeProject === undefined || selectedPage === undefined) {
            return;
        }
        updatePage(activeProject.id, selectedPage.id, (page) => ({
            ...page,
            components: page.components.filter(
                (component) => component.id !== componentId,
            ),
        }));
        setSelectedComponentId("");
    }

    function moveComponent(componentId: string, direction: -1 | 1): void {
        if (activeProject === undefined || selectedPage === undefined) {
            return;
        }
        updatePage(activeProject.id, selectedPage.id, (page) => ({
            ...page,
            components: moveArrayItem(page.components, componentId, direction),
        }));
    }

    function updatePrimaryField(
        fieldId: string,
        updater: (field: StateField) => StateField,
    ): void {
        if (activeProject === undefined) {
            return;
        }
        updateProject(activeProject.id, (project) => ({
            ...project,
            stateModel: {
                ...project.stateModel,
                primaryFields: project.stateModel.primaryFields.map((field) =>
                    field.id === fieldId ? updater(field) : field,
                ),
            },
        }));
    }

    function handleDeletePrimaryField(fieldId: string): void {
        if (activeProject === undefined) {
            return;
        }
        if (
            activeProject.stateModel.secondaryClasses.some(
                (secondaryClass) =>
                    secondaryClass.linkedPrimaryFieldId === fieldId,
            )
        ) {
            setStatus(
                "Delete the linked secondary dataclass before removing that list field.",
                "error",
            );
            return;
        }
        updateProject(activeProject.id, (project) => ({
            ...project,
            stateModel: {
                ...project.stateModel,
                primaryFields: project.stateModel.primaryFields.filter(
                    (field) => field.id !== fieldId,
                ),
            },
        }));
    }

    function handleAddPrimaryField(): void {
        if (activeProject === undefined) {
            return;
        }
        updateProject(activeProject.id, (project) => ({
            ...project,
            stateModel: {
                ...project.stateModel,
                primaryFields: [
                    ...project.stateModel.primaryFields,
                    createStateField(),
                ],
            },
        }));
    }

    function toggleFieldLink(
        fieldId: string,
        targetId: string,
        targetType: "page" | "route",
    ): void {
        updatePrimaryField(fieldId, (field) => ({
            ...field,
            updatedByPageIds:
                targetType === "page"
                    ? toggleItem(field.updatedByPageIds, targetId)
                    : field.updatedByPageIds,
            updatedByRouteIds:
                targetType === "route"
                    ? toggleItem(field.updatedByRouteIds, targetId)
                    : field.updatedByRouteIds,
        }));
    }

    function handleAddSecondaryClass(): void {
        if (activeProject === undefined) {
            return;
        }
        const { secondaryClass, linkedPrimaryField } = createSecondaryDataclass(
            `NestedRecord${activeProject.stateModel.secondaryClasses.length + 1}`,
        );
        updateProject(activeProject.id, (project) => ({
            ...project,
            stateModel: {
                ...project.stateModel,
                primaryFields: [
                    ...project.stateModel.primaryFields,
                    linkedPrimaryField,
                ],
                secondaryClasses: [
                    ...project.stateModel.secondaryClasses,
                    secondaryClass,
                ],
            },
        }));
    }

    function updateSecondaryClass(
        classId: string,
        updater: (secondaryClass: SecondaryDataclass) => SecondaryDataclass,
    ): void {
        if (activeProject === undefined) {
            return;
        }
        updateProject(activeProject.id, (project) => {
            const nextSecondaryClasses = project.stateModel.secondaryClasses.map(
                (secondaryClass) =>
                    secondaryClass.id === classId
                        ? updater(secondaryClass)
                        : secondaryClass,
            );
            const changedClass = nextSecondaryClasses.find(
                (secondaryClass) => secondaryClass.id === classId,
            );
            if (changedClass === undefined) {
                return project;
            }
            return {
                ...project,
                stateModel: {
                    ...project.stateModel,
                    secondaryClasses: nextSecondaryClasses,
                    primaryFields: project.stateModel.primaryFields.map((field) =>
                        field.id === changedClass.linkedPrimaryFieldId
                            ? {
                                  ...field,
                                  name: pluralize(toSnakeCase(changedClass.name)),
                                  type: `list[${changedClass.name}]`,
                                  description: `Collection of ${changedClass.name} records stored in the main state.`,
                              }
                            : field,
                    ),
                },
            };
        });
    }

    function handleDeleteSecondaryClass(classId: string): void {
        if (activeProject === undefined) {
            return;
        }
        const secondaryClass = activeProject.stateModel.secondaryClasses.find(
            (entry) => entry.id === classId,
        );
        if (secondaryClass === undefined) {
            return;
        }
        updateProject(activeProject.id, (project) => ({
            ...project,
            stateModel: {
                ...project.stateModel,
                secondaryClasses: project.stateModel.secondaryClasses.filter(
                    (entry) => entry.id !== classId,
                ),
                primaryFields: project.stateModel.primaryFields.filter(
                    (field) => field.id !== secondaryClass.linkedPrimaryFieldId,
                ),
            },
        }));
    }

    function handleAddSecondaryField(classId: string): void {
        updateSecondaryClass(classId, (secondaryClass) => ({
            ...secondaryClass,
            fields: [...secondaryClass.fields, createSecondaryStateField()],
        }));
    }

    function handleDeleteSecondaryField(
        classId: string,
        fieldId: string,
    ): void {
        updateSecondaryClass(classId, (secondaryClass) => ({
            ...secondaryClass,
            fields: secondaryClass.fields.filter((field) => field.id !== fieldId),
        }));
    }

    function handleAddAnnotation(): void {
        if (activeProject === undefined) {
            return;
        }
        if (annotationDraft.targetId.length === 0) {
            setStatus("Choose a page or route before adding an annotation.", "error");
            return;
        }
        if (annotationDraft.explanation.trim().length === 0) {
            setStatus("Explain what the annotation represents.", "error");
            return;
        }
        const annotation = createAnnotation(
            annotationDraft.type,
            annotationDraft.explanation.trim(),
        );
        annotation.relatedStateFieldId = annotationDraft.relatedStateFieldId;
        annotation.relatedComponentId = annotationDraft.relatedComponentId;
        if (annotationDraft.targetType === "page") {
            updatePage(activeProject.id, annotationDraft.targetId, (page) => ({
                ...page,
                annotations: [...page.annotations, annotation],
            }));
        } else {
            updateRoute(activeProject.id, annotationDraft.targetId, (entry) => ({
                ...entry,
                annotations: [...entry.annotations, annotation],
            }));
        }
        setAnnotationDraft((currentDraft) => ({
            ...currentDraft,
            explanation: "",
            relatedComponentId: "",
        }));
    }

    function handleDeleteAnnotation(
        targetType: "page" | "route",
        targetId: string,
        annotationId: string,
    ): void {
        if (activeProject === undefined) {
            return;
        }
        if (targetType === "page") {
            updatePage(activeProject.id, targetId, (page) => ({
                ...page,
                annotations: page.annotations.filter(
                    (annotation) => annotation.id !== annotationId,
                ),
            }));
            return;
        }
        updateRoute(activeProject.id, targetId, (entry) => ({
            ...entry,
            annotations: entry.annotations.filter(
                (annotation) => annotation.id !== annotationId,
            ),
        }));
    }

    async function handleImportProject(
        event: React.ChangeEvent<HTMLInputElement>,
    ): Promise<void> {
        const file = event.currentTarget.files?.[0];
        if (file === undefined) {
            return;
        }
        const importedProjects = parseImportedProjects(await file.text());
        if (importedProjects === null) {
            setStatus("That file does not match the expected project format.", "error");
            event.currentTarget.value = "";
            return;
        }
        mergeProjects(importedProjects);
        if (importedProjects.length > 0) {
            openProject(importedProjects[0].id, "overview");
        }
        setStatus("Project import completed.", "success");
        event.currentTarget.value = "";
    }

    async function handleExportDocx(): Promise<void> {
        if (activeProject === undefined) {
            return;
        }
        try {
            await exportProjectDocx(activeProject);
            setStatus("DOCX export complete.", "success");
        } catch (error) {
            setStatus(
                error instanceof Error ? error.message : "DOCX export failed.",
                "error",
            );
        }
    }

    function renderDashboard(): JSX.Element {
        return (
            <main className="app-shell">
                <section className="hero-panel">
                    <div>
                        <p className="eyebrow">Website Planner</p>
                        <h1>Plan pages, routes, state, and exports in one workspace.</h1>
                        <p className="hero-copy">
                            This planner covers the dashboard, page graph, UI
                            components, state dataclasses, logic annotations, and
                            deliverable exports required for the final project.
                        </p>
                    </div>
                    <div className="hero-actions">
                        <button
                            type="button"
                            className="button button--primary"
                            onClick={handleCreateProject}
                        >
                            New Project
                        </button>
                        <button
                            type="button"
                            className="button"
                            onClick={saveProjectsToBrowser}
                        >
                            Save to Browser
                        </button>
                        <button
                            type="button"
                            className="button"
                            onClick={reloadProjectsFromBrowser}
                        >
                            Reload Saved
                        </button>
                    </div>
                </section>

                {statusMessage !== null ? (
                    <StatusBanner message={statusMessage} />
                ) : null}

                <section className="card-panel">
                    <div className="section-heading">
                        <div>
                            <p className="eyebrow">Demo Projects</p>
                            <h2>Load examples to inspect completed user stories.</h2>
                        </div>
                        <label className="file-input">
                            <span>Import JSON</span>
                            <input
                                type="file"
                                accept=".json,application/json"
                                onChange={(event) => {
                                    void handleImportProject(event);
                                }}
                            />
                        </label>
                    </div>
                    <div className="demo-grid">
                        <button
                            type="button"
                            className="demo-card"
                            onClick={() =>
                                handleLoadDemoProject("demo-campus-club")
                            }
                        >
                            <span className="demo-card__title">
                                Load Campus Club Fair
                            </span>
                            <span className="demo-card__copy">
                                Multi-page club directory with if, for, state
                                updates, and nested dataclasses.
                            </span>
                        </button>
                        <button
                            type="button"
                            className="demo-card"
                            onClick={() =>
                                handleLoadDemoProject("demo-study-tracker")
                            }
                        >
                            <span className="demo-card__title">
                                Load Study Tracker
                            </span>
                            <span className="demo-card__copy">
                                Study logging workflow with review routes,
                                reusable state, and multiple input types.
                            </span>
                        </button>
                    </div>
                </section>

                <section className="card-panel">
                    <div className="section-heading">
                        <div>
                            <p className="eyebrow">Dashboard</p>
                            <h2>Saved planning projects</h2>
                        </div>
                        <p className="muted-copy">
                            {sortedProjects.length} project
                            {sortedProjects.length === 1 ? "" : "s"} available
                        </p>
                    </div>
                    {sortedProjects.length === 0 ? (
                        <EmptyState
                            title="No projects saved yet"
                            copy="Create a project or load one of the demo planners to start meeting the final project criteria."
                        />
                    ) : (
                        <div className="project-grid">
                            {sortedProjects.map((project) => (
                                <article className="project-card" key={project.id}>
                                    <div className="project-card__top">
                                        <div>
                                            <h3>{project.name}</h3>
                                            <p>{project.description}</p>
                                        </div>
                                        <span className="pill">
                                            {formatLastModified(project.lastModified)}
                                        </span>
                                    </div>
                                    <div className="project-card__stats">
                                        <StatPill
                                            label="Pages"
                                            value={String(project.pages.length)}
                                        />
                                        <StatPill
                                            label="Routes"
                                            value={String(project.routes.length)}
                                        />
                                        <StatPill
                                            label="State Fields"
                                            value={String(
                                                project.stateModel.primaryFields.length,
                                            )}
                                        />
                                    </div>
                                    <div className="project-card__actions">
                                        <button
                                            type="button"
                                            className="button button--primary"
                                            onClick={() => openProject(project.id)}
                                        >
                                            Open Project
                                        </button>
                                        <button
                                            type="button"
                                            className="button"
                                            onClick={() => exportProjectJson(project)}
                                        >
                                            Export JSON
                                        </button>
                                        <button
                                            type="button"
                                            className="button button--danger"
                                            onClick={() =>
                                                handleDeleteProject(project.id)
                                            }
                                        >
                                            Delete Project
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        );
    }

    if (activeProject === undefined) {
        return renderDashboard();
    }

    const annotationComponentOptions = getAnnotationComponentOptions(
        activeProject,
        annotationDraft.targetType,
        annotationDraft.targetId,
    );

    return (
        <main className="app-shell">
            <header className="workspace-header">
                <button
                    type="button"
                    className="button"
                    onClick={() => {
                        window.location.hash = getDashboardHash();
                    }}
                >
                    Back to Dashboard
                </button>
                <div className="workspace-header__title">
                    <p className="eyebrow">Project Workspace</p>
                    <h1>{activeProject.name}</h1>
                    <p>{activeProject.description}</p>
                </div>
                <div className="workspace-header__actions">
                    <button
                        type="button"
                        className="button"
                        onClick={saveProjectsToBrowser}
                    >
                        Save
                    </button>
                    <button
                        type="button"
                        className="button"
                        onClick={() => exportProjectJson(activeProject)}
                    >
                        Export JSON
                    </button>
                    <button
                        type="button"
                        className="button"
                        onClick={() => exportPythonStarter(activeProject)}
                    >
                        Export Python
                    </button>
                    <button
                        type="button"
                        className="button button--primary"
                        onClick={() => {
                            void handleExportDocx();
                        }}
                    >
                        Export DOCX
                    </button>
                </div>
            </header>

            {statusMessage !== null ? <StatusBanner message={statusMessage} /> : null}

            <section className="workspace-summary">
                <StatPill label="Pages" value={String(activeProject.pages.length)} />
                <StatPill
                    label="Routes"
                    value={String(activeProject.routes.length)}
                />
                <StatPill
                    label="If Markers"
                    value={`${annotationCounts.ifCount}/3`}
                />
                <StatPill
                    label="For Markers"
                    value={`${annotationCounts.forCount}/1`}
                />
                <StatPill
                    label="Secondary Classes"
                    value={String(activeProject.stateModel.secondaryClasses.length)}
                />
            </section>

            <nav className="tab-row" aria-label="Project sections">
                {PROJECT_TABS.map((tab) => (
                    <button
                        key={tab}
                        type="button"
                        className={`tab-row__button ${
                            route.tab === tab ? "tab-row__button--active" : ""
                        }`}
                        onClick={() => openProject(activeProject.id, tab)}
                    >
                        {tab === "overview"
                            ? "Project Overview"
                            : tab === "graph"
                              ? "Page Graph"
                              : tab === "pages"
                                ? "Page Editor"
                                : tab === "state"
                                  ? "State Model"
                                  : "Logic & Exports"}
                    </button>
                ))}
            </nav>

            {route.tab === "overview" ? (
                <section className="workspace-grid workspace-grid--overview">
                    <article className="card-panel">
                        <SectionHeading
                            eyebrow="Metadata"
                            title="Project Overview"
                            copy="Edit the website name and summarize what the application is supposed to do."
                        />
                        <label className="field">
                            <span>Project name</span>
                            <input
                                value={activeProject.name}
                                onChange={(event) =>
                                    handleProjectMetadataChange(
                                        "name",
                                        event.currentTarget.value,
                                    )
                                }
                            />
                        </label>
                        <label className="field">
                            <span>Website purpose</span>
                            <textarea
                                rows={5}
                                value={activeProject.description}
                                onChange={(event) =>
                                    handleProjectMetadataChange(
                                        "description",
                                        event.currentTarget.value,
                                    )
                                }
                            />
                        </label>
                    </article>

                    <article className="card-panel">
                        <SectionHeading
                            eyebrow="Structure"
                            title="Pages and Routes"
                            copy="Review the current page inventory and the directional routes that connect them."
                        />
                        <div className="overview-list">
                            <div>
                                <h3>Pages</h3>
                                {activeProject.pages.length === 0 ? (
                                    <p className="muted-copy">
                                        No pages added yet.
                                    </p>
                                ) : (
                                    activeProject.pages.map((page) => (
                                        <button
                                            type="button"
                                            key={page.id}
                                            className="list-card"
                                            onClick={() => {
                                                setSelectedPageId(page.id);
                                                openProject(activeProject.id, "pages");
                                            }}
                                        >
                                            <strong>{page.name}</strong>
                                            <span>{page.purpose}</span>
                                        </button>
                                    ))
                                )}
                            </div>
                            <div>
                                <h3>Routes</h3>
                                {activeProject.routes.length === 0 ? (
                                    <p className="muted-copy">
                                        No routes connected yet.
                                    </p>
                                ) : (
                                    activeProject.routes.map((entry) => {
                                        const sourceName =
                                            activeProject.pages.find(
                                                (page) =>
                                                    page.id === entry.sourcePageId,
                                            )?.name ?? "Unknown";
                                        const targetName =
                                            activeProject.pages.find(
                                                (page) =>
                                                    page.id === entry.targetPageId,
                                            )?.name ?? "Unknown";
                                        return (
                                            <button
                                                type="button"
                                                key={entry.id}
                                                className="list-card"
                                                onClick={() => {
                                                    setSelectedRouteId(entry.id);
                                                    openProject(
                                                        activeProject.id,
                                                        "graph",
                                                    );
                                                }}
                                            >
                                                <strong>{entry.label}</strong>
                                                <span>
                                                    {sourceName} to {targetName}
                                                </span>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </article>
                </section>
            ) : null}

            {route.tab === "graph" ? (
                <section className="workspace-grid workspace-grid--graph">
                    <article className="card-panel graph-stage">
                        <SectionHeading
                            eyebrow="Routing"
                            title="Page Graph"
                            copy="Drag page cards to reposition them. Drag from the connector dot to another node to create a directional route."
                        />
                        <div className="graph-toolbar">
                            <button
                                type="button"
                                className="button button--primary"
                                onClick={handleAddPage}
                            >
                                Add Page Node
                            </button>
                            <label className="field field--inline">
                                <span>Source</span>
                                <select
                                    value={manualRouteDraft.sourcePageId}
                                    onChange={(event) =>
                                        setManualRouteDraft((draft) => ({
                                            ...draft,
                                            sourcePageId:
                                                event.currentTarget.value,
                                        }))
                                    }
                                >
                                    {activeProject.pages.map((page) => (
                                        <option key={page.id} value={page.id}>
                                            {page.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="field field--inline">
                                <span>Target</span>
                                <select
                                    value={manualRouteDraft.targetPageId}
                                    onChange={(event) =>
                                        setManualRouteDraft((draft) => ({
                                            ...draft,
                                            targetPageId:
                                                event.currentTarget.value,
                                        }))
                                    }
                                >
                                    {activeProject.pages.map((page) => (
                                        <option key={page.id} value={page.id}>
                                            {page.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="field field--inline field--grow">
                                <span>Route label</span>
                                <input
                                    value={manualRouteDraft.label}
                                    onChange={(event) =>
                                        setManualRouteDraft((draft) => ({
                                            ...draft,
                                            label: event.currentTarget.value,
                                        }))
                                    }
                                />
                            </label>
                            <button
                                type="button"
                                className="button"
                                onClick={() =>
                                    handleCreateRoute(
                                        manualRouteDraft.sourcePageId,
                                        manualRouteDraft.targetPageId,
                                        manualRouteDraft.label,
                                    )
                                }
                            >
                                Create Route
                            </button>
                        </div>
                        <div className="graph-board" ref={graphRef}>
                            <svg className="graph-board__svg">
                                <defs>
                                    <marker
                                        id="graph-arrow"
                                        markerWidth="12"
                                        markerHeight="12"
                                        refX="10"
                                        refY="6"
                                        orient="auto"
                                    >
                                        <path
                                            d="M 0 0 L 12 6 L 0 12 z"
                                            fill="#81542d"
                                        />
                                    </marker>
                                </defs>
                                {activeProject.routes.map((entry) => {
                                    const source = activeProject.pages.find(
                                        (page) => page.id === entry.sourcePageId,
                                    );
                                    const target = activeProject.pages.find(
                                        (page) => page.id === entry.targetPageId,
                                    );
                                    if (
                                        source === undefined ||
                                        target === undefined
                                    ) {
                                        return null;
                                    }
                                    const startX = source.x + PAGE_CARD_WIDTH;
                                    const startY = source.y + PAGE_CARD_HEIGHT / 2;
                                    const endX = target.x;
                                    const endY = target.y + PAGE_CARD_HEIGHT / 2;
                                    const controlX = (startX + endX) / 2;
                                    return (
                                        <g key={entry.id}>
                                            <path
                                                className={`graph-path ${
                                                    selectedRoute?.id === entry.id
                                                        ? "graph-path--selected"
                                                        : ""
                                                }`}
                                                d={`M ${startX} ${startY} C ${controlX} ${startY}, ${controlX} ${endY}, ${endX} ${endY}`}
                                                markerEnd="url(#graph-arrow)"
                                                onClick={() =>
                                                    setSelectedRouteId(entry.id)
                                                }
                                            />
                                            <text
                                                x={controlX}
                                                y={(startY + endY) / 2 - 12}
                                                className="graph-path__label"
                                                textAnchor="middle"
                                            >
                                                {entry.label}
                                            </text>
                                        </g>
                                    );
                                })}
                                {connectionDraft !== null ? (
                                    <path
                                        className="graph-path graph-path--draft"
                                        d={`M ${connectionDraft.startX} ${connectionDraft.startY} C ${
                                            (connectionDraft.startX +
                                                connectionDraft.currentX) /
                                            2
                                        } ${connectionDraft.startY}, ${
                                            (connectionDraft.startX +
                                                connectionDraft.currentX) /
                                            2
                                        } ${connectionDraft.currentY}, ${
                                            connectionDraft.currentX
                                        } ${connectionDraft.currentY}`}
                                    />
                                ) : null}
                            </svg>
                            {activeProject.pages.length === 0 ? (
                                <EmptyState
                                    title="No pages in the graph yet"
                                    copy="Add a page node to begin building the website diagram."
                                />
                            ) : null}
                            {activeProject.pages.map((page) => (
                                <div
                                    key={page.id}
                                    className={`graph-node ${
                                        selectedPage?.id === page.id
                                            ? "graph-node--selected"
                                            : ""
                                    }`}
                                    style={{
                                        left: `${page.x}px`,
                                        top: `${page.y}px`,
                                        backgroundColor: page.style.backgroundColor,
                                        borderColor: page.style.borderColor,
                                    }}
                                    onMouseUpCapture={() =>
                                        handleCompleteConnection(page.id)
                                    }
                                >
                                    <button
                                        type="button"
                                        className="graph-node__connector"
                                        aria-label={`Connect from ${page.name}`}
                                        onMouseDown={(event) =>
                                            handleStartConnection(page.id, event)
                                        }
                                    />
                                    <div
                                        className="graph-node__body"
                                        onMouseDown={(event) =>
                                            handleStartPageDrag(page.id, event)
                                        }
                                        onClick={() => setSelectedPageId(page.id)}
                                    >
                                        <strong>{page.name}</strong>
                                        <span>{page.purpose}</span>
                                        <small>
                                            {page.components.length} components
                                        </small>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </article>

                    <aside className="card-panel">
                        <SectionHeading
                            eyebrow="Editors"
                            title="Selected Page and Route"
                            copy="Use these controls to rename nodes, update route labels, and remove items."
                        />
                        {selectedPage !== undefined ? (
                            <div className="editor-stack">
                                <label className="field">
                                    <span>Page name</span>
                                    <input
                                        value={selectedPage.name}
                                        onChange={(event) =>
                                            updatePage(
                                                activeProject.id,
                                                selectedPage.id,
                                                (page) => ({
                                                    ...page,
                                                    name: event.currentTarget.value,
                                                }),
                                            )
                                        }
                                    />
                                </label>
                                <label className="field">
                                    <span>Page purpose</span>
                                    <textarea
                                        rows={4}
                                        value={selectedPage.purpose}
                                        onChange={(event) =>
                                            updatePage(
                                                activeProject.id,
                                                selectedPage.id,
                                                (page) => ({
                                                    ...page,
                                                    purpose:
                                                        event.currentTarget.value,
                                                }),
                                            )
                                        }
                                    />
                                </label>
                                <button
                                    type="button"
                                    className="button button--danger"
                                    onClick={() => handleDeletePage(selectedPage.id)}
                                >
                                    Delete Page
                                </button>
                            </div>
                        ) : (
                            <EmptyState
                                title="Select a page"
                                copy="Choose a node in the graph to edit its name and description."
                            />
                        )}

                        {selectedRoute !== undefined ? (
                            <div className="editor-stack">
                                <label className="field">
                                    <span>Route label</span>
                                    <input
                                        value={selectedRoute.label}
                                        onChange={(event) =>
                                            updateRoute(
                                                activeProject.id,
                                                selectedRoute.id,
                                                (entry) => ({
                                                    ...entry,
                                                    label: event.currentTarget.value,
                                                }),
                                            )
                                        }
                                    />
                                </label>
                                <label className="field">
                                    <span>Source page</span>
                                    <select
                                        value={selectedRoute.sourcePageId}
                                        onChange={(event) =>
                                            updateRoute(
                                                activeProject.id,
                                                selectedRoute.id,
                                                (entry) => ({
                                                    ...entry,
                                                    sourcePageId:
                                                        event.currentTarget.value,
                                                }),
                                            )
                                        }
                                    >
                                        {activeProject.pages.map((page) => (
                                            <option key={page.id} value={page.id}>
                                                {page.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="field">
                                    <span>Target page</span>
                                    <select
                                        value={selectedRoute.targetPageId}
                                        onChange={(event) =>
                                            updateRoute(
                                                activeProject.id,
                                                selectedRoute.id,
                                                (entry) => ({
                                                    ...entry,
                                                    targetPageId:
                                                        event.currentTarget.value,
                                                }),
                                            )
                                        }
                                    >
                                        {activeProject.pages.map((page) => (
                                            <option key={page.id} value={page.id}>
                                                {page.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <button
                                    type="button"
                                    className="button button--danger"
                                    onClick={() => handleDeleteRoute(selectedRoute.id)}
                                >
                                    Delete Route
                                </button>
                            </div>
                        ) : (
                            <EmptyState
                                title="Select a route"
                                copy="Click any route line to edit the visible label or delete the connection."
                            />
                        )}
                    </aside>
                </section>
            ) : null}

            {route.tab === "pages" ? (
                <section className="workspace-grid workspace-grid--pages">
                    <aside className="card-panel">
                        <SectionHeading
                            eyebrow="Pages"
                            title="Page Selector"
                            copy="Pick the page you want to edit, or add a new one."
                        />
                        <div className="list-stack">
                            {activeProject.pages.map((page) => (
                                <button
                                    type="button"
                                    key={page.id}
                                    className={`list-card ${
                                        selectedPage?.id === page.id
                                            ? "list-card--selected"
                                            : ""
                                    }`}
                                    onClick={() => setSelectedPageId(page.id)}
                                >
                                    <strong>{page.name}</strong>
                                    <span>{page.components.length} components</span>
                                </button>
                            ))}
                            <button
                                type="button"
                                className="button button--primary"
                                onClick={handleAddPage}
                            >
                                Add Page
                            </button>
                        </div>
                    </aside>

                    <article className="card-panel">
                        <SectionHeading
                            eyebrow="Preview"
                            title="Live Page Layout"
                            copy="The preview updates immediately as you style the page and configure each component."
                        />
                        {selectedPage !== undefined ? (
                            <div className="page-preview-shell">
                                <PagePreview
                                    page={selectedPage}
                                    routes={activeProject.routes}
                                />
                            </div>
                        ) : (
                            <EmptyState
                                title="Choose a page to preview"
                                copy="The selected page will render here using the page and component styling controls."
                            />
                        )}
                    </article>

                    <aside className="card-panel">
                        <SectionHeading
                            eyebrow="Components"
                            title="Page Editor"
                            copy="Add components, reorder them, configure required fields, and style the page."
                        />
                        {selectedPage === undefined ? (
                            <EmptyState
                                title="No page selected"
                                copy="Select a page from the list to add components and update styling."
                            />
                        ) : (
                            <div className="editor-stack">
                                <div className="component-palette">
                                    {COMPONENT_TYPES.map((type) => (
                                        <button
                                            type="button"
                                            key={type}
                                            className="button"
                                            onClick={() => handleAddComponent(type)}
                                        >
                                            Add {type}
                                        </button>
                                    ))}
                                </div>

                                <div className="component-list">
                                    {selectedPage.components.map((component) => (
                                        <div
                                            key={component.id}
                                            className={`component-list__item ${
                                                selectedComponent?.id ===
                                                component.id
                                                    ? "component-list__item--selected"
                                                    : ""
                                            }`}
                                        >
                                            <button
                                                type="button"
                                                className="component-list__select"
                                                onClick={() =>
                                                    setSelectedComponentId(
                                                        component.id,
                                                    )
                                                }
                                            >
                                                <strong>{component.type}</strong>
                                                <span>
                                                    {getComponentLabel(component)}
                                                </span>
                                            </button>
                                            <div className="component-list__actions">
                                                <button
                                                    type="button"
                                                    className="button button--small"
                                                    onClick={() =>
                                                        moveComponent(
                                                            component.id,
                                                            -1,
                                                        )
                                                    }
                                                >
                                                    Up
                                                </button>
                                                <button
                                                    type="button"
                                                    className="button button--small"
                                                    onClick={() =>
                                                        moveComponent(
                                                            component.id,
                                                            1,
                                                        )
                                                    }
                                                >
                                                    Down
                                                </button>
                                                <button
                                                    type="button"
                                                    className="button button--danger button--small"
                                                    onClick={() =>
                                                        handleDeleteComponent(
                                                            component.id,
                                                        )
                                                    }
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <StyleEditor
                                    title="Page Styles"
                                    style={selectedPage.style}
                                    onChange={(patch) =>
                                        updatePage(
                                            activeProject.id,
                                            selectedPage.id,
                                            (page) => ({
                                                ...page,
                                                style: {
                                                    ...page.style,
                                                    ...patch,
                                                },
                                            }),
                                        )
                                    }
                                />

                                {selectedComponent !== undefined ? (
                                    <>
                                        <ComponentConfigEditor
                                            component={selectedComponent}
                                            availableRoutes={activeProject.routes.filter(
                                                (entry) =>
                                                    entry.sourcePageId ===
                                                    selectedPage.id,
                                            )}
                                            pages={activeProject.pages}
                                            onChange={(component) =>
                                                updateComponent(
                                                    selectedPage.id,
                                                    selectedComponent.id,
                                                    () => component,
                                                )
                                            }
                                        />
                                        <StyleEditor
                                            title="Component Styles"
                                            style={selectedComponent.style}
                                            onChange={(patch) =>
                                                updateComponent(
                                                    selectedPage.id,
                                                    selectedComponent.id,
                                                    (component) => ({
                                                        ...component,
                                                        style: {
                                                            ...component.style,
                                                            ...patch,
                                                        },
                                                    }),
                                                )
                                            }
                                        />
                                    </>
                                ) : (
                                    <EmptyState
                                        title="Select a component"
                                        copy="Choose one of the page components to edit its required fields and styling."
                                    />
                                )}
                            </div>
                        )}
                    </aside>
                </section>
            ) : null}

            {route.tab === "state" ? (
                <section className="workspace-grid workspace-grid--state">
                    <article className="card-panel">
                        <SectionHeading
                            eyebrow="Primary State"
                            title="Main Dataclass"
                            copy="Define the primary state model, including field types, descriptions, and where each value updates."
                        />
                        <label className="field">
                            <span>Primary dataclass name</span>
                            <input
                                value={activeProject.stateModel.primaryName}
                                onChange={(event) =>
                                    updateProject(activeProject.id, (project) => ({
                                        ...project,
                                        stateModel: {
                                            ...project.stateModel,
                                            primaryName:
                                                event.currentTarget.value,
                                        },
                                    }))
                                }
                            />
                        </label>
                        <button
                            type="button"
                            className="button button--primary"
                            onClick={handleAddPrimaryField}
                        >
                            Add Primary Field
                        </button>
                        <datalist id="state-types">
                            {PRIMARY_TYPE_OPTIONS.map((type) => (
                                <option key={type} value={type} />
                            ))}
                            {activeProject.stateModel.secondaryClasses.map((entry) => (
                                <option
                                    key={entry.id}
                                    value={`list[${entry.name}]`}
                                />
                            ))}
                        </datalist>
                        <div className="field-card-list">
                            {activeProject.stateModel.primaryFields.map((field) => {
                                const linkedSecondary = activeProject.stateModel.secondaryClasses.find(
                                    (secondaryClass) =>
                                        secondaryClass.linkedPrimaryFieldId ===
                                        field.id,
                                );
                                return (
                                    <div className="field-card" key={field.id}>
                                        <div className="field-card__top">
                                            <strong>{field.name}</strong>
                                            <button
                                                type="button"
                                                className="button button--danger button--small"
                                                onClick={() =>
                                                    handleDeletePrimaryField(
                                                        field.id,
                                                    )
                                                }
                                            >
                                                Delete
                                            </button>
                                        </div>
                                        <label className="field">
                                            <span>Name</span>
                                            <input
                                                value={field.name}
                                                onChange={(event) =>
                                                    updatePrimaryField(
                                                        field.id,
                                                        (currentField) => ({
                                                            ...currentField,
                                                            name: event
                                                                .currentTarget
                                                                .value,
                                                        }),
                                                    )
                                                }
                                            />
                                        </label>
                                        <label className="field">
                                            <span>Type</span>
                                            <input
                                                list="state-types"
                                                value={field.type}
                                                onChange={(event) =>
                                                    updatePrimaryField(
                                                        field.id,
                                                        (currentField) => ({
                                                            ...currentField,
                                                            type: event
                                                                .currentTarget
                                                                .value,
                                                        }),
                                                    )
                                                }
                                            />
                                        </label>
                                        <label className="field">
                                            <span>Description</span>
                                            <textarea
                                                rows={3}
                                                value={field.description}
                                                onChange={(event) =>
                                                    updatePrimaryField(
                                                        field.id,
                                                        (currentField) => ({
                                                            ...currentField,
                                                            description:
                                                                event
                                                                    .currentTarget
                                                                    .value,
                                                        }),
                                                    )
                                                }
                                            />
                                        </label>
                                        {linkedSecondary !== undefined ? (
                                            <p className="muted-copy">
                                                Linked secondary dataclass:{" "}
                                                {linkedSecondary.name}
                                            </p>
                                        ) : null}
                                        <div>
                                            <p className="field-group__title">
                                                Updated by pages
                                            </p>
                                            <div className="chip-row">
                                                {activeProject.pages.map((page) => (
                                                    <button
                                                        type="button"
                                                        key={page.id}
                                                        className={`chip ${
                                                            field.updatedByPageIds.includes(
                                                                page.id,
                                                            )
                                                                ? "chip--active"
                                                                : ""
                                                        }`}
                                                        onClick={() =>
                                                            toggleFieldLink(
                                                                field.id,
                                                                page.id,
                                                                "page",
                                                            )
                                                        }
                                                    >
                                                        {page.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="field-group__title">
                                                Updated by routes
                                            </p>
                                            <div className="chip-row">
                                                {activeProject.routes.map((entry) => (
                                                    <button
                                                        type="button"
                                                        key={entry.id}
                                                        className={`chip ${
                                                            field.updatedByRouteIds.includes(
                                                                entry.id,
                                                            )
                                                                ? "chip--active"
                                                                : ""
                                                        }`}
                                                        onClick={() =>
                                                            toggleFieldLink(
                                                                field.id,
                                                                entry.id,
                                                                "route",
                                                            )
                                                        }
                                                    >
                                                        {entry.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </article>

                    <aside className="card-panel">
                        <SectionHeading
                            eyebrow="Secondary State"
                            title="Nested Dataclasses"
                            copy="Create secondary dataclasses and automatically reference them from a list field in the primary state."
                        />
                        <button
                            type="button"
                            className="button button--primary"
                            onClick={handleAddSecondaryClass}
                        >
                            Add Secondary Dataclass
                        </button>
                        <div className="field-card-list">
                            {activeProject.stateModel.secondaryClasses.length === 0 ? (
                                <EmptyState
                                    title="No nested dataclasses yet"
                                    copy="Create a secondary dataclass to satisfy the nested list requirement."
                                />
                            ) : (
                                activeProject.stateModel.secondaryClasses.map(
                                    (secondaryClass) => (
                                        <div
                                            className="field-card"
                                            key={secondaryClass.id}
                                        >
                                            <div className="field-card__top">
                                                <strong>{secondaryClass.name}</strong>
                                                <button
                                                    type="button"
                                                    className="button button--danger button--small"
                                                    onClick={() =>
                                                        handleDeleteSecondaryClass(
                                                            secondaryClass.id,
                                                        )
                                                    }
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                            <label className="field">
                                                <span>Name</span>
                                                <input
                                                    value={secondaryClass.name}
                                                    onChange={(event) =>
                                                        updateSecondaryClass(
                                                            secondaryClass.id,
                                                            (currentClass) => ({
                                                                ...currentClass,
                                                                name: event
                                                                    .currentTarget
                                                                    .value,
                                                            }),
                                                        )
                                                    }
                                                />
                                            </label>
                                            <label className="field">
                                                <span>Description</span>
                                                <textarea
                                                    rows={3}
                                                    value={
                                                        secondaryClass.description
                                                    }
                                                    onChange={(event) =>
                                                        updateSecondaryClass(
                                                            secondaryClass.id,
                                                            (currentClass) => ({
                                                                ...currentClass,
                                                                description:
                                                                    event
                                                                        .currentTarget
                                                                        .value,
                                                            }),
                                                        )
                                                    }
                                                />
                                            </label>
                                            <p className="muted-copy">
                                                Linked in primary state as{" "}
                                                {
                                                    activeProject.stateModel.primaryFields.find(
                                                        (field) =>
                                                            field.id ===
                                                            secondaryClass.linkedPrimaryFieldId,
                                                    )?.name
                                                }
                                            </p>
                                            {secondaryClass.fields.map((field) => (
                                                <div
                                                    className="nested-field"
                                                    key={field.id}
                                                >
                                                    <label className="field">
                                                        <span>Name</span>
                                                        <input
                                                            value={field.name}
                                                            onChange={(event) =>
                                                                updateSecondaryClass(
                                                                    secondaryClass.id,
                                                                    (
                                                                        currentClass,
                                                                    ) => ({
                                                                        ...currentClass,
                                                                        fields: currentClass.fields.map(
                                                                            (
                                                                                currentField,
                                                                            ) =>
                                                                                currentField.id ===
                                                                                field.id
                                                                                    ? {
                                                                                          ...currentField,
                                                                                          name: event
                                                                                              .currentTarget
                                                                                              .value,
                                                                                      }
                                                                                    : currentField,
                                                                        ),
                                                                    }),
                                                                )
                                                            }
                                                        />
                                                    </label>
                                                    <label className="field">
                                                        <span>Type</span>
                                                        <input
                                                            value={field.type}
                                                            onChange={(event) =>
                                                                updateSecondaryClass(
                                                                    secondaryClass.id,
                                                                    (
                                                                        currentClass,
                                                                    ) => ({
                                                                        ...currentClass,
                                                                        fields: currentClass.fields.map(
                                                                            (
                                                                                currentField,
                                                                            ) =>
                                                                                currentField.id ===
                                                                                field.id
                                                                                    ? {
                                                                                          ...currentField,
                                                                                          type: event
                                                                                              .currentTarget
                                                                                              .value,
                                                                                      }
                                                                                    : currentField,
                                                                        ),
                                                                    }),
                                                                )
                                                            }
                                                        />
                                                    </label>
                                                    <label className="field">
                                                        <span>Description</span>
                                                        <input
                                                            value={
                                                                field.description
                                                            }
                                                            onChange={(event) =>
                                                                updateSecondaryClass(
                                                                    secondaryClass.id,
                                                                    (
                                                                        currentClass,
                                                                    ) => ({
                                                                        ...currentClass,
                                                                        fields: currentClass.fields.map(
                                                                            (
                                                                                currentField,
                                                                            ) =>
                                                                                currentField.id ===
                                                                                field.id
                                                                                    ? {
                                                                                          ...currentField,
                                                                                          description:
                                                                                              event
                                                                                                  .currentTarget
                                                                                                  .value,
                                                                                      }
                                                                                    : currentField,
                                                                        ),
                                                                    }),
                                                                )
                                                            }
                                                        />
                                                    </label>
                                                    <button
                                                        type="button"
                                                        className="button button--danger button--small"
                                                        onClick={() =>
                                                            handleDeleteSecondaryField(
                                                                secondaryClass.id,
                                                                field.id,
                                                            )
                                                        }
                                                    >
                                                        Delete Field
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                type="button"
                                                className="button"
                                                onClick={() =>
                                                    handleAddSecondaryField(
                                                        secondaryClass.id,
                                                    )
                                                }
                                            >
                                                Add Nested Field
                                            </button>
                                        </div>
                                    ),
                                )
                            )}
                        </div>
                    </aside>
                </section>
            ) : null}

            {route.tab === "logic" ? (
                <section className="workspace-grid workspace-grid--logic">
                    <article className="card-panel">
                        <SectionHeading
                            eyebrow="Annotations"
                            title="Logic Markers"
                            copy="Tie state-change, if, and for annotations to either a page or a route."
                        />
                        <div className="logic-counts">
                            <StatPill
                                label="If Statements"
                                value={`${annotationCounts.ifCount}/3`}
                            />
                            <StatPill
                                label="For Loops"
                                value={`${annotationCounts.forCount}/1`}
                            />
                            <StatPill
                                label="State Notes"
                                value={String(annotationCounts.stateChangeCount)}
                            />
                        </div>
                        <div className="field-card">
                            <label className="field">
                                <span>Annotation target</span>
                                <select
                                    value={annotationDraft.targetType}
                                    onChange={(event) =>
                                        setAnnotationDraft((draft) => ({
                                            ...draft,
                                            targetType: event.currentTarget
                                                .value as "page" | "route",
                                            targetId: "",
                                            relatedComponentId: "",
                                        }))
                                    }
                                >
                                    <option value="page">Page</option>
                                    <option value="route">Route</option>
                                </select>
                            </label>
                            <label className="field">
                                <span>
                                    {annotationDraft.targetType === "page"
                                        ? "Page"
                                        : "Route"}
                                </span>
                                <select
                                    value={annotationDraft.targetId}
                                    onChange={(event) =>
                                        setAnnotationDraft((draft) => ({
                                            ...draft,
                                            targetId: event.currentTarget.value,
                                            relatedComponentId: "",
                                        }))
                                    }
                                >
                                    {(annotationDraft.targetType === "page"
                                        ? activeProject.pages.map((page) => ({
                                              id: page.id,
                                              name: page.name,
                                          }))
                                        : activeProject.routes.map((entry) => ({
                                              id: entry.id,
                                              name: entry.label,
                                          }))
                                    ).map((option) => (
                                        <option key={option.id} value={option.id}>
                                            {option.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="field">
                                <span>Type</span>
                                <select
                                    value={annotationDraft.type}
                                    onChange={(event) =>
                                        setAnnotationDraft((draft) => ({
                                            ...draft,
                                            type: event.currentTarget
                                                .value as AnnotationType,
                                        }))
                                    }
                                >
                                    {ANNOTATION_TYPES.map((type) => (
                                        <option key={type} value={type}>
                                            {type}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="field">
                                <span>Explanation</span>
                                <textarea
                                    rows={4}
                                    value={annotationDraft.explanation}
                                    onChange={(event) =>
                                        setAnnotationDraft((draft) => ({
                                            ...draft,
                                            explanation:
                                                event.currentTarget.value,
                                        }))
                                    }
                                />
                            </label>
                            <label className="field">
                                <span>Related state field</span>
                                <select
                                    value={annotationDraft.relatedStateFieldId}
                                    onChange={(event) =>
                                        setAnnotationDraft((draft) => ({
                                            ...draft,
                                            relatedStateFieldId:
                                                event.currentTarget.value,
                                        }))
                                    }
                                >
                                    <option value="">Not linked</option>
                                    {activeProject.stateModel.primaryFields.map(
                                        (field) => (
                                            <option key={field.id} value={field.id}>
                                                {field.name}
                                            </option>
                                        ),
                                    )}
                                </select>
                            </label>
                            <label className="field">
                                <span>Related component</span>
                                <select
                                    value={annotationDraft.relatedComponentId}
                                    onChange={(event) =>
                                        setAnnotationDraft((draft) => ({
                                            ...draft,
                                            relatedComponentId:
                                                event.currentTarget.value,
                                        }))
                                    }
                                >
                                    <option value="">Not linked</option>
                                    {annotationComponentOptions.map((component) => (
                                        <option
                                            key={component.id}
                                            value={component.id}
                                        >
                                            {component.type}:{" "}
                                            {getComponentLabel(component)}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <button
                                type="button"
                                className="button button--primary"
                                onClick={handleAddAnnotation}
                            >
                                Add Annotation
                            </button>
                        </div>

                        <div className="annotation-group">
                            <h3>Page annotations</h3>
                            {activeProject.pages.map((page) => (
                                <div className="annotation-block" key={page.id}>
                                    <strong>{page.name}</strong>
                                    {page.annotations.length === 0 ? (
                                        <p className="muted-copy">
                                            No annotations yet.
                                        </p>
                                    ) : (
                                        page.annotations.map((annotation) => (
                                            <AnnotationCard
                                                key={annotation.id}
                                                annotation={annotation}
                                                onDelete={() =>
                                                    handleDeleteAnnotation(
                                                        "page",
                                                        page.id,
                                                        annotation.id,
                                                    )
                                                }
                                            />
                                        ))
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="annotation-group">
                            <h3>Route annotations</h3>
                            {activeProject.routes.map((entry) => (
                                <div className="annotation-block" key={entry.id}>
                                    <strong>{entry.label}</strong>
                                    {entry.annotations.length === 0 ? (
                                        <p className="muted-copy">
                                            No annotations yet.
                                        </p>
                                    ) : (
                                        entry.annotations.map((annotation) => (
                                            <AnnotationCard
                                                key={annotation.id}
                                                annotation={annotation}
                                                onDelete={() =>
                                                    handleDeleteAnnotation(
                                                        "route",
                                                        entry.id,
                                                        annotation.id,
                                                    )
                                                }
                                            />
                                        ))
                                    )}
                                </div>
                            ))}
                        </div>
                    </article>

                    <aside className="card-panel">
                        <SectionHeading
                            eyebrow="Exports"
                            title="Submission Outputs"
                            copy="Generate project artifacts for code, documentation, and persistence."
                        />
                        <div className="export-actions">
                            <button
                                type="button"
                                className="button button--primary"
                                onClick={() => exportPythonStarter(activeProject)}
                            >
                                Download Python Starter
                            </button>
                            <button
                                type="button"
                                className="button"
                                onClick={() => exportProjectJson(activeProject)}
                            >
                                Download JSON Project
                            </button>
                            <button
                                type="button"
                                className="button"
                                onClick={() => {
                                    void handleExportDocx();
                                }}
                            >
                                Download DOCX Report
                            </button>
                            <label className="file-input">
                                <span>Import JSON Project</span>
                                <input
                                    type="file"
                                    accept=".json,application/json"
                                    onChange={(event) => {
                                        void handleImportProject(event);
                                    }}
                                />
                            </label>
                        </div>
                        <div className="code-preview">
                            <h3>Generated Drafter Starter</h3>
                            <textarea
                                readOnly
                                rows={24}
                                value={pythonPreview}
                            />
                        </div>
                    </aside>
                </section>
            ) : null}
        </main>
    );
}

function SectionHeading(props: {
    eyebrow: string;
    title: string;
    copy: string;
}): JSX.Element {
    return (
        <div className="section-heading">
            <div>
                <p className="eyebrow">{props.eyebrow}</p>
                <h2>{props.title}</h2>
            </div>
            <p className="muted-copy">{props.copy}</p>
        </div>
    );
}

function StatusBanner(props: { message: StatusMessage }): JSX.Element {
    return (
        <div className={`status-banner status-banner--${props.message.tone}`}>
            {props.message.text}
        </div>
    );
}

function StatPill(props: { label: string; value: string }): JSX.Element {
    return (
        <div className="summary-pill">
            <span>{props.label}</span>
            <strong>{props.value}</strong>
        </div>
    );
}

function EmptyState(props: { title: string; copy: string }): JSX.Element {
    return (
        <div className="empty-state">
            <h3>{props.title}</h3>
            <p>{props.copy}</p>
        </div>
    );
}

function PagePreview(props: {
    page: PageNode;
    routes: RouteDefinition[];
}): JSX.Element {
    const pageStyle = styleSettingsToCss(props.page.style);
    return (
        <section className="page-preview" style={pageStyle}>
            {props.page.components.map((component) => {
                const style = styleSettingsToCss(component.style);
                switch (component.type) {
                    case "Text":
                        return (
                            <p key={component.id} style={style}>
                                {component.content}
                            </p>
                        );
                    case "Header": {
                        const headingTag = component.level;
                        if (headingTag === 1) {
                            return (
                                <h1 key={component.id} style={style}>
                                    {component.content}
                                </h1>
                            );
                        }
                        if (headingTag === 2) {
                            return (
                                <h2 key={component.id} style={style}>
                                    {component.content}
                                </h2>
                            );
                        }
                        if (headingTag === 3) {
                            return (
                                <h3 key={component.id} style={style}>
                                    {component.content}
                                </h3>
                            );
                        }
                        return (
                            <h4 key={component.id} style={style}>
                                {component.content}
                            </h4>
                        );
                    }
                    case "TextBox":
                        return (
                            <label
                                key={component.id}
                                className="preview-field"
                                style={style}
                            >
                                <span>{component.name}</span>
                                <input value={component.defaultValue} readOnly />
                            </label>
                        );
                    case "TextArea":
                        return (
                            <label
                                key={component.id}
                                className="preview-field"
                                style={style}
                            >
                                <span>{component.name}</span>
                                <textarea
                                    value={component.defaultValue}
                                    rows={4}
                                    readOnly
                                />
                            </label>
                        );
                    case "CheckBox":
                        return (
                            <label
                                key={component.id}
                                className="preview-checkbox"
                                style={style}
                            >
                                <input
                                    type="checkbox"
                                    checked={component.defaultValue}
                                    readOnly
                                />
                                <span>{component.name}</span>
                            </label>
                        );
                    case "SelectBox":
                        return (
                            <label
                                key={component.id}
                                className="preview-field"
                                style={style}
                            >
                                <span>{component.name}</span>
                                <select value={component.defaultValue} disabled>
                                    {component.options.map((option) => (
                                        <option key={option} value={option}>
                                            {option}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        );
                    case "Button": {
                        const routeLabel =
                            props.routes.find(
                                (entry) => entry.id === component.routeId,
                            )?.label ?? "No route";
                        return (
                            <button key={component.id} style={style} type="button">
                                {component.label} ({routeLabel})
                            </button>
                        );
                    }
                }
            })}
        </section>
    );
}

function ComponentConfigEditor(props: {
    component: UIComponent;
    availableRoutes: RouteDefinition[];
    pages: PageNode[];
    onChange: (component: UIComponent) => void;
}): JSX.Element {
    const { component } = props;
    return (
        <div className="field-card">
            <div className="field-card__top">
                <strong>{component.type} Settings</strong>
                <span className="pill">{getComponentLabel(component)}</span>
            </div>
            {component.type === "Text" ? (
                <label className="field">
                    <span>Contents</span>
                    <textarea
                        rows={4}
                        value={component.content}
                        onChange={(event) =>
                            props.onChange({
                                ...component,
                                content: event.currentTarget.value,
                            })
                        }
                    />
                </label>
            ) : null}
            {component.type === "Header" ? (
                <>
                    <label className="field">
                        <span>Contents</span>
                        <input
                            value={component.content}
                            onChange={(event) =>
                                props.onChange({
                                    ...component,
                                    content: event.currentTarget.value,
                                })
                            }
                        />
                    </label>
                    <label className="field">
                        <span>Level</span>
                        <select
                            value={component.level}
                            onChange={(event) =>
                                props.onChange({
                                    ...component,
                                    level: Number(
                                        event.currentTarget.value,
                                    ) as 1 | 2 | 3 | 4,
                                })
                            }
                        >
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                        </select>
                    </label>
                </>
            ) : null}
            {component.type === "TextBox" || component.type === "TextArea" ? (
                <>
                    <label className="field">
                        <span>Name</span>
                        <input
                            value={component.name}
                            onChange={(event) =>
                                props.onChange({
                                    ...component,
                                    name: event.currentTarget.value,
                                })
                            }
                        />
                    </label>
                    <label className="field">
                        <span>Default value</span>
                        <textarea
                            rows={component.type === "TextArea" ? 4 : 2}
                            value={component.defaultValue}
                            onChange={(event) =>
                                props.onChange({
                                    ...component,
                                    defaultValue: event.currentTarget.value,
                                })
                            }
                        />
                    </label>
                </>
            ) : null}
            {component.type === "CheckBox" ? (
                <>
                    <label className="field">
                        <span>Name</span>
                        <input
                            value={component.name}
                            onChange={(event) =>
                                props.onChange({
                                    ...component,
                                    name: event.currentTarget.value,
                                })
                            }
                        />
                    </label>
                    <label className="field">
                        <span>Default value</span>
                        <select
                            value={component.defaultValue ? "true" : "false"}
                            onChange={(event) =>
                                props.onChange({
                                    ...component,
                                    defaultValue:
                                        event.currentTarget.value === "true",
                                })
                            }
                        >
                            <option value="true">true</option>
                            <option value="false">false</option>
                        </select>
                    </label>
                </>
            ) : null}
            {component.type === "SelectBox" ? (
                <>
                    <label className="field">
                        <span>Name</span>
                        <input
                            value={component.name}
                            onChange={(event) =>
                                props.onChange({
                                    ...component,
                                    name: event.currentTarget.value,
                                })
                            }
                        />
                    </label>
                    <label className="field">
                        <span>Options</span>
                        <textarea
                            rows={4}
                            value={component.options.join("\n")}
                            onChange={(event) => {
                                const options = event.currentTarget.value
                                    .split("\n")
                                    .map((item) => item.trim())
                                    .filter((item) => item.length > 0);
                                props.onChange({
                                    ...component,
                                    options,
                                    defaultValue:
                                        options.includes(component.defaultValue)
                                            ? component.defaultValue
                                            : (options[0] ?? ""),
                                });
                            }}
                        />
                    </label>
                    <label className="field">
                        <span>Default value</span>
                        <input
                            value={component.defaultValue}
                            onChange={(event) =>
                                props.onChange({
                                    ...component,
                                    defaultValue: event.currentTarget.value,
                                })
                            }
                        />
                    </label>
                </>
            ) : null}
            {component.type === "Button" ? (
                <>
                    <label className="field">
                        <span>Label</span>
                        <input
                            value={component.label}
                            onChange={(event) =>
                                props.onChange({
                                    ...component,
                                    label: event.currentTarget.value,
                                })
                            }
                        />
                    </label>
                    <label className="field">
                        <span>Route</span>
                        <select
                            value={component.routeId}
                            onChange={(event) =>
                                props.onChange({
                                    ...component,
                                    routeId: event.currentTarget.value,
                                })
                            }
                        >
                            <option value="">No route selected</option>
                            {props.availableRoutes.map((entry) => {
                                const targetPage = props.pages.find(
                                    (page) => page.id === entry.targetPageId,
                                );
                                return (
                                    <option key={entry.id} value={entry.id}>
                                        {entry.label} to {targetPage?.name ?? "page"}
                                    </option>
                                );
                            })}
                        </select>
                    </label>
                </>
            ) : null}
        </div>
    );
}

function StyleEditor(props: {
    title: string;
    style: StyleSettings;
    onChange: (patch: Partial<StyleSettings>) => void;
}): JSX.Element {
    return (
        <div className="field-card">
            <div className="field-card__top">
                <strong>{props.title}</strong>
            </div>
            <div className="style-grid">
                <label className="field">
                    <span>Background</span>
                    <input
                        type="color"
                        value={props.style.backgroundColor}
                        onChange={(event) =>
                            props.onChange({
                                backgroundColor: event.currentTarget.value,
                            })
                        }
                    />
                </label>
                <label className="field">
                    <span>Text</span>
                    <input
                        type="color"
                        value={props.style.textColor}
                        onChange={(event) =>
                            props.onChange({
                                textColor: event.currentTarget.value,
                            })
                        }
                    />
                </label>
                <label className="field">
                    <span>Border</span>
                    <input
                        type="color"
                        value={props.style.borderColor}
                        onChange={(event) =>
                            props.onChange({
                                borderColor: event.currentTarget.value,
                            })
                        }
                    />
                </label>
                <label className="field">
                    <span>Font</span>
                    <select
                        value={props.style.fontFamily}
                        onChange={(event) =>
                            props.onChange({
                                fontFamily: event.currentTarget
                                    .value as StyleSettings["fontFamily"],
                            })
                        }
                    >
                        {FONT_OPTIONS.map((font) => (
                            <option key={font} value={font}>
                                {font}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="field">
                    <span>Direction</span>
                    <select
                        value={props.style.direction}
                        onChange={(event) =>
                            props.onChange({
                                direction: event.currentTarget
                                    .value as StyleSettings["direction"],
                            })
                        }
                    >
                        {FLEX_DIRECTIONS.map((direction) => (
                            <option key={direction} value={direction}>
                                {direction}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="field">
                    <span>Justify</span>
                    <select
                        value={props.style.justifyContent}
                        onChange={(event) =>
                            props.onChange({
                                justifyContent: event.currentTarget
                                    .value as StyleSettings["justifyContent"],
                            })
                        }
                    >
                        {JUSTIFY_OPTIONS.map((value) => (
                            <option key={value} value={value}>
                                {value}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="field">
                    <span>Align</span>
                    <select
                        value={props.style.alignItems}
                        onChange={(event) =>
                            props.onChange({
                                alignItems: event.currentTarget
                                    .value as StyleSettings["alignItems"],
                            })
                        }
                    >
                        {ALIGN_OPTIONS.map((value) => (
                            <option key={value} value={value}>
                                {value}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="field">
                    <span>Gap</span>
                    <input
                        type="number"
                        min="0"
                        value={props.style.gap}
                        onChange={(event) =>
                            props.onChange({
                                gap: Number(event.currentTarget.value),
                            })
                        }
                    />
                </label>
                <label className="field">
                    <span>Padding</span>
                    <input
                        type="number"
                        min="0"
                        value={props.style.padding}
                        onChange={(event) =>
                            props.onChange({
                                padding: Number(event.currentTarget.value),
                            })
                        }
                    />
                </label>
                <label className="field">
                    <span>Border width</span>
                    <input
                        type="number"
                        min="0"
                        value={props.style.borderWidth}
                        onChange={(event) =>
                            props.onChange({
                                borderWidth: Number(event.currentTarget.value),
                            })
                        }
                    />
                </label>
                <label className="field">
                    <span>Corner radius</span>
                    <input
                        type="number"
                        min="0"
                        value={props.style.borderRadius}
                        onChange={(event) =>
                            props.onChange({
                                borderRadius: Number(event.currentTarget.value),
                            })
                        }
                    />
                </label>
                <label className="field">
                    <span>Width</span>
                    <input
                        value={props.style.width}
                        onChange={(event) =>
                            props.onChange({
                                width: event.currentTarget.value,
                            })
                        }
                    />
                </label>
            </div>
        </div>
    );
}

function AnnotationCard(props: {
    annotation: Annotation;
    onDelete: () => void;
}): JSX.Element {
    return (
        <div className="annotation-card">
            <div className="annotation-card__top">
                <span className="pill">{props.annotation.type}</span>
                <button
                    type="button"
                    className="button button--danger button--small"
                    onClick={props.onDelete}
                >
                    Delete
                </button>
            </div>
            <p>{props.annotation.explanation}</p>
        </div>
    );
}

function getComponentLabel(component: UIComponent): string {
    switch (component.type) {
        case "Text":
            return component.content;
        case "Header":
            return component.content;
        case "TextBox":
        case "TextArea":
        case "CheckBox":
        case "SelectBox":
            return component.name;
        case "Button":
            return component.label;
    }
}

function getAnnotationComponentOptions(
    project: Project,
    targetType: "page" | "route",
    targetId: string,
): UIComponent[] {
    if (targetType === "page") {
        return (
            project.pages.find((page) => page.id === targetId)?.components ?? []
        );
    }
    const route = project.routes.find((entry) => entry.id === targetId);
    if (route === undefined) {
        return [];
    }
    return (
        project.pages.find((page) => page.id === route.sourcePageId)?.components ??
        []
    );
}

function moveArrayItem<T extends { id: string }>(
    items: T[],
    id: string,
    direction: -1 | 1,
): T[] {
    const index = items.findIndex((item) => item.id === id);
    if (index < 0) {
        return items;
    }
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) {
        return items;
    }
    const clone = [...items];
    const [item] = clone.splice(index, 1);
    clone.splice(nextIndex, 0, item);
    return clone;
}

function toggleItem(items: string[], value: string): string[] {
    return items.includes(value)
        ? items.filter((item) => item !== value)
        : [...items, value];
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function styleSettingsToCss(style: StyleSettings): CSSProperties {
    return {
        backgroundColor: style.backgroundColor,
        color: style.textColor,
        borderColor: style.borderColor,
        borderStyle: "solid",
        borderWidth: `${style.borderWidth}px`,
        borderRadius: `${style.borderRadius}px`,
        fontFamily: style.fontFamily,
        display: "flex",
        flexDirection: style.direction,
        justifyContent: style.justifyContent,
        alignItems: style.alignItems,
        gap: `${style.gap}px`,
        padding: `${style.padding}px`,
        width: style.width,
        boxSizing: "border-box",
    };
}

export default App;
