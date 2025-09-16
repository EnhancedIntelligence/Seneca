import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const CLIENT_PATH = "../../env.client";

async function loadClient() {
  vi.resetModules();
  return await import(CLIENT_PATH);
}

const SNAP = { ...process.env };

function setClientBase() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
}

describe("env.client", () => {
  beforeEach(() => {
    process.env = { ...SNAP };
    setClientBase();
  });

  afterEach(() => (process.env = SNAP));

  it("rejects invalid Supabase URL", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "not-a-url";
    process.env.NODE_ENV = "development";
    await expect(loadClient()).rejects.toThrow("Environment validation failed (client).");
  });

  it("requires anon key", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "";
    process.env.NODE_ENV = "development";
    await expect(loadClient()).rejects.toThrow("Environment validation failed (client).");
  });

  it("defaults APP_URL in dev", async () => {
    process.env.NODE_ENV = "development";
    delete process.env.NEXT_PUBLIC_APP_URL;
    const mod = await loadClient();
    expect(mod.envClient.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
  });

  it("requires APP_URL in prod", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.NEXT_PUBLIC_APP_URL;
    await expect(loadClient()).rejects.toThrow("Environment validation failed (client).");
  });

  it("normalizes APP_ORIGIN from NEXT_PUBLIC_APP_URL", async () => {
    process.env.NODE_ENV = "development";
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com/some/path?query=1";
    const mod = await loadClient();
    expect(mod.envClient.APP_ORIGIN).toBe("https://app.example.com");
  });

  it("handles localhost URLs in development", async () => {
    process.env.NODE_ENV = "development";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    const mod = await loadClient();
    expect(mod.envClient.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
    expect(mod.envClient.APP_ORIGIN).toBe("http://localhost:3000");
  });

  it("exports environment mode helpers", async () => {
    process.env.NODE_ENV = "development";
    const mod = await loadClient();
    expect(mod.envClient.IS_DEV).toBe(true);
    expect(mod.envClient.IS_PROD).toBe(false);
    expect(mod.envClient.NODE_ENV).toBe("development");
  });

  it("freezes the client env object", async () => {
    process.env.NODE_ENV = "development";
    const mod = await loadClient();
    expect(Object.isFrozen(mod.envClient)).toBe(true);
  });

  it("warns on origin mismatch in prod", async () => {
    // @ts-expect-error test-only
    global.window = {
      location: { origin: "https://other.example.com" },
      console: { error: vi.fn() }
    };
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await loadClient();
    expect(spy).toHaveBeenCalledWith(
      expect.stringMatching(/APP origin mismatch/),
      expect.stringMatching(/Fix NEXT_PUBLIC_APP_URL/)
    );
    spy.mockRestore();
    // @ts-expect-error test-only
    delete global.window;
  });

  it("does not warn when origins match in prod", async () => {
    // @ts-expect-error test-only
    global.window = {
      location: { origin: "https://app.example.com" }
    };
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await loadClient();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
    // @ts-expect-error test-only
    delete global.window;
  });
});