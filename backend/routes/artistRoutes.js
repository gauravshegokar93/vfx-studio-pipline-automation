const express = require("express");
const router = express.Router();

const {
  createArtist,
  getArtists,
  getArtistById,
  updateArtist,
  toggleArtistActive,
} = require("../controllers/artistController");

// RBAC is handled inside controller/middleware (authMiddleware)
router.get("/", getArtists);
router.get("/:id", getArtistById);
router.post("/", createArtist);
router.put("/:id", updateArtist);
router.patch("/:id/toggle", toggleArtistActive);

module.exports = router;

