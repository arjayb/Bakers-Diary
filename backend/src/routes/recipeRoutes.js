const express = require('express');
const { getRecipes, getRecipeById, createRecipe, updateRecipe, deleteRecipe } = require('../controllers/recipeController');
const { getRecipeNutrition, rematchIngredient } = require('../controllers/nutritionController');
const { getRecipeBakeHistory } = require('../controllers/sessionController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', getRecipes);
router.post('/', createRecipe);
router.get('/:id', getRecipeById);
router.patch('/:id', updateRecipe);
router.delete('/:id', deleteRecipe);

router.get('/:id/nutrition', getRecipeNutrition);
router.patch('/:id/nutrition/:ingredientName/rematch', rematchIngredient);

router.get('/:id/bakes', getRecipeBakeHistory);

module.exports = router;
