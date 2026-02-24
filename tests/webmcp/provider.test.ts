/**
 * WebMCP tool schema validation tests - February 17, 2026
 *
 * Validates WebMCP tool schemas for protocol compliance.
 * CI gate: WebMCP tool schema validation.
 */

import { WEBMCP_TOOL_SCHEMAS } from "@/lib/webmcp/provider"

describe("WebMCP Tool Schema Validation", () => {
  it("exports all expected tools", () => {
    const names = WEBMCP_TOOL_SCHEMAS.map((t) => t.name)
    expect(names).toContain("mycosoft_run_search")
    expect(names).toContain("mycosoft_focus_widget")
    expect(names).toContain("mycosoft_add_notepad_item")
    expect(names).toContain("mycosoft_read_page_context")
    expect(names).toContain("mycosoft_safe_navigate")
    expect(names).toHaveLength(5)
  })

  it("each tool has name, description, inputSchema", () => {
    for (const tool of WEBMCP_TOOL_SCHEMAS) {
      expect(typeof tool.name).toBe("string")
      expect(tool.name.length).toBeGreaterThan(0)
      expect(tool.name).toMatch(/^mycosoft_/)
      expect(typeof tool.description).toBe("string")
      expect(tool.description.length).toBeGreaterThan(0)
      expect(tool.inputSchema).toBeDefined()
      expect(typeof tool.inputSchema).toBe("object")
    }
  })

  it("inputSchema has type object and properties", () => {
    for (const tool of WEBMCP_TOOL_SCHEMAS) {
      expect(tool.inputSchema.type).toBe("object")
      expect(tool.inputSchema.properties).toBeDefined()
      expect(typeof tool.inputSchema.properties).toBe("object")
    }
  })

  it("required array references valid property names when present", () => {
    for (const tool of WEBMCP_TOOL_SCHEMAS) {
      const required = tool.inputSchema.required as string[] | undefined
      if (required) {
        expect(Array.isArray(required)).toBe(true)
        const props = tool.inputSchema.properties as Record<string, unknown>
        for (const r of required) {
          expect(props[r]).toBeDefined()
        }
      }
    }
  })

  it("no dangerous patterns in schema (eval, exec, __proto__)", () => {
    const str = JSON.stringify(WEBMCP_TOOL_SCHEMAS)
    expect(str).not.toMatch(/\beval\s*\(/)
    expect(str).not.toMatch(/\bexec\s*\(/)
    expect(str).not.toMatch(/__proto__/)
  })
})
