import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    servers: [
      {
        url: "http://localhost:3001/api/v1",
        description: "Servidor de desarrollo",
      },
      {
        url: "https://balanzen-backend-testing.up.railway.app/api/v1",
        description: "Servidor de pruebas",
      },
      {
        url: "https://balanzen-backend-production.up.railway.app/api/v1",
        description: "Servidor de producción",
      },
    ],
    info: {
      title: "Balanzen API",
      version: "1.2.0",
      description: "Documentación de la API de Balanzen",
    },
    security: [{ bearerAuth: [] }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./src/routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
