import { defineConfig } from "orval"

export default defineConfig({
  api: {
    input: {
      target: "./openapi.json",
    },
    output: {
      mode: "tags-split",
      target: "src/api/generated",
      schemas: "src/api/model",
      client: "react-query",
      httpClient: "fetch",
      clean: true,
    },
  },
  apiZod: {
    input: {
      target: "./openapi.json",
    },
    output: {
      mode: "tags-split",
      client: "zod",
      target: "src/api/generated",
      fileExtension: ".zod.ts",
    },
  },
})
