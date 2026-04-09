import type { Project } from "./projectModel";
import { createStyleSettings } from "./projectModel";

const CAMPUS_CLUB_PROJECT: Project = {
    id: "demo-campus-club",
    name: "Campus Club Fair",
    description:
        "A student-facing site for browsing clubs, saving favorites, and registering for events.",
    lastModified: "2026-04-09T13:30:00.000Z",
    pages: [
        {
            id: "campus-home",
            name: "Home",
            purpose:
                "Introduce the fair, collect a search term, and send the student to filtered results.",
            x: 80,
            y: 120,
            style: createStyleSettings({
                backgroundColor: "#fff7eb",
                borderColor: "#dbb479",
                gap: 14,
            }),
            components: [
                {
                    id: "campus-home-header",
                    type: "Header",
                    content: "Explore campus clubs",
                    level: 1,
                    style: createStyleSettings({
                        backgroundColor: "#f7e3c3",
                        borderColor: "#d2a15b",
                    }),
                },
                {
                    id: "campus-home-text",
                    type: "Text",
                    content:
                        "Search by category or jump straight into the featured events list.",
                    style: createStyleSettings(),
                },
                {
                    id: "campus-home-search",
                    type: "TextBox",
                    name: "search_query",
                    defaultValue: "robotics",
                    style: createStyleSettings(),
                },
                {
                    id: "campus-home-button",
                    type: "Button",
                    label: "See clubs",
                    routeId: "campus-home-to-results",
                    style: createStyleSettings({
                        backgroundColor: "#c26122",
                        textColor: "#fff8ef",
                        borderColor: "#994812",
                        width: "fit-content",
                    }),
                },
            ],
            annotations: [
                {
                    id: "campus-home-if",
                    type: "if",
                    explanation:
                        "If the search box is empty, route to the full directory instead of a filtered list.",
                    relatedStateFieldId: "campus-state-search",
                    relatedComponentId: "campus-home-search",
                },
            ],
        },
        {
            id: "campus-results",
            name: "Club Results",
            purpose:
                "Show filtered club cards, let the student favorite a club, and move to registration.",
            x: 410,
            y: 70,
            style: createStyleSettings({
                backgroundColor: "#f8f4ff",
                borderColor: "#b8a0d2",
                gap: 18,
            }),
            components: [
                {
                    id: "campus-results-header",
                    type: "Header",
                    content: "Club results",
                    level: 1,
                    style: createStyleSettings({
                        backgroundColor: "#e7ddf7",
                        borderColor: "#a690c5",
                    }),
                },
                {
                    id: "campus-results-text",
                    type: "Text",
                    content:
                        "Each card can display club details, available meeting times, and a quick favorite action.",
                    style: createStyleSettings(),
                },
                {
                    id: "campus-results-check",
                    type: "CheckBox",
                    name: "save_to_favorites",
                    defaultValue: true,
                    style: createStyleSettings(),
                },
                {
                    id: "campus-results-select",
                    type: "SelectBox",
                    name: "meeting_day",
                    options: ["Monday", "Wednesday", "Friday"],
                    defaultValue: "Wednesday",
                    style: createStyleSettings(),
                },
                {
                    id: "campus-results-button",
                    type: "Button",
                    label: "Register interest",
                    routeId: "campus-results-to-register",
                    style: createStyleSettings({
                        backgroundColor: "#6f63b5",
                        textColor: "#fcfbff",
                        borderColor: "#5746a5",
                        width: "fit-content",
                    }),
                },
            ],
            annotations: [
                {
                    id: "campus-results-for",
                    type: "for",
                    explanation:
                        "A for loop renders one club card for every club record stored in state.",
                    relatedStateFieldId: "campus-state-clubs",
                    relatedComponentId: "",
                },
            ],
        },
        {
            id: "campus-register",
            name: "Registration",
            purpose:
                "Collect the student's details and confirm the selected club registration.",
            x: 740,
            y: 170,
            style: createStyleSettings({
                backgroundColor: "#eef8f4",
                borderColor: "#86baa0",
            }),
            components: [
                {
                    id: "campus-register-header",
                    type: "Header",
                    content: "Register for a club",
                    level: 1,
                    style: createStyleSettings({
                        backgroundColor: "#d2e9dd",
                        borderColor: "#82b495",
                    }),
                },
                {
                    id: "campus-register-name",
                    type: "TextBox",
                    name: "student_name",
                    defaultValue: "",
                    style: createStyleSettings(),
                },
                {
                    id: "campus-register-notes",
                    type: "TextArea",
                    name: "interest_notes",
                    defaultValue: "I want to learn more about your current projects.",
                    style: createStyleSettings(),
                },
                {
                    id: "campus-register-submit",
                    type: "Button",
                    label: "Submit registration",
                    routeId: "campus-register-to-results",
                    style: createStyleSettings({
                        backgroundColor: "#23785f",
                        textColor: "#f9fffc",
                        borderColor: "#13513f",
                        width: "fit-content",
                    }),
                },
            ],
            annotations: [
                {
                    id: "campus-register-state",
                    type: "state-change",
                    explanation:
                        "Submitting this page appends a new interest record to the saved registrations list.",
                    relatedStateFieldId: "campus-state-registrations",
                    relatedComponentId: "campus-register-submit",
                },
                {
                    id: "campus-register-if",
                    type: "if",
                    explanation:
                        "If the student name field is blank, keep the user on the form and show an error message.",
                    relatedStateFieldId: "campus-state-search",
                    relatedComponentId: "campus-register-name",
                },
            ],
        },
    ],
    routes: [
        {
            id: "campus-home-to-results",
            label: "view_results",
            sourcePageId: "campus-home",
            targetPageId: "campus-results",
            annotations: [
                {
                    id: "campus-route-home-state",
                    type: "state-change",
                    explanation:
                        "Store the submitted query in state so later pages can reuse the same filter.",
                    relatedStateFieldId: "campus-state-search",
                    relatedComponentId: "campus-home-search",
                },
            ],
        },
        {
            id: "campus-results-to-register",
            label: "open_registration",
            sourcePageId: "campus-results",
            targetPageId: "campus-register",
            annotations: [
                {
                    id: "campus-route-results-if",
                    type: "if",
                    explanation:
                        "If no meeting day is selected, route back to the results page instead of registering.",
                    relatedStateFieldId: "campus-state-selected-day",
                    relatedComponentId: "campus-results-select",
                },
            ],
        },
        {
            id: "campus-register-to-results",
            label: "return_to_results",
            sourcePageId: "campus-register",
            targetPageId: "campus-results",
            annotations: [],
        },
    ],
    stateModel: {
        primaryName: "ClubFairState",
        primaryFields: [
            {
                id: "campus-state-search",
                name: "search_query",
                type: "str",
                description: "Current filter text entered on the home page.",
                updatedByPageIds: ["campus-home"],
                updatedByRouteIds: ["campus-home-to-results"],
            },
            {
                id: "campus-state-selected-day",
                name: "selected_meeting_day",
                type: "str",
                description: "Meeting day selected from the result filters.",
                updatedByPageIds: ["campus-results"],
                updatedByRouteIds: ["campus-results-to-register"],
            },
            {
                id: "campus-state-is-member",
                name: "is_returning_member",
                type: "bool",
                description: "Marks whether the student has already joined a club.",
                updatedByPageIds: ["campus-register"],
                updatedByRouteIds: [],
            },
            {
                id: "campus-state-clubs",
                name: "club_cards",
                type: "list[ClubRecord]",
                description: "The club records shown inside the results listing.",
                updatedByPageIds: ["campus-results"],
                updatedByRouteIds: [],
            },
            {
                id: "campus-state-registrations",
                name: "registrations",
                type: "list[RegistrationRecord]",
                description: "Saved registration submissions from the registration form.",
                updatedByPageIds: ["campus-register"],
                updatedByRouteIds: ["campus-register-to-results"],
            },
        ],
        secondaryClasses: [
            {
                id: "campus-club-record",
                name: "ClubRecord",
                description: "Nested data about one club card shown in the directory.",
                linkedPrimaryFieldId: "campus-state-clubs",
                fields: [
                    {
                        id: "campus-club-name",
                        name: "name",
                        type: "str",
                        description: "Club display name.",
                    },
                    {
                        id: "campus-club-category",
                        name: "category",
                        type: "str",
                        description: "Grouping used on the fair directory page.",
                    },
                    {
                        id: "campus-club-open",
                        name: "accepting_members",
                        type: "bool",
                        description: "Whether the club is open to new students.",
                    },
                ],
            },
            {
                id: "campus-registration-record",
                name: "RegistrationRecord",
                description: "Nested data for one submitted registration form.",
                linkedPrimaryFieldId: "campus-state-registrations",
                fields: [
                    {
                        id: "campus-registration-student",
                        name: "student_name",
                        type: "str",
                        description: "Submitted student name.",
                    },
                    {
                        id: "campus-registration-club",
                        name: "club_name",
                        type: "str",
                        description: "Club chosen by the student.",
                    },
                ],
            },
        ],
    },
};

const STUDY_TRACKER_PROJECT: Project = {
    id: "demo-study-tracker",
    name: "Study Tracker",
    description:
        "A course planning site for logging study sessions, rating progress, and reviewing summaries.",
    lastModified: "2026-04-08T18:05:00.000Z",
    pages: [
        {
            id: "study-dashboard",
            name: "Dashboard",
            purpose:
                "Show the current plan summary and branch to logging or reviewing study sessions.",
            x: 110,
            y: 90,
            style: createStyleSettings({
                backgroundColor: "#f5fbff",
                borderColor: "#8ab3cd",
            }),
            components: [
                {
                    id: "study-dashboard-header",
                    type: "Header",
                    content: "Study tracker dashboard",
                    level: 1,
                    style: createStyleSettings({
                        backgroundColor: "#daeef8",
                        borderColor: "#76a7c4",
                    }),
                },
                {
                    id: "study-dashboard-text",
                    type: "Text",
                    content:
                        "Students can branch into a quick study log or open the weekly review page.",
                    style: createStyleSettings(),
                },
                {
                    id: "study-dashboard-review-button",
                    type: "Button",
                    label: "Open review",
                    routeId: "study-dashboard-to-review",
                    style: createStyleSettings({
                        backgroundColor: "#2b6f93",
                        textColor: "#f8fdff",
                        borderColor: "#1e5876",
                        width: "fit-content",
                    }),
                },
                {
                    id: "study-dashboard-log-button",
                    type: "Button",
                    label: "Log session",
                    routeId: "study-dashboard-to-log",
                    style: createStyleSettings({
                        backgroundColor: "#8a532f",
                        textColor: "#fff8f3",
                        borderColor: "#6c3d21",
                        width: "fit-content",
                    }),
                },
            ],
            annotations: [],
        },
        {
            id: "study-log",
            name: "Log Session",
            purpose:
                "Collect study details and update the planned list of sessions.",
            x: 450,
            y: 220,
            style: createStyleSettings({
                backgroundColor: "#fff5ef",
                borderColor: "#c99273",
            }),
            components: [
                {
                    id: "study-log-header",
                    type: "Header",
                    content: "Log a study session",
                    level: 1,
                    style: createStyleSettings({
                        backgroundColor: "#f2dcca",
                        borderColor: "#c89972",
                    }),
                },
                {
                    id: "study-log-course",
                    type: "TextBox",
                    name: "course_code",
                    defaultValue: "CISC275",
                    style: createStyleSettings(),
                },
                {
                    id: "study-log-duration",
                    type: "TextBox",
                    name: "duration_minutes",
                    defaultValue: "45",
                    style: createStyleSettings(),
                },
                {
                    id: "study-log-focus",
                    type: "SelectBox",
                    name: "focus_level",
                    options: ["low", "medium", "high"],
                    defaultValue: "high",
                    style: createStyleSettings(),
                },
                {
                    id: "study-log-save",
                    type: "Button",
                    label: "Save session",
                    routeId: "study-log-to-review",
                    style: createStyleSettings({
                        backgroundColor: "#b26837",
                        textColor: "#fff9f2",
                        borderColor: "#8b4f28",
                        width: "fit-content",
                    }),
                },
            ],
            annotations: [
                {
                    id: "study-log-state",
                    type: "state-change",
                    explanation:
                        "Saving this form appends a new SessionRecord to the session list in state.",
                    relatedStateFieldId: "study-state-sessions",
                    relatedComponentId: "study-log-save",
                },
            ],
        },
        {
            id: "study-review",
            name: "Weekly Review",
            purpose:
                "Summarize the saved sessions, show progress text, and expose weekly decisions.",
            x: 470,
            y: 20,
            style: createStyleSettings({
                backgroundColor: "#f4fff7",
                borderColor: "#7aac8b",
            }),
            components: [
                {
                    id: "study-review-header",
                    type: "Header",
                    content: "Weekly review",
                    level: 1,
                    style: createStyleSettings({
                        backgroundColor: "#d6efde",
                        borderColor: "#7aac8b",
                    }),
                },
                {
                    id: "study-review-summary",
                    type: "Text",
                    content:
                        "This page can show trends, averages, and any follow-up tasks for the next week.",
                    style: createStyleSettings(),
                },
                {
                    id: "study-review-notes",
                    type: "TextArea",
                    name: "reflection_notes",
                    defaultValue: "Need more practice with React testing.",
                    style: createStyleSettings(),
                },
                {
                    id: "study-review-complete",
                    type: "CheckBox",
                    name: "weekly_goal_met",
                    defaultValue: true,
                    style: createStyleSettings(),
                },
            ],
            annotations: [
                {
                    id: "study-review-if",
                    type: "if",
                    explanation:
                        "If the student did not meet the weekly goal, display a follow-up planning message.",
                    relatedStateFieldId: "study-state-goal-met",
                    relatedComponentId: "study-review-complete",
                },
                {
                    id: "study-review-for",
                    type: "for",
                    explanation:
                        "A for loop renders each logged session inside the weekly summary list.",
                    relatedStateFieldId: "study-state-sessions",
                    relatedComponentId: "",
                },
            ],
        },
    ],
    routes: [
        {
            id: "study-dashboard-to-review",
            label: "review_week",
            sourcePageId: "study-dashboard",
            targetPageId: "study-review",
            annotations: [],
        },
        {
            id: "study-dashboard-to-log",
            label: "open_log",
            sourcePageId: "study-dashboard",
            targetPageId: "study-log",
            annotations: [],
        },
        {
            id: "study-log-to-review",
            label: "save_and_review",
            sourcePageId: "study-log",
            targetPageId: "study-review",
            annotations: [
                {
                    id: "study-route-log-if",
                    type: "if",
                    explanation:
                        "If duration_minutes is not numeric, stay on the log page and show validation feedback.",
                    relatedStateFieldId: "study-state-total-minutes",
                    relatedComponentId: "study-log-duration",
                },
            ],
        },
    ],
    stateModel: {
        primaryName: "StudyTrackerState",
        primaryFields: [
            {
                id: "study-state-course",
                name: "selected_course",
                type: "str",
                description: "Course currently being logged or reviewed.",
                updatedByPageIds: ["study-log"],
                updatedByRouteIds: [],
            },
            {
                id: "study-state-total-minutes",
                name: "total_minutes",
                type: "int",
                description: "Running total of the student's logged study time.",
                updatedByPageIds: ["study-review"],
                updatedByRouteIds: ["study-log-to-review"],
            },
            {
                id: "study-state-goal-met",
                name: "goal_met",
                type: "bool",
                description: "Indicates whether the student completed the planned goal.",
                updatedByPageIds: ["study-review"],
                updatedByRouteIds: [],
            },
            {
                id: "study-state-sessions",
                name: "sessions",
                type: "list[SessionRecord]",
                description: "All saved study sessions recorded by the student.",
                updatedByPageIds: ["study-log", "study-review"],
                updatedByRouteIds: ["study-log-to-review"],
            },
        ],
        secondaryClasses: [
            {
                id: "study-session-record",
                name: "SessionRecord",
                description: "One saved study session.",
                linkedPrimaryFieldId: "study-state-sessions",
                fields: [
                    {
                        id: "study-session-course",
                        name: "course_code",
                        type: "str",
                        description: "Course label for the session.",
                    },
                    {
                        id: "study-session-duration",
                        name: "duration_minutes",
                        type: "int",
                        description: "Number of minutes logged.",
                    },
                    {
                        id: "study-session-focus",
                        name: "focus_level",
                        type: "str",
                        description: "Student self-rating for focus.",
                    },
                ],
            },
        ],
    },
};

const DEMO_PROJECTS: Project[] = [CAMPUS_CLUB_PROJECT, STUDY_TRACKER_PROJECT];

export function createDemoProjects(): Project[] {
    return DEMO_PROJECTS.map((project) => ({
        ...project,
        pages: project.pages.map((page) => ({
            ...page,
            style: { ...page.style },
            components: page.components.map((component) => ({
                ...component,
                style: { ...component.style },
                ...(component.type === "SelectBox"
                    ? { options: [...component.options] }
                    : {}),
            })),
            annotations: page.annotations.map((annotation) => ({
                ...annotation,
            })),
        })),
        routes: project.routes.map((route) => ({
            ...route,
            annotations: route.annotations.map((annotation) => ({
                ...annotation,
            })),
        })),
        stateModel: {
            ...project.stateModel,
            primaryFields: project.stateModel.primaryFields.map((field) => ({
                ...field,
                updatedByPageIds: [...field.updatedByPageIds],
                updatedByRouteIds: [...field.updatedByRouteIds],
            })),
            secondaryClasses: project.stateModel.secondaryClasses.map(
                (secondaryClass) => ({
                    ...secondaryClass,
                    fields: secondaryClass.fields.map((field) => ({
                        ...field,
                    })),
                }),
            ),
        },
    }));
}
