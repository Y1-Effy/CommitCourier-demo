import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LocaleProvider } from "../i18n";
import { LocaleToggle } from "./LocaleToggle";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("lang");
});

describe("LocaleToggle", () => {
  it("renders both languages with English pressed by default", () => {
    render(
      <LocaleProvider>
        <LocaleToggle />
      </LocaleProvider>,
    );
    expect(screen.getByRole("button", { name: "EN" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "日本語" })).toHaveAttribute("aria-pressed", "false");
  });

  it("switches the active language on click", () => {
    render(
      <LocaleProvider>
        <LocaleToggle />
      </LocaleProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "日本語" }));

    expect(screen.getByRole("button", { name: "日本語" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "EN" })).toHaveAttribute("aria-pressed", "false");
    expect(localStorage.getItem("cc-locale")).toBe("ja");
  });
});
