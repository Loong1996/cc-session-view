import { apiHandlers } from "./api/handlers"
import index from "./web/index.html"

const PORT = 3456

export function startServer() {
  const server = Bun.serve({
    port: PORT,
    routes: {
      "/": index,
      "/api/sessions": {
        GET: apiHandlers.getSessions,
      },
      "/api/sessions/branch": {
        GET: apiHandlers.getSessionsByBranch,
      },
      "/api/sessions/:agentType/:sessionId": {
        GET: apiHandlers.getSessionDetail,
      },
      "/api/projects": {
        GET: apiHandlers.getProjects,
      },
      "/api/export": {
        POST: apiHandlers.exportSession,
      },
      "/api/export/branch": {
        POST: apiHandlers.exportBranch,
      },
    },
    development: {
      hmr: true,
      console: true,
    },
  })

  console.log(`🐰 Agent Session Viewer running at http://localhost:${server.port}`)
}
