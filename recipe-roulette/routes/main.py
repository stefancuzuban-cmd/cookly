from flask import Blueprint, render_template, request
from database.schema import Recipe

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    return render_template('index.html')

@main_bp.route('/generate')
def generate():
    return render_template('generate.html')

@main_bp.route('/favorites')
def favorites():
    return render_template('favorites.html')

@main_bp.route('/history')
def history():
    return render_template('history.html')

@main_bp.route('/search')
def search_page():
    query = request.args.get('q', '')
    results = []
    if query:
        results = Recipe.query.filter(Recipe.name.ilike(f'%{query}%')).all()
    return render_template('search.html', query=query, results=results)
