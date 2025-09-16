import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const SERVER_PATH = "../../env.server";

async function loadServer() {
  vi.resetModules();
  return await import(SERVER_PATH);
}

const SNAP = { ...process.env };

function setProdBase() {
  process.env.NODE_ENV = "production";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
  process.env.RATE_LIMITING = "disabled";
  delete process.env.ENABLE_AI_PROCESSING;
}

describe("env.server (production)", () => {
  beforeEach(() => {
    process.env = { ...SNAP };
    setProdBase();
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.LOG_SALT;
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => (process.env = SNAP));

  it("requires NEXT_PUBLIC_APP_URL in production", async () => {
    await expect(loadServer()).rejects.toThrow(/NEXT_PUBLIC_APP_URL.*required/i);
  });

  it("requires secure LOG_SALT in production", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
    process.env.LOG_SALT = "short";
    await expect(loadServer()).rejects.toThrow(/LOG_SALT.*(secure|>=\s*16)/i);
  });

  it("requires OPENAI_API_KEY when ENABLE_AI_PROCESSING=true", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
    process.env.LOG_SALT = "this-is-a-long-secure-salt";
    process.env.ENABLE_AI_PROCESSING = "true";
    delete process.env.OPENAI_API_KEY;
    await expect(loadServer()).rejects.toThrow(/OPENAI_API_KEY.*required/i);
  });

  it("requires Upstash creds when RATE_LIMITING=enabled", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
    process.env.LOG_SALT = "this-is-a-long-secure-salt";
    process.env.RATE_LIMITING = "enabled";
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    await expect(loadServer()).rejects.toThrow(/Rate limiting.*UPSTASH/i);
  });

  it("does not require Upstash when RATE_LIMITING=disabled", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
    process.env.LOG_SALT = "this-is-a-long-secure-salt";
    process.env.RATE_LIMITING = "disabled";
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    const mod = await loadServer();
    expect(mod.envServer.ENABLE_RATE_LIMITING).toBe(false);
  });

  it("normalizes APP_ORIGIN from NEXT_PUBLIC_APP_URL", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com/some/path";
    process.env.LOG_SALT = "this-is-a-long-secure-salt";
    const mod = await loadServer();
    expect(mod.envServer.APP_ORIGIN).toBe("https://app.example.com");
  });

  it("passes with all required prod vars", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
    process.env.LOG_SALT = "this-is-a-long-secure-salt";
    process.env.ENABLE_AI_PROCESSING = "false";
    const mod = await loadServer();
    expect(mod.envServer.NEXT_PUBLIC_APP_URL).toBe("https://app.example.com");
  });

  it("throws if imported in a browser bundle", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
    process.env.LOG_SALT = "this-is-a-long-secure-salt";
    // @ts-expect-error test-only
    global.window = {};
    await expect(loadServer()).rejects.toThrow(/env\.server was imported in a browser bundle/i);
    // @ts-expect-error test-only
    delete global.window;
  });
});

describe("env.server (development)", () => {
  beforeEach(() => {
    process.env = { ...SNAP };
    process.env.NODE_ENV = "development";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
    delete process.env.NEXT_PUBLIC_APP_URL; // should default
    delete process.env.ENABLE_AI_PROCESSING;
  });

  afterEach(() => (process.env = SNAP));

  it("defaults APP_URL to localhost in dev", async () => {
    const mod = await loadServer();
    expect(mod.envServer.NEXT_PUBLIC_APP_URL).toMatch(/^http:\/\/localhost:3000/);
  });

  it("allows missing OPENAI_API_KEY in dev", async () => {
    delete process.env.OPENAI_API_KEY;
    process.env.ENABLE_AI_PROCESSING = "false";
    const mod = await loadServer();
    expect(mod.envServer.OPENAI_API_KEY).toBeNull();
  });

  it("uses dev salt when LOG_SALT not provided", async () => {
    delete process.env.LOG_SALT;
    const mod = await loadServer();
    expect(mod.envServer.LOG_SALT).toBe("dev-salt");
  });
});

describe("env.server (test)", () => {
  beforeEach(() => {
    process.env = { ...SNAP };
    process.env.NODE_ENV = "test";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
    delete process.env.ENABLE_AI_PROCESSING;
  });

  afterEach(() => (process.env = SNAP));

  it("uses test defaults", async () => {
    const mod = await loadServer();
    expect(mod.envServer.NODE_ENV).toBe("test");
    expect(mod.envServer.LOG_SALT).toBe("dev-salt");
  });
});