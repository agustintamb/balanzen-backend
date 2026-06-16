import { getIO } from "#config/socket.config.js";

// Broadcast global: avisa a todos los clientes que el set de publicaciones visibles cambió.
// El frontend lo usa solo como señal para invalidar su caché y refrescar listados.
const broadcastPublicationChanged = (publicationId, status) => {
  try {
    const payload = { publication_id: publicationId };
    if (status) payload.status = status;
    getIO().emit("publication_changed", payload);
  } catch {
    // io no disponible en tests o fuera de contexto HTTP
  }
};

export { broadcastPublicationChanged };
