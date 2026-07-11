import json
import requests
from flask import Blueprint, request, jsonify, current_app
from database.schema import db, Recipe
from datetime import datetime

recipes_bp = Blueprint('recipes', __name__)

@recipes_bp.route('/api/recipes', methods=['GET'])
def get_recipes():
    category = request.args.get('category')
    search = request.args.get('search')
    difficulty = request.args.get('difficulty')
    query = Recipe.query
    if category:
        query = query.filter_by(category=category)
    if difficulty:
        query = query.filter(Recipe.difficulty.ilike(difficulty))
    if search:
        query = query.filter(Recipe.name.ilike(f'%{search}%'))
    recipes = query.order_by(Recipe.created_at.desc()).all()
    return jsonify([{
        'id': r.id, 'name': r.name, 'ingredients': r.ingredients,
        'instructions': r.instructions, 'cooking_time': r.cooking_time,
        'difficulty': r.difficulty, 'category': r.category, 'rating': r.rating,
        'image_url': r.image_url, 'video_url': r.video_url
    } for r in recipes])

@recipes_bp.route('/api/recipes/generate', methods=['POST'])
def generate_recipe():
    data = request.get_json()
    ingredients = data.get('ingredients', [])
    
    basic_staples = ['salt', 'pepper', 'oil', 'olive oil', 'vegetable oil', 'butter', 'sugar', 'water', 'garlic', 'onion', 'flour', 'eggs', 'milk', 'vinegar', 'lemon juice', 'soy sauce', 'baking powder', 'baking soda', 'cornstarch', 'paprika', 'cumin', 'oregano', 'basil', 'parsley', 'cinnamon', 'vanilla extract', 'honey', 'rice', 'pasta', 'bread', 'cheese', 'chicken broth', 'vegetable broth']
    
    prompt = f"""You are a professional chef. Create a detailed recipe using ONLY these ingredients the user has: {', '.join(ingredients)}.
You may also add basic kitchen staples like salt, pepper, oil, butter, sugar, flour, eggs, milk, garlic, onion, and vinegar — but NOTHING else beyond what's listed.
Do NOT add any meat, vegetables, grains, spices (beyond salt/pepper), or specialty ingredients that the user didn't provide.
The recipe MUST primarily use what the user listed.

Write very detailed cooking instructions with 8-12 steps minimum. Each step must be a full paragraph with:
- Exact measurements in cups, tablespoons, teaspoons (e.g., "3 tablespoons of olive oil", "1 teaspoon of salt")
- Stovetop heat levels (medium-high, medium-low, etc.) and oven temperatures in °F and °C
- Specific cooking times for each action (e.g., "sear for 5 minutes per side", "simmer for 18-22 minutes")
- Precise preparation techniques (dice into 1/2-inch cubes, mince finely, pat dry with paper towels, slice against the grain)
- Visual and sensory cues (until golden brown and crispy on the edges, until fragrant and translucent, until the sauce thickens and coats the back of a spoon, until the internal temperature reaches 165°F)
- Resting and cooling periods (let rest for 5 minutes before slicing, let cool for 3 minutes before serving)
- Equipment mentions where relevant (cast iron skillet, wooden spoon, tongs, baking sheet lined with parchment paper)

Return ONLY valid JSON with no markdown formatting with these fields:
- name (string, a creative recipe name)
- ingredients (array of strings, each must be from the user's list or a basic staple, include measurements like "2 cups chicken")
- instructions (array of strings, each step is one detailed sentence)
- cooking_time (integer in minutes, total time including prep)
- difficulty (easy/medium/hard)
- category (string like Breakfast, Lunch, Dinner, Dessert, Snack)
- rating (float 0-5)"""

    try:
        ai_response = call_ai_api(prompt)
        recipe_data = parse_ai_response(ai_response, ingredients)
        recipe = Recipe(
            name=recipe_data['name'],
            ingredients=json.dumps(recipe_data['ingredients']),
            instructions=json.dumps(recipe_data['instructions']),
            cooking_time=recipe_data['cooking_time'],
            difficulty=recipe_data['difficulty'],
            category=recipe_data['category'],
            rating=recipe_data['rating'],
            video_url=recipe_data.get('video_id', '')
        )
        db.session.add(recipe)
        db.session.commit()
        return jsonify({'success': True, 'recipe': {
            'id': recipe.id, 'name': recipe.name,
            'ingredients': recipe.ingredients, 'instructions': recipe.instructions,
            'cooking_time': recipe.cooking_time, 'difficulty': recipe.difficulty,
            'category': recipe.category, 'rating': recipe.rating,
            'video_url': recipe.video_url
        }})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@recipes_bp.route('/api/recipes/discover', methods=['GET'])
def discover_recipes():
    import random, concurrent.futures, re
    search = request.args.get('search', '').strip()
    count = min(request.args.get('count', 12, type=int), 20)

    def parse_meal(meal):
        ingredients = []
        for i in range(1, 21):
            ing = meal.get(f'strIngredient{i}')
            if ing and ing.strip():
                ingredients.append(ing.strip())
        return {
            'id': meal['idMeal'],
            'name': meal['strMeal'],
            'category': meal.get('strCategory', 'Various') or 'Various',
            'area': meal.get('strArea', '') or '',
            'image': re.sub(r'/preview$', '', (meal.get('strMealThumb', '') or '')),
            'instructions': meal.get('strInstructions', '') or '',
            'ingredients': ingredients,
            'youtube': meal.get('strYoutube', '') or '',
            'tags': meal.get('strTags', '') or ''
        }

    if search:
        try:
            resp = requests.get(f'https://www.themealdb.com/api/json/v1/1/search.php?s={search}', timeout=10)
            data = resp.json()
            meals = data.get('meals', []) or []
            return jsonify([parse_meal(m) for m in meals])
        except:
            return jsonify([])

    meal_ids = set()
    meals = []
    url = 'https://www.themealdb.com/api/json/v1/1/random.php'
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as exec:
        futures = [exec.submit(requests.get, url, timeout=10) for _ in range(count * 2)]
        for f in concurrent.futures.as_completed(futures):
            try:
                data = f.result().json()
                meal = data.get('meals', [None])[0]
                if meal and meal['idMeal'] not in meal_ids:
                    meal_ids.add(meal['idMeal'])
                    meals.append(parse_meal(meal))
                    if len(meals) >= count:
                        break
            except:
                pass
    random.shuffle(meals)
    return jsonify(meals[:count])

@recipes_bp.route('/api/recipes/random', methods=['GET'])
def get_random_recipes():
    import random
    count = request.args.get('count', 12, type=int)
    recipes = Recipe.query.order_by(Recipe.created_at.desc()).all()
    selected = random.sample(recipes, min(count, len(recipes))) if len(recipes) >= count else recipes
    return jsonify([{
        'id': r.id, 'name': r.name, 'ingredients': r.ingredients,
        'instructions': r.instructions, 'cooking_time': r.cooking_time,
        'difficulty': r.difficulty, 'category': r.category, 'rating': r.rating,
        'image_url': r.image_url, 'video_url': r.video_url
    } for r in selected])

@recipes_bp.route('/api/recipes/<int:recipe_id>', methods=['GET', 'DELETE'])
def recipe_detail(recipe_id):
    recipe = Recipe.query.get_or_404(recipe_id)
    if request.method == 'DELETE':
        db.session.delete(recipe)
        db.session.commit()
        return jsonify({'success': True})
    return jsonify({
        'id': recipe.id, 'name': recipe.name,
        'ingredients': recipe.ingredients, 'instructions': recipe.instructions,
        'cooking_time': recipe.cooking_time, 'difficulty': recipe.difficulty,
        'category': recipe.category, 'rating': recipe.rating,
        'video_url': recipe.video_url
    })

def call_ai_api(prompt):
    api_key = current_app.config['AI_API_KEY']
    api_url = current_app.config['AI_API_URL']
    model = current_app.config['AI_MODEL']
    
    if not api_key or api_key == 'your_openai_api_key_here':
        return fallback_generate(prompt)
    
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    }
    payload = {
        'model': model,
        'messages': [{'role': 'user', 'content': prompt}],
        'temperature': 0.7
    }
    resp = requests.post(api_url, headers=headers, json=payload, timeout=30)
    resp.raise_for_status()
    return resp.json()['choices'][0]['message']['content']

BASIC_STAPLES = {'salt', 'pepper', 'oil', 'olive oil', 'vegetable oil', 'butter', 'sugar', 'water', 'garlic', 'onion', 'flour', 'eggs', 'milk', 'vinegar', 'lemon juice', 'soy sauce', 'baking powder', 'baking soda', 'cornstarch', 'paprika', 'cumin', 'oregano', 'basil', 'parsley', 'cinnamon', 'vanilla extract', 'honey', 'rice', 'pasta', 'bread', 'cheese', 'chicken broth', 'vegetable broth'}

def filter_ingredients(ingredient_list, allowed_ingredients):
    allowed = set(i.lower().strip() for i in allowed_ingredients) | BASIC_STAPLES
    return [i for i in ingredient_list if i.lower().strip() in allowed]

def fallback_generate(prompt):
    import random, re
    match = re.search(r"ONLY these ingredients the user has: (.+?)(?:\.|$)", prompt)
    user_ings = [i.strip() for i in match.group(1).split(',')] if match else ['chicken', 'rice', 'tomatoes']
    selected = random.sample(user_ings, min(3, len(user_ings)))
    
    templates = [
        {
            'name': f"{' and '.join(selected).title()} Skillet",
            'instructions': [
                f"Rinse the {selected[0]} under cold running water, then pat it completely dry with paper towels — removing moisture ensures a good sear.",
                f"Place the {selected[0]} on a cutting board and season both sides generously with 1 teaspoon of salt and 1/2 teaspoon of freshly ground black pepper, pressing the seasoning in gently with your fingers.",
                "Heat a large 12-inch cast iron or stainless steel skillet over medium-high heat for 2 minutes, then add 3 tablespoons of olive oil and swirl to coat the bottom.",
                f"Carefully lay the {selected[0]} in the hot skillet — it should sizzle immediately — and cook without moving for 5 minutes until a deep golden-brown crust forms on the first side.",
                f"Using tongs, flip the {selected[0]} carefully and cook for another 4-5 minutes on the second side until the internal temperature reaches 165°F (74°C), then transfer to a clean plate and tent loosely with foil to keep warm.",
                f"Reduce the stovetop heat to medium and add 1 tablespoon of butter to the same skillet with the remaining pan drippings, then add the {selected[1] if len(selected) > 1 else selected[0]} cut into 1/2-inch dice and cook for 5-6 minutes, stirring occasionally with a wooden spoon, until softened and starting to caramelize.",
                f"Return the {selected[0]} and any accumulated juices back to the skillet, add the {selected[2] if len(selected) > 2 else selected[1]} along with 1/4 cup of water, scrape the bottom of the pan to deglaze, and let everything simmer together over medium-low heat for 8-10 minutes until the sauce thickens slightly.",
                "Taste the finished dish and adjust seasoning with additional salt and pepper if needed, then remove from heat.",
                "Let the skillet rest for 2-3 minutes off the heat before serving to allow the flavors to meld together.",
                "Spoon onto warm plates, garnish with freshly chopped parsley if available, and serve immediately while piping hot."
            ]
        },
        {
            'name': f"Roasted {selected[0].title()} Bowl",
            'instructions': [
                f"Position an oven rack in the center and preheat your oven to 400°F (200°C) — this usually takes 15-20 minutes, so start preparing ingredients while it heats.",
                f"Wash and thoroughly dry the {selected[1] if len(selected) > 1 else selected[0]}, then cut into uniform 1-inch cubes so they cook evenly at the same rate.",
                f"In a large mixing bowl, combine the chopped vegetables, 4 tablespoons of extra virgin olive oil, 1 teaspoon of kosher salt, 1/2 teaspoon of black pepper, and if available, 1 teaspoon of dried oregano or thyme, then toss well with your hands until every piece is evenly coated.",
                f"Line a large rimmed baking sheet with parchment paper for easy cleanup, then spread the vegetables in a single even layer — overcrowding will cause steaming instead of roasting, so use two sheets if needed.",
                f"Place the baking sheet on the middle oven rack and roast for 15 minutes, then remove from the oven, flip each piece with a spatula, and roast for another 10-15 minutes until the vegetables are tender when pierced with a fork and the edges are golden brown and caramelized.",
                f"While the vegetables roast, prepare the {selected[0]} by patting it dry and seasoning generously on both sides with 1/2 teaspoon of salt and 1/4 teaspoon of pepper.",
                "Heat a medium non-stick or stainless steel skillet over medium-high heat, add 2 tablespoons of oil and let it heat until it shimmers, then carefully place the seasoned meat in the pan.",
                "Cook for 6-8 minutes on the first side without moving it — when it releases easily from the pan, it's ready to flip — then cook for another 5-7 minutes on the second side until it reaches the proper internal temperature and the outside is deeply browned.",
                f"Transfer the cooked {selected[0]} to a cutting board and let it rest for 5 minutes before slicing — this allows the juices to redistribute so the meat stays tender and moist.",
                f"Slice the {selected[0]} against the grain into 1/2-inch thick pieces, arrange them on a plate or in a bowl alongside the roasted vegetables, and drizzle any accumulated juices from the cutting board over the top for extra flavor."
            ]
        },
        {
            'name': f"One-Pan {selected[0].title()} & {selected[1].title() if len(selected) > 1 else 'Veggies'}",
            'instructions': [
                f"Start by prepping all your aromatics: finely dice 1 medium yellow onion (about 1 cup) and mince 4 cloves of fresh garlic, then set them aside in a small bowl.",
                f"Place the {selected[0]} on a clean cutting board and pat dry with paper towels, then trim any excess fat or connective tissue and cut into 2-inch even pieces so they cook uniformly.",
                f"Heat a heavy-bottomed Dutch oven or large deep skillet over medium-high heat for 3 minutes, then add 3 tablespoons of olive oil and wait until the oil is shimmering and nearly smoking — this ensures a proper sear.",
                f"Working in batches if needed to avoid crowding, add the {selected[0]} pieces to the hot oil in a single layer and sear without moving for 4 minutes until a deep brown crust forms, then turn each piece and sear the other side for 3-4 minutes until all sides are browned, then transfer to a plate using tongs.",
                f"Reduce the heat to medium, add the diced onion to the same pot with the rendered fat and cook for 5 minutes, stirring frequently with a wooden spoon and scraping up the browned bits from the bottom, until the onion is soft, translucent, and just starting to turn golden at the edges.",
                "Add the minced garlic, 1 teaspoon of salt, and 1/2 teaspoon of black pepper, then stir continuously for 45 seconds until the garlic becomes very fragrant but not burnt.",
                f"Return the seared {selected[0]} and any accumulated juices to the pot, add the remaining ingredients, and pour in 1 cup of warm water or chicken broth — the liquid should come about halfway up the sides of the meat.",
                "Increase the heat to high and bring the liquid to a full rolling boil, then immediately reduce the heat to low, cover the pot with a tight-fitting lid, and let it simmer gently for 25-30 minutes, checking once halfway and adding a splash more broth if the liquid has evaporated too much.",
                "After simmering, remove the lid, increase the heat to medium, and let the liquid reduce uncovered for 5-7 minutes until it thickens into a light sauce that coats the back of a spoon.",
                "Remove from heat, let the dish rest covered for 5 minutes to allow the flavors to deepen and the sauce to settle, then serve in shallow bowls with the sauce spooned generously over the top."
            ]
        },
        {
            'name': f"Honey-Glazed {selected[0].title()}",
            'instructions': [
                f"Take the {selected[0]} out of the refrigerator 20 minutes before cooking to let it come to room temperature — this helps it cook more evenly.",
                f"Pat the {selected[0]} completely dry with paper towels, then season on all sides with 1 teaspoon of salt, 1/2 teaspoon of black pepper, and 1/2 teaspoon of paprika if available.",
                "In a small bowl, whisk together 3 tablespoons of honey, 2 tablespoons of soy sauce, 2 minced garlic cloves, and 1 tablespoon of olive oil to make the glaze.",
                f"Heat a large oven-safe skillet over medium-high heat, add 2 tablespoons of oil, and once it shimmers, carefully place the {selected[0]} in the pan and sear for 5 minutes on the first side until deeply golden.",
                f"Flip the {selected[0]} using tongs, pour half of the prepared honey glaze over the top, and transfer the entire skillet to the preheated 375°F (190°C) oven.",
                f"Roast for 20-25 minutes, basting with the pan juices and the remaining glaze every 7-8 minutes using a spoon, until the internal temperature reaches 165°F (74°C) and the outside is sticky and caramelized.",
                "Carefully remove the skillet from the oven using oven mitts, transfer the cooked item to a cutting board, and let it rest for 5-7 minutes — this step is essential for keeping it juicy.",
                f"While resting, place the skillet with the remaining glaze over medium heat, add 2 tablespoons of butter, and whisk constantly for 2-3 minutes until the sauce thickens into a rich, silky glaze.",
                f"Slice the {selected[0]} against the grain into 1/2-inch thick pieces, arrange on a serving platter, drizzle the warm honey glaze generously over the top, and serve with your choice of sides."
            ]
        },
        {
            'name': f"Garlic Butter {selected[0].title()}",
            'instructions': [
                "Fill a large pot with 4 quarts of cold water, add 2 tablespoons of salt, and bring to a rolling boil over high heat — this will be for cooking any grains or pasta if using.",
                f"Meanwhile, prepare the {selected[0]} by rinsing it under cold water and patting it thoroughly dry with paper towels, then slicing it into even 1-inch pieces for consistent cooking.",
                "In a small saucepan over low heat, melt 4 tablespoons (half a stick) of unsalted butter, then add 4 minced garlic cloves and cook gently for 2 minutes, swirling occasionally, until the garlic is fragrant and pale golden — do not let it brown or it will become bitter.",
                f"Heat a large heavy skillet over medium-high heat, add 2 tablespoons of olive oil, and once the oil is hot and shimmering, carefully add the {selected[0]} in a single layer — work in batches if needed to avoid overcrowding.",
                f"Cook the {selected[0]} without stirring for 4-5 minutes until the bottom is golden brown and crispy, then flip each piece and cook for another 4-5 minutes until both sides are beautifully caramelized and the interior is cooked through.",
                "Pour the prepared garlic butter over the cooked ingredients directly in the skillet, add 1 tablespoon of freshly squeezed lemon juice, and toss everything together gently using tongs until every piece is coated in the buttery garlic sauce.",
                "Sprinkle 2 tablespoons of freshly chopped parsley over the top and give everything one final toss, then remove the skillet from the heat immediately to prevent the garlic from burning.",
                f"Transfer the finished {selected[0]} to a warm serving dish, spoon any remaining garlic butter from the pan over the top, season with a final pinch of flaky sea salt and freshly cracked black pepper, and serve hot with lemon wedges on the side."
            ]
        }
    ]
    
    template = random.choice(templates)
    return json.dumps({
        'name': template['name'],
        'ingredients': selected + ['salt', 'pepper', 'olive oil', 'garlic', 'onion'],
        'instructions': template['instructions'],
        'cooking_time': random.choice([25, 30, 35, 40, 45]),
        'difficulty': random.choice(['easy', 'medium']),
        'category': random.choice(['Breakfast', 'Lunch', 'Dinner']),
        'rating': round(random.uniform(3.5, 4.8), 1)
    })

def parse_ai_response(response, ingredients):
    cleaned = response.strip()
    if cleaned.startswith('```'):
        cleaned = cleaned.split('\n', 1)[-1]
        cleaned = cleaned.rsplit('```', 1)[0]
    cleaned = cleaned.strip()
    data = json.loads(cleaned)
    raw_ingredients = data.get('ingredients', ingredients)
    filtered = filter_ingredients(raw_ingredients, ingredients)
    if not filtered:
        filtered = ingredients + ['salt', 'pepper']
    return {
        'name': data.get('name', 'Mystery Recipe'),
        'ingredients': filtered,
        'instructions': data.get('instructions', ['Mix all ingredients.']),
        'cooking_time': data.get('cooking_time', 30),
        'difficulty': data.get('difficulty', 'medium'),
        'category': data.get('category', 'Dinner'),
        'rating': data.get('rating', 3.0)
    }
