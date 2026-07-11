from flask import Blueprint, jsonify, session, request
from database.schema import db, History, Recipe
from datetime import datetime

history_bp = Blueprint('history', __name__)

@history_bp.route('/api/history', methods=['GET'])
def get_history():
    uid = session.get('user_id', 1)
    entries = History.query.filter_by(user_id=uid).order_by(History.viewed_at.desc()).limit(50).all()
    return jsonify([{
        'id': h.id, 'recipe_id': h.recipe_id,
        'name': h.recipe.name, 'ingredients': h.recipe.ingredients,
        'instructions': h.recipe.instructions, 'cooking_time': h.recipe.cooking_time,
        'difficulty': h.recipe.difficulty, 'category': h.recipe.category,
        'rating': h.recipe.rating, 'video_url': h.recipe.video_url, 'viewed_at': h.viewed_at.isoformat()
    } for h in entries])

@history_bp.route('/api/history', methods=['POST'])
def add_history():
    data = request.get_json()
    recipe_id = data.get('recipe_id')
    uid = session.get('user_id', 1)
    entry = History(user_id=uid, recipe_id=recipe_id)
    db.session.add(entry)
    db.session.commit()
    return jsonify({'success': True})
