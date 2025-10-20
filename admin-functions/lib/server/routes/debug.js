export function registerDebugRoutes(app, apiPrefix, isCloudFunction) {
    // Debug route to list all registered routes
    app.get(`${apiPrefix}/debug/routes`, (req, res) => {
        const routes = [];
        function extractRoutes(app) {
            if (!app._router || !app._router.stack)
                return [];
            app._router.stack.forEach((middleware) => {
                if (middleware.route) {
                    const path = middleware.route.path;
                    const methods = Object.keys(middleware.route.methods)
                        .filter((method) => middleware.route.methods[method])
                        .map((method) => method.toUpperCase());
                    routes.push({ path, methods });
                }
                else if (middleware.name === 'router' && middleware.handle.stack) {
                    middleware.handle.stack.forEach((handler) => {
                        if (handler.route) {
                            const path = handler.route.path;
                            const methods = Object.keys(handler.route.methods)
                                .filter((method) => handler.route.methods[method])
                                .map((method) => method.toUpperCase());
                            routes.push({ path: path, methods });
                        }
                    });
                }
            });
        }
        extractRoutes(app);
        routes.sort((a, b) => a.path.localeCompare(b.path));
        res.json({
            prefix: apiPrefix,
            routes,
            routesCount: routes.length,
            isCloudFunction
        });
    });
    // Root health check route
    app.get(`${apiPrefix}/`, (req, res) => {
        res.json({
            success: true,
            message: 'Netwin Tournament Admin API',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'production',
            isCloudFunction
        });
    });
    // Health check route
    app.get(`${apiPrefix}/health`, (req, res) => {
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            vercel: process.env.VERCEL === '1' ? 'true' : 'false'
        });
    });
    // Simple test route
    app.get(`${apiPrefix}/test`, (req, res) => {
        res.json({ message: 'API is working!' });
    });
}
