import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LocaleProvider } from "../../../web/i18n";
import { Footer } from "../../../web/components/Footer";

describe("Footer", () => {
  it("shows the install command and key promo links", () => {
    const { container } = render(
      <LocaleProvider>
        <Footer />
      </LocaleProvider>,
    );

    expect(container.textContent).toContain("npm install commitcourier");
    expect(screen.getByRole("link", { name: /star on github/i })).toHaveAttribute(
      "href",
      "https://github.com/Y1-Effy/CommitCourier",
    );
    expect(screen.getByRole("img", { name: /npm version/i })).toBeInTheDocument();
  });
});
