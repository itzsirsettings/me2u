const body: any = {};
const route = typeof body.route === "string" ? body.route.slice(0, 160) : undefined;
const probe: null = route;
export { probe };
