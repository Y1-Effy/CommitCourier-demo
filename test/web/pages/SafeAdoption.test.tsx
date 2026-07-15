import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { LocaleProvider } from "../../../web/i18n";
import { SafeAdoption } from "../../../web/pages/SafeAdoption";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

function renderPage() {
  return render(
    <LocaleProvider>
      <SafeAdoption />
    </LocaleProvider>,
  );
}

describe("SafeAdoption", () => {
  it("renders the English title, central message and honest framing", () => {
    const { container } = renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: /Built for Safe Adoption/i }),
    ).toBeInTheDocument();
    // central message + observe-first + the honest at-least-once note must be present
    expect(container.textContent).toContain("Back out cleanly if it isn't for you.");
    expect(container.textContent).toContain("Observe it first");
    expect(container.textContent).toContain("at-least-once");
  });

  it("points the security report button at the private advisory channel", () => {
    renderPage();
    expect(screen.getByRole("link", { name: /Report a security issue/i })).toHaveAttribute(
      "href",
      "https://github.com/Y1-Effy/CommitCourier/security/advisories",
    );
  });

  it("switches to Japanese copy when the locale is ja", () => {
    localStorage.setItem("cc-locale", "ja");
    const { container } = renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: /安心して試すための設計/ }),
    ).toBeInTheDocument();
    expect(container.textContent).toContain("すぐ入る。送らず試せる。合わなければ、すぐ戻せる。");
  });
});
