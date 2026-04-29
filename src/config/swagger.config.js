import swaggerJsdoc from "swagger-jsdoc";
import envConfig from "./env.config.js";

const options = {
  definition: {
    openapi: "3.0.0",
    servers: [
      {
        url: `${envConfig.baseUrl}/api/v1`,
        description: `Servidor (${envConfig.env})`,
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
