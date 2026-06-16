import { describe, it, expect } from "vitest";
import {
  highlightSignals,
  buildOutlookComposeUrl,
  buildGmailComposeUrl,
} from "./outreach-highlight";

describe("highlightSignals", () => {
  it("returns a single unsignalled segment when no signals match", () => {
    expect(highlightSignals("hello world", ["Goldman"])).toEqual([
      { text: "hello world", signal: false },
    ]);
  });

  it("returns [] for empty text", () => {
    expect(highlightSignals("", ["UNC"])).toEqual([]);
  });

  it("marks a matching term and keeps surrounding text", () => {
    const segs = highlightSignals("I'm a UNC student", ["UNC"]);
    expect(segs).toEqual([
      { text: "I'm a ", signal: false },
      { text: "UNC", signal: true },
      { text: " student", signal: false },
    ]);
  });

  it("is case-insensitive but preserves original casing", () => {
    const segs = highlightSignals("a chi phi brother", ["Chi Phi"]);
    expect(segs.find((s) => s.signal)?.text).toBe("chi phi");
  });

  it("prefers the longest signal on overlap (Goldman Sachs over Goldman)", () => {
    const segs = highlightSignals("works at Goldman Sachs now", [
      "Goldman",
      "Goldman Sachs",
    ]);
    expect(segs.find((s) => s.signal)?.text).toBe("Goldman Sachs");
    expect(segs.filter((s) => s.signal)).toHaveLength(1);
  });

  it("does not match mid-word", () => {
    const segs = highlightSignals("uncomfortable", ["unc"]);
    expect(segs).toEqual([{ text: "uncomfortable", signal: false }]);
  });

  it("highlights multiple distinct signals in order", () => {
    const segs = highlightSignals("UNC and Chi Phi", ["UNC", "Chi Phi"]);
    expect(segs.filter((s) => s.signal).map((s) => s.text)).toEqual([
      "UNC",
      "Chi Phi",
    ]);
  });

  it("ignores blank / single-char signals", () => {
    expect(highlightSignals("a b c", ["", " ", "a"])).toEqual([
      { text: "a b c", signal: false },
    ]);
  });
});

describe("compose URL builders", () => {
  it("builds an Outlook compose URL with encoded fields", () => {
    const url = buildOutlookComposeUrl({
      to: "riley@gs.com",
      subject: "Coffee chat?",
      body: "Hi Riley & team",
    });
    expect(url).toContain("https://outlook.office.com/mail/deeplink/compose?");
    expect(url).toContain("to=riley%40gs.com");
    expect(url).toContain("subject=Coffee+chat%3F");
    expect(url).toContain("body=Hi+Riley+%26+team");
  });

  it("builds a Gmail compose URL with su + body", () => {
    const url = buildGmailComposeUrl({
      to: "riley@gs.com",
      subject: "Hello",
      body: "Body",
    });
    expect(url).toContain("https://mail.google.com/mail/?");
    expect(url).toContain("view=cm");
    expect(url).toContain("su=Hello");
    expect(url).toContain("to=riley%40gs.com");
  });

  it("allows a blank recipient", () => {
    expect(buildOutlookComposeUrl({ to: "", subject: "S", body: "B" })).not.toContain(
      "to=",
    );
    expect(buildGmailComposeUrl({ to: "", subject: "S", body: "B" })).not.toContain(
      "to=",
    );
  });
});
