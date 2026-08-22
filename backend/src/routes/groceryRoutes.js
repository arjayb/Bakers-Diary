const express = require('express');
const { getGroceryItems, addGroceryItem, addFromRecipe, updateGroceryItem, deleteGroceryItem } = require('../controllers/groceryController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', getGroceryItems);
router.post('/', addGroceryItem);
router.post('/from-recipe/:recipeId', addFromRecipe);
router.patch('/:id', updateGroceryItem);
router.delete('/:id', deleteGroceryItem);

module.exports = router;
