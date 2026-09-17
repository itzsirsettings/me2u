import { defineRailway, project, service } from "railway/iac";

export default defineRailway(() => {
  const me2u = service("me2u", {
    builder: "NIXPACKS",
    build: "npm run build",
    start: "npm start",
    healthcheck: "/api/health/live",
    healthcheckTimeout: 100,
  });
  return project("me2u", {
    resources: [me2u],
  });
});
