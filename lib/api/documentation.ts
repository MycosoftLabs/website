import { knowledgeGraphSchema } from "@/lib/schema/knowledge-graph"

/**
 * Generate OpenAPI documentation for the Mycosoft API
 * @returns OpenAPI specification as a JavaScript object
 */
export function generateOpenApiSpec() {
  const spec = {
    openapi: "3.0.0",
    info: {
      title: "Mycosoft API",
      description: "API for accessing the Mycosoft knowledge graph and fungal database",
      version: "1.0.0",
      contact: {
        name: "Mycosoft Support",
        url: "https://mycosoft.com/support",
        email: "support@mycosoft.com",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: "https://mycosoft.com/api",
        description: "Production server",
      },
      {
        url: "https://staging.mycosoft.com/api",
        description: "Staging server",
      },
    ],
    paths: {
      "/gateway": {
        get: {
          summary: "Gateway API for multi-agent access",
          description: "Access various Mycosoft APIs through a unified gateway",
          parameters: [
            {
              name: "endpoint",
              in: "query",
              required: true,
              schema: {
                type: "string",
                enum: ["species", "compounds", "search"],
              },
              description: "The endpoint to access",
            },
            {
              name: "x-api-key",
              in: "header",
              required: true,
              schema: {
                type: "string",
              },
              description: "API key for authentication",
            },
            {
              name: "x-agent-id",
              in: "header",
              required: false,
              schema: {
                type: "string",
              },
              description: "Identifier for the agent making the request",
            },
          ],
          responses: {
            "200": {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                  },
                },
              },
            },
            "400": {
              description: "Bad request",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      error: {
                        type: "string",
                      },
                    },
                  },
                },
              },
            },
            "401": {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      error: {
                        type: "string",
                      },
                    },
                  },
                },
              },
            },
            "500": {
              description: "Internal server error",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      error: {
                        type: "string",
                      },
                      message: {
                        type: "string",
                      },
                      timestamp: {
                        type: "string",
                        format: "date-time",
                      },
                      requestId: {
                        type: "string",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          summary: "Gateway API for multi-agent access (POST)",
          description: "Access various Mycosoft APIs through a unified gateway using POST",
          parameters: [
            {
              name: "endpoint",
              in: "query",
              required: true,
              schema: {
                type: "string",
                enum: ["species", "compounds", "search"],
              },
              description: "The endpoint to access",
            },
            {
              name: "x-api-key",
              in: "header",
              required: true,
              schema: {
                type: "string",
              },
              description: "API key for authentication",
            },
            {
              name: "x-agent-id",
              in: "header",
              required: false,
              schema: {
                type: "string",
              },
              description: "Identifier for the agent making the request",
            },
          ],
          requestBody: {
            description: "Request payload",
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                  },
                },
              },
            },
            "400": {
              description: "Bad request",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      error: {
                        type: "string",
                      },
                    },
                  },
                },
              },
            },
            "401": {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      error: {
                        type: "string",
                      },
                    },
                  },
                },
              },
            },
            "500": {
              description: "Internal server error",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      error: {
                        type: "string",
                      },
                      message: {
                        type: "string",
                      },
                      timestamp: {
                        type: "string",
                        format: "date-time",
                      },
                      requestId: {
                        type: "string",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/species": {
        get: {
          summary: "Get species information",
          description: "Retrieve information about fungal species",
          parameters: [
            {
              name: "id",
              in: "query",
              required: false,
              schema: {
                type: "string",
              },
              description: "Species ID to retrieve a specific species",
            },
            {
              name: "search",
              in: "query",
              required: false,
              schema: {
                type: "string",
              },
              description: "Search term to filter species",
            },
            {
              name: "sort",
              in: "query",
              required: false,
              schema: {
                type: "string",
                enum: ["scientific_name", "common_name", "family"],
              },
              description: "Field to sort results by",
            },
            {
              name: "page",
              in: "query",
              required: false,
              schema: {
                type: "integer",
                default: 1,
              },
              description: "Page number for pagination",
            },
            {
              name: "limit",
              in: "query",
              required: false,
              schema: {
                type: "integer",
                default: 9,
              },
              description: "Number of results per page",
            },
          ],
          responses: {
            "200": {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      species: {
                        type: "array",
                        items: {
                          type: "object",
                        },
                      },
                      total: {
                        type: "integer",
                      },
                      page: {
                        type: "integer",
                      },
                      limit: {
                        type: "integer",
                      },
                      totalPages: {
                        type: "integer",
                      },
                    },
                  },
                },
              },
            },
            "404": {
              description: "Species not found",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      error: {
                        type: "string",
                      },
                    },
                  },
                },
              },
            },
            "500": {
              description: "Internal server error",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      error: {
                        type: "string",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        // Generate schemas from knowledge graph
        ...Object.entries(knowledgeGraphSchema.nodes).reduce((schemas, [nodeType, definition]) => {
          const properties = Object.entries(definition.properties).reduce((props, [propName, propDef]) => {
            return {
              ...props,
              [propName]: {
                type: propDef.type === "array" ? "array" : "string",
                description: propDef.description,
              },
            }
          }, {})

          return {
            ...schemas,
            [nodeType]: {
              type: "object",
              properties,
            },
          }
        }, {}),
      },
      securitySchemes: {
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "x-api-key",
        },
      },
    },
    security: [
      {
        ApiKeyAuth: [],
      },
    ],
  }

  return spec
}

/**
 * Generate API documentation in HTML format
 * @returns HTML string with API documentation
 */
export function generateHtmlDocumentation() {
  const spec = generateOpenApiSpec()

  // This is a simplified HTML generator
  // In a real implementation, you might use a library like Swagger UI

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${spec.info.title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3, h4 {
      color: #0070f3;
    }
    .endpoint {
      margin-bottom: 30px;
      border: 1px solid #eaeaea;
      border-radius: 5px;
      padding: 20px;
    }
    .method {
      display: inline-block;
      padding: 5px 10px;
      border-radius: 4px;
      color: white;
      font-weight: bold;
      margin-right: 10px;
    }
    .get { background-color: #61affe; }
    .post { background-color: #49cc90; }
    .put { background-color: #fca130; }
    .delete { background-color: #f93e3e; }
    .path {
      font-family: monospace;
      font-size: 1.2em;
    }
    .params {
      margin-top: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      text-align: left;
      padding: 8px;
      border-bottom: 1px solid #eaeaea;
    }
    th {
      background-color: #f7f7f7;
    }
    .response {
      margin-top: 20px;
    }
    .schema {
      background-color: #f7f7f7;
      padding: 10px;
      border-radius: 4px;
      font-family: monospace;
      white-space: pre-wrap;
    }
  </style>
</head>
<body>
  <h1>${spec.info.title}</h1>
  <p>${spec.info.description}</p>
  <h2>API Version: ${spec.info.version}</h2>
  
  <h2>Servers</h2>
  <ul>
    ${spec.servers
      .map(
        (server) => `
      <li><strong>${server.description}</strong>: ${server.url}</li>
    `,
      )
      .join("")}
  </ul>
  
  <h2>Endpoints</h2>
  ${Object.entries(spec.paths)
    .map(
      ([path, methods]) => `
    <div class="endpoint">
      <h3 class="path">${path}</h3>
      
      ${Object.entries(methods)
        .map(
          ([method, details]) => `
        <div>
          <span class="method ${method}">${method.toUpperCase()}</span>
          <span>${details.summary}</span>
          <p>${details.description}</p>
          
          ${
            details.parameters && details.parameters.length > 0
              ? `
            <div class="params">
              <h4>Parameters</h4>
              <table>
                <tr>
                  <th>Name</th>
                  <th>In</th>
                  <th>Required</th>
                  <th>Description</th>
                </tr>
                ${details.parameters
                  .map(
                    (param) => `
                  <tr>
                    <td>${param.name}</td>
                    <td>${param.in}</td>
                    <td>${param.required ? "Yes" : "No"}</td>
                    <td>${param.description}</td>
                  </tr>
                `,
                  )
                  .join("")}
              </table>
            </div>
          `
              : ""
          }
          
          ${
            details.requestBody
              ? `
            <div class="params">
              <h4>Request Body</h4>
              <p>${details.requestBody.description}</p>
              <div class="schema">
                ${JSON.stringify(details.requestBody.content["application/json"].schema, null, 2)}
              </div>
            </div>
          `
              : ""
          }
          
          <div class="response">
            <h4>Responses</h4>
            ${Object.entries(details.responses)
              .map(
                ([code, response]) => `
              <div>
                <h5>${code}: ${response.description}</h5>
                ${
                  response.content
                    ? `
                  <div class="schema">
                    ${JSON.stringify(response.content["application/json"].schema, null, 2)}
                  </div>
                `
                    : ""
                }
              </div>
            `,
              )
              .join("")}
          </div>
        </div>
      `,
        )
        .join("")}
    </div>
  `,
    )
    .join("")}
  
  <h2>Data Models</h2>
  ${Object.entries(spec.components.schemas)
    .map(
      ([name, schema]) => `
    <div class="endpoint">
      <h3>${name}</h3>
      <div class="schema">
        ${JSON.stringify(schema, null, 2)}
      </div>
    </div>
  `,
    )
    .join("")}
  
  <footer>
    <p>Contact: <a href="mailto:${spec.info.contact.email}">${spec.info.contact.email}</a></p>
    <p>License: <a href="${spec.info.license.url}">${spec.info.license.name}</a></p>
  </footer>
</body>
</html>
  `

  return html
}
