import { describe, expect, it } from "vitest";
import { assertSafeWebhookUrl, isPrivateAddress, sign } from "./webhooks";

describe("webhook signing", () => {
  it("is deterministic and depends on timestamp, body and secret", () => {
    const a = sign("s", 1700000000, '{"a":1}');
    expect(a).toBe(sign("s", 1700000000, '{"a":1}'));
    expect(a).not.toBe(sign("s", 1700000001, '{"a":1}'));
    expect(a).not.toBe(sign("s", 1700000000, '{"a":2}'));
    expect(a).not.toBe(sign("t", 1700000000, '{"a":1}'));
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("SSRF guard", () => {
  it("flags private, loopback and link-local addresses", () => {
    for (const ip of ["10.0.0.1", "127.0.0.1", "192.168.1.5", "172.16.3.1", "169.254.169.254", "::1", "fe80::1", "fd00::1", "::ffff:10.0.0.1", "100.64.0.1"]) expect(isPrivateAddress(ip), ip).toBe(true);
    for (const ip of ["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"]) expect(isPrivateAddress(ip), ip).toBe(false);
  });
  it("rejects non-https, credentials and private literals", async () => {
    process.env.NEXT_PUBLIC_APP_ENV = "production";
    await expect(assertSafeWebhookUrl("http://example.com/x")).rejects.toThrow();
    await expect(assertSafeWebhookUrl("https://user:pw@example.com/x")).rejects.toThrow();
    await expect(assertSafeWebhookUrl("https://169.254.169.254/latest/meta-data")).rejects.toThrow();
    await expect(assertSafeWebhookUrl("https://10.1.2.3/hook")).rejects.toThrow();
    await expect(assertSafeWebhookUrl("https://8.8.8.8/hook")).resolves.toBeInstanceOf(URL);
    delete process.env.NEXT_PUBLIC_APP_ENV;
  });
});
