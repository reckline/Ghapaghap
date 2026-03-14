const express = require('express');
const router = express.Router();
const searchController = require('../controller/searchController');

/**
 * @ROUTE  GET /search
 * @DESC   Render the search page UI
 * @ACCESS Public
 */
router.get('/', searchController.getSearchPage);

/**
 * @ROUTE  GET /search/users
 * @DESC   JSON API for live user filtering
 * @ACCESS Public
 */
router.get('/users', searchController.searchUsers);

module.exports = router;