import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { TERMS_MD } from "@/lib/legal/terms";
import { Markdown } from "@/lib/ui/Markdown";

describe("Markdown for the legal pages", () => {
  test("renders headings, lists, tables and emphasis, and never passes HTML through", () => {
    const html = renderToStaticMarkup(<Markdown text={"# Title\n\n- **Bold** item\n- *soft*\n\n1. One\n2. Two\n\n| A | B |\n| --- | --- |\n| x | y |\n\n<script>alert(1)</script>"} />);
    expect(html).toContain("<h1");
    expect(html).toContain("<ul");
    expect(html).toContain("<strong>Bold</strong>");
    expect(html).toContain("<ol");
    expect(html).toContain("<table");
    expect(html).toContain("&lt;script&gt;");
  });

  test("the terms render every section", () => {
    const html = renderToStaticMarkup(<Markdown text={TERMS_MD} />);
    for (let n = 1; n <= 8; n++) expect(html).toMatch(new RegExp(`<h2[^>]*>${n}\\. `));
  });
});
