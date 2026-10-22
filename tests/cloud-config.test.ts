import { describe, it, expect } from "vitest";
import { validateCloudConfig } from "../src/cloud/client";
const token = (role: string) =>
  `eyJhbGciOiJIUzI1NiJ9.${btoa(JSON.stringify({ role }))}.test`;
describe("public cloud configuration", () => {
  it("accepts publishable and legacy anonymous keys", () => {
    expect(
      validateCloudConfig({
        url: "https://project.supabase.co/",
        publishableKey: "sb_publishable_public",
      }),
    ).toEqual({
      url: "https://project.supabase.co",
      publishableKey: "sb_publishable_public",
    });
    expect(
      validateCloudConfig({
        url: "https://project.supabase.co",
        publishableKey: token("anon"),
      }),
    ).not.toBeNull();
  });
  it("rejects privileged keys", () => {
    expect(
      validateCloudConfig({
        url: "https://project.supabase.co",
        publishableKey: "sb_secret_do_not_publish",
      }),
    ).toBeNull();
    expect(
      validateCloudConfig({
        url: "https://project.supabase.co",
        publishableKey: token("service_role"),
      }),
    ).toBeNull();
  });
  it("rejects non-TLS destinations and URLs containing credentials or paths", () => {
    for (const url of [
      "http://project.supabase.co",
      "https://user:password@project.supabase.co",
      "https://project.supabase.co/auth",
      "javascript:alert(1)",
    ])
      expect(
        validateCloudConfig({ url, publishableKey: "sb_publishable_public" }),
      ).toBeNull();
  });
});
