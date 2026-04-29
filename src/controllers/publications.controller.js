import {
  createPublication,
  listPublications,
  getPublicationById,
  updatePublication,
  deletePublication,
  getMyPublications,
} from "#services/publications.service.js";

const createPublicationHandler = async (req, res, next) => {
  try {
    const publication = await createPublication(req.user.id, req.body);
    res.status(201).json({ success: true, ...publication });
  } catch (err) {
    next(err);
  }
};

const listPublicationsHandler = async (req, res, next) => {
  try {
    const result = await listPublications(req.query);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const getPublicationHandler = async (req, res, next) => {
  try {
    const publication = await getPublicationById(req.params.id);
    res.status(200).json({ success: true, ...publication });
  } catch (err) {
    next(err);
  }
};

const updatePublicationHandler = async (req, res, next) => {
  try {
    const publication = await updatePublication(req.params.id, req.user.id, req.body);
    res.status(200).json({ success: true, ...publication });
  } catch (err) {
    next(err);
  }
};

const deletePublicationHandler = async (req, res, next) => {
  try {
    await deletePublication(req.params.id, req.user.id);
    res.status(200).json({ success: true, message: "Publicación dada de baja correctamente" });
  } catch (err) {
    next(err);
  }
};

const getMyPublicationsHandler = async (req, res, next) => {
  try {
    const result = await getMyPublications(req.user.id, req.query);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export {
  createPublicationHandler,
  listPublicationsHandler,
  getPublicationHandler,
  updatePublicationHandler,
  deletePublicationHandler,
  getMyPublicationsHandler,
};
