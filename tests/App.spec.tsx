import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { App } from "../src/App";

beforeEach(() => {
    localStorage.clear();
    window.location.hash = "#/dashboard";
});

test("renders the planner dashboard controls", () => {
    render(<App />);

    expect(
        screen.getByRole("heading", {
            name: /plan pages, routes, state, and exports in one workspace/i,
        }),
    ).toBeInTheDocument();
    expect(
        screen.getByRole("button", { name: /new project/i }),
    ).toBeInTheDocument();
    expect(
        screen.getByRole("button", { name: /load campus club fair/i }),
    ).toBeInTheDocument();
});

test("creates a new project and opens the project workspace", async () => {
    render(<App />);

    await userEvent.click(screen.getByRole("button", { name: /new project/i }));

    await waitFor(() => {
        expect(
            screen.getByRole("heading", { name: /untitled planner 1/i }),
        ).toBeInTheDocument();
    });
    expect(
        screen.getByRole("button", { name: /back to dashboard/i }),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue(/untitled planner 1/i)).toBeInTheDocument();
});

test("loads a demo project and shows its project overview", async () => {
    render(<App />);

    await userEvent.click(
        screen.getByRole("button", { name: /load campus club fair/i }),
    );

    await waitFor(() => {
        expect(
            screen.getByRole("heading", { name: /campus club fair/i }),
        ).toBeInTheDocument();
    });
    expect(
        screen.getByDisplayValue(/campus club fair/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/pages and routes/i)).toBeInTheDocument();
});
