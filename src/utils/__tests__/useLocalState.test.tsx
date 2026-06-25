import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLocalState } from "../useLocalState";

interface CounterProps {
  eventName?: string;
}

function Counter({ eventName }: CounterProps) {
  const [value, setValue] = useLocalState<{ count: number }>("hook-key", () => ({ count: 1 }), eventName);

  return (
    <button onClick={() => setValue({ count: value.count + 1 })} type="button">
      {value.count}
    </button>
  );
}

describe("useLocalState", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("initializes from fallback and writes through the shared storage event path", async () => {
    const listener = vi.fn();
    window.addEventListener("hook-change", listener);

    render(<Counter eventName="hook-change" />);

    expect(screen.getByRole("button").textContent).toBe("1");
    await waitFor(() => expect(listener).toHaveBeenCalledTimes(1));
    listener.mockClear();

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem("hook-key") || "{}")).toEqual({ count: 2 });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    window.removeEventListener("hook-change", listener);
  });
});
