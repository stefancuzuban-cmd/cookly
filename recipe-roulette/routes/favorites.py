from flask import Blueprint, jsonify, request, session
from database.schema import db, Favorite, Recipe
from datetime import datetime

favorites_bp = Blueprint('favorites', __name__)

@favorites_bp.route('/api/favorites', methods=['GET'])
def get_favorites():
    uid = session.get('user_id', 1)
    favorites = Favorite.query.filter_by(user_id=uid).order_by(Favorite.created_at.desc()).all()
    return jsonify([{
        'id': f.id, 'recipe_id': f.recipe_id,
        'name': f.recipe.name, 'ingredients': f.recipe.ingredients,
        'instructions': f.recipe.instructions, 'cooking_time': f.recipe.cooking_time,
        'difficulty': f.recipe.difficulty, 'category': f.recipe.category,
        'rating': f.recipe.rating, 'video_url': f.recipe.video_url, 'created_at': f.created_at.isoformat()
    } for f in favorites])

@favorites_bp.route('/api/favorites', methods=['POST'])
def add_favorite():
    data = request.get_json()
    recipe_id = data.get('recipe_id')
    existing = Favorite.query.filter_by(recipe_id=recipe_id).first()
    if existing:
        return jsonify({'success': False, 'error': 'Already in favorites'}), 400
    uid = session.get('user_id', 1)
    fav = Favorite(user_id=uid, recipe_id=recipe_id)
    db.session.add(fav)
    db.session.commit()
    return jsonify({'success': True, 'id': fav.id})

@favorites_bp.route('/api/favorites/<int:fav_id>', methods=['DELETE'])
def remove_favorite(fav_id):
    fav = Favorite.query.get_or_404(fav_id)
    db.session.delete(fav)
    db.session.commit()
    return jsonify({'success': True})
