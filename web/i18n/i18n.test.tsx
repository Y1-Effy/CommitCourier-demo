import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { LocaleProvider, useLocale, useStatusLabel } from "./index";

function wrapper({ children }: { children: ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("lang");
});

describe("LocaleProvider + useStatusLabel", () => {
  it("defaults to English and localizes status labels", () => {
    const { result } = renderHook(() => ({ label: useStatusLabel(), ctx: useLocale() }), {
      wrapper,
    });
    expect(result.current.ctx.locale).toBe("en");
    expect(result.current.label("delivered")).toBe("delivered");
    expect(result.current.label("in_flight")).toBe("in flight");
  });

  it("switches to Japanese and updates labels, <html lang> and localStorage", () => {
    const { result } = renderHook(() => ({ label: useStatusLabel(), ctx: useLocale() }), {
      wrapper,
    });

    act(() => result.current.ctx.setLocale("ja"));

    expect(result.current.ctx.locale).toBe("ja");
    expect(result.current.label("delivered")).toBe("配信済み");
    expect(document.documentElement.lang).toBe("ja");
    expect(localStorage.getItem("cc-locale")).toBe("ja");
  });

  it("falls back to the raw key for unknown statuses", () => {
    const { result } = renderHook(() => useStatusLabel(), { wrapper });
    expect(result.current("something_else")).toBe("something else");
  });
});
