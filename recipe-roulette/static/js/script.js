document.addEventListener('DOMContentLoaded', function() {
    const navToggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    if (navToggle) {
        navToggle.addEventListener('click', function() {
            navLinks.classList.toggle('open');
        });
    }

    const ingredientInput = document.getElementById('ingredient-input');
    const addBtn = document.getElementById('add-ingredient-btn');
    const ingredientTags = document.getElementById('ingredient-tags');
    const generateBtn = document.getElementById('generate-btn');
    const recipesContainer = document.getElementById('recipes-container');
    const loadingSection = document.getElementById('loading-section');
    const errorSection = document.getElementById('error-section');
    const errorMessage = document.getElementById('error-message');
    const aiBadge = document.getElementById('ai-badge');

    let ingredients = [];

    function addIngredient(name) {
        name = name.trim().toLowerCase();
        if (!name || ingredients.includes(name)) return;
        ingredients.push(name);
        renderTags();
        if (ingredientInput) ingredientInput.value = '';
        if (ingredientInput) ingredientInput.focus();
    }

    function removeIngredient(index) {
        ingredients.splice(index, 1);
        renderTags();
    }

    function renderTags() {
        if (!ingredientTags) return;
        ingredientTags.innerHTML = '';
        ingredients.forEach((ing, i) => {
            const tag = document.createElement('span');
            tag.className = 'ingredient-tag';
            tag.innerHTML = `${ing} <button onclick="removeIngredient(${i})"><i class="fas fa-times"></i></button>`;
            ingredientTags.appendChild(tag);
        });
    }

    window.removeIngredient = removeIngredient;

    if (addBtn && ingredientInput) {
        addBtn.addEventListener('click', function() { addIngredient(ingredientInput.value); });
        ingredientInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') addIngredient(ingredientInput.value);
        });
    }

    if (generateBtn) {
        generateBtn.addEventListener('click', generateRecipes);
    }

    async function generateRecipes() {
        if (ingredients.length === 0) {
            if (ingredientInput) ingredientInput.focus();
            if (ingredientInput) ingredientInput.style.borderColor = '#e74c3c';
            setTimeout(() => { if (ingredientInput) ingredientInput.style.borderColor = ''; }, 2000);
            return;
        }

        if (loadingSection) loadingSection.classList.remove('hidden');
        if (errorSection) errorSection.classList.add('hidden');
        if (recipesContainer) recipesContainer.classList.add('hidden');
        if (generateBtn) generateBtn.disabled = true;
        if (aiBadge) aiBadge.classList.add('hidden');

        try {
            const resp = await fetch('/api/recipes/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ingredients: ingredients })
            });

            if (!resp.ok) throw new Error('Server error');

            const data = await resp.json();

            if (loadingSection) loadingSection.classList.add('hidden');
            if (generateBtn) generateBtn.disabled = false;

            if (data.recipes && data.recipes.length > 0) {
                if (aiBadge && data.ai_generated) aiBadge.classList.remove('hidden');
                renderRecipes(data.recipes);
            } else {
                showError('No recipes found. Try different ingredients!');
            }
        } catch (err) {
            if (loadingSection) loadingSection.classList.add('hidden');
            if (generateBtn) generateBtn.disabled = false;
            showError('Failed to generate recipes. Please try again.');
        }
    }

    function renderRecipes(recipes) {
        if (!recipesContainer) return;
        recipesContainer.innerHTML = '';
        recipesContainer.classList.remove('hidden');

        recipes.forEach((recipe, index) => {
            const card = createRecipeCard(recipe, index);
            recipesContainer.appendChild(card);
        });
    }

    function createRecipeCard(recipe, index) {
        const card = document.createElement('div');
        card.className = 'recipe-card';
        card.style.animationDelay = `${index * 0.1}s`;

        const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];

        card.innerHTML = `
            <div class="recipe-card-header">
                <h3>${escapeHtml(recipe.name)}</h3>
                <div class="recipe-meta">
                    ${recipe.cooking_time ? `<span class="meta-time"><i class="far fa-clock"></i> ${escapeHtml(recipe.cooking_time)}</span>` : ''}
                    ${recipe.difficulty ? `<span class="meta-difficulty"><i class="fas fa-signal"></i> ${escapeHtml(recipe.difficulty)}</span>` : ''}
                    ${recipe.category ? `<span class="meta-category"><i class="fas fa-tag"></i> ${escapeHtml(recipe.category)}</span>` : ''}
                    ${recipe.rating ? `<span class="meta-rating"><i class="fas fa-star"></i> ${recipe.rating}/5</span>` : ''}
                </div>
            </div>
            <div class="recipe-card-body">
                <h4><i class="fas fa-shopping-basket"></i> Ingredients</h4>
                <div class="ingredients-list">
                    ${ingredients.map(ing => `<span class="ingredient-item">${escapeHtml(ing)}</span>`).join('')}
                </div>
                <h4><i class="fas fa-book-open"></i> Instructions</h4>
                <p class="recipe-instructions">${escapeHtml(recipe.instructions)}</p>
            </div>
            <div class="recipe-card-footer">
                <button class="btn btn-secondary btn-sm save-fav-btn" data-recipe='${encodeRecipeData(recipe)}'>
                    <i class="fas fa-heart"></i> Save
                </button>
                <button class="btn btn-primary btn-sm view-full-btn" data-recipe='${encodeRecipeData(recipe)}'>
                    <i class="fas fa-eye"></i> Full Recipe
                </button>
            </div>
        `;

        const saveBtn = card.querySelector('.save-fav-btn');
        saveBtn.addEventListener('click', function() {
            const recipeData = JSON.parse(this.dataset.recipe);
            saveToFavorites(recipeData, this);
        });

        const viewBtn = card.querySelector('.view-full-btn');
        viewBtn.addEventListener('click', function() {
            const recipeData = JSON.parse(this.dataset.recipe);
            showFullRecipe(recipeData);
        });

        return card;
    }

    function encodeRecipeData(recipe) {
        return JSON.stringify(recipe).replace(/'/g, '&#39;');
    }

    async function saveToFavorites(recipe, btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        try {
            const resp = await fetch('/api/recipes/save-to-favorites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(recipe)
            });
            const data = await resp.json();

            if (data.success) {
                btn.innerHTML = '<i class="fas fa-check"></i> Saved!';
                btn.style.borderColor = '#27ae60';
                btn.style.color = '#27ae60';
                btn.disabled = true;
            } else {
                btn.innerHTML = '<i class="fas fa-heart"></i> Already Saved';
                btn.style.borderColor = '#f39c12';
                btn.style.color = '#f39c12';
                btn.disabled = true;
            }
        } catch (err) {
            btn.innerHTML = '<i class="fas fa-heart"></i> Error';
            btn.disabled = false;
        }
    }

    function showFullRecipe(recipe) {
        const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal">
                <button class="modal-close"><i class="fas fa-times"></i></button>
                <div class="modal-header">
                    <h2>${escapeHtml(recipe.name)}</h2>
                    <div class="recipe-meta">
                        ${recipe.cooking_time ? `<span class="meta-time"><i class="far fa-clock"></i> ${escapeHtml(recipe.cooking_time)}</span>` : ''}
                        ${recipe.difficulty ? `<span class="meta-difficulty"><i class="fas fa-signal"></i> ${escapeHtml(recipe.difficulty)}</span>` : ''}
                        ${recipe.category ? `<span class="meta-category"><i class="fas fa-tag"></i> ${escapeHtml(recipe.category)}</span>` : ''}
                    </div>
                </div>
                <div class="modal-body">
                    <h3><i class="fas fa-shopping-basket"></i> Ingredients</h3>
                    <ul class="modal-ingredients">
                        ${ingredients.map(ing => `<li>${escapeHtml(ing)}</li>`).join('')}
                    </ul>
                    <h3><i class="fas fa-book-open"></i> Instructions</h3>
                    <p class="modal-instructions">${escapeHtml(recipe.instructions)}</p>
                    <div class="modal-footer-actions">
                        <button class="btn btn-primary modal-save-btn"><i class="fas fa-heart"></i> Save to Favorites</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';

        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) overlay.remove();
            document.body.style.overflow = '';
        });

        overlay.querySelector('.modal-close').addEventListener('click', function() {
            overlay.remove();
            document.body.style.overflow = '';
        });

        const modalSaveBtn = overlay.querySelector('.modal-save-btn');
        modalSaveBtn.addEventListener('click', function() {
            saveToFavorites(recipe, this);
        });
    }

    function showError(msg) {
        if (!errorSection || !errorMessage) return;
        errorMessage.textContent = msg;
        errorSection.classList.remove('hidden');
    }

    const favoritesContainer = document.getElementById('favorites-container');
    const favoritesLoading = document.getElementById('favorites-loading');
    const favoritesEmpty = document.getElementById('favorites-empty');
    const searchInput = document.getElementById('search-input');

    if (favoritesContainer) {
        loadFavorites();

        if (searchInput) {
            let searchTimer;
            searchInput.addEventListener('input', function() {
                clearTimeout(searchTimer);
                searchTimer = setTimeout(loadFavorites, 300);
            });
        }
    }

    async function loadFavorites() {
        const query = searchInput ? searchInput.value.trim() : '';

        if (favoritesLoading) favoritesLoading.classList.remove('hidden');
        if (favoritesContainer) favoritesContainer.classList.add('hidden');
        if (favoritesEmpty) favoritesEmpty.classList.add('hidden');

        try {
            let url = '/api/favorites';
            if (query) url = `/api/recipes/search?q=${encodeURIComponent(query)}`;

            const resp = await fetch(url);
            const data = await resp.json();

            if (favoritesLoading) favoritesLoading.classList.add('hidden');

            const items = data.favorites || data.results || [];

            if (items.length === 0) {
                if (favoritesEmpty) favoritesEmpty.classList.remove('hidden');
                return;
            }

            if (favoritesContainer) {
                favoritesContainer.innerHTML = '';
                favoritesContainer.classList.remove('hidden');
                items.forEach((recipe, i) => {
                    const card = createRecipeCard(recipe, i);
                    const footer = card.querySelector('.recipe-card-footer');
                    if (footer) {
                        footer.innerHTML = `
                            <button class="btn btn-danger btn-sm remove-fav-btn" data-id="${recipe.id}">
                                <i class="fas fa-trash"></i> Remove
                            </button>
                            <button class="btn btn-primary btn-sm view-full-btn" data-recipe='${encodeRecipeData(recipe)}'>
                                <i class="fas fa-eye"></i> View
                            </button>
                        `;

                        const removeBtn = footer.querySelector('.remove-fav-btn');
                        removeBtn.addEventListener('click', function() {
                            removeFavorite(recipe.id, card);
                        });

                        const viewBtn = footer.querySelector('.view-full-btn');
                        viewBtn.addEventListener('click', function() {
                            showFullRecipe(recipe);
                        });
                    }
                    favoritesContainer.appendChild(card);
                });
            }
        } catch (err) {
            if (favoritesLoading) favoritesLoading.classList.add('hidden');
            if (favoritesContainer) favoritesContainer.classList.add('hidden');
            if (favoritesEmpty) {
                favoritesEmpty.querySelector('h3').textContent = 'Error loading favorites';
                favoritesEmpty.querySelector('p').textContent = 'Please try again later.';
                favoritesEmpty.classList.remove('hidden');
            }
        }
    }

    async function removeFavorite(recipeId, card) {
        try {
            const resp = await fetch('/api/favorites/remove', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipe_id: recipeId })
            });
            if (resp.ok) {
                card.style.transform = 'scale(0.8)';
                card.style.opacity = '0';
                setTimeout(() => {
                    card.remove();
                    if (favoritesContainer && favoritesContainer.children.length === 0) {
                        favoritesContainer.classList.add('hidden');
                        if (favoritesEmpty) favoritesEmpty.classList.remove('hidden');
                    }
                }, 300);
            }
        } catch (err) {
            console.error('Remove error:', err);
        }
    }

    const historyContainer = document.getElementById('history-container');
    const historyLoading = document.getElementById('history-loading');
    const historyEmpty = document.getElementById('history-empty');

    if (historyContainer) {
        loadHistory();
    }

    async function loadHistory() {
        if (historyLoading) historyLoading.classList.remove('hidden');
        if (historyContainer) historyContainer.classList.add('hidden');
        if (historyEmpty) historyEmpty.classList.add('hidden');

        try {
            const resp = await fetch('/api/history');
            const data = await resp.json();

            if (historyLoading) historyLoading.classList.add('hidden');

            if (!data.history || data.history.length === 0) {
                if (historyEmpty) historyEmpty.classList.remove('hidden');
                return;
            }

            if (historyContainer) {
                historyContainer.innerHTML = '';
                historyContainer.classList.remove('hidden');
                data.history.forEach((recipe, i) => {
                    const card = createRecipeCard(recipe, i);
                    const footer = card.querySelector('.recipe-card-footer');
                    if (footer) {
                        footer.innerHTML = `
                            <button class="btn btn-secondary btn-sm save-fav-btn">
                                <i class="fas fa-heart"></i> Save
                            </button>
                            <button class="btn btn-primary btn-sm view-full-btn" data-recipe='${encodeRecipeData(recipe)}'>
                                <i class="fas fa-eye"></i> View
                            </button>
                        `;

                        const saveBtn = footer.querySelector('.save-fav-btn');
                        saveBtn.addEventListener('click', function() {
                            saveToFavorites(recipe, this);
                        });

                        const viewBtn = footer.querySelector('.view-full-btn');
                        viewBtn.addEventListener('click', function() {
                            showFullRecipe(recipe);
                        });
                    }
                    historyContainer.appendChild(card);
                });
            }
        } catch (err) {
            if (historyLoading) historyLoading.classList.add('hidden');
            if (historyContainer) historyContainer.classList.add('hidden');
            if (historyEmpty) {
                historyEmpty.querySelector('h3').textContent = 'Error loading history';
                historyEmpty.querySelector('p').textContent = 'Please try again later.';
                historyEmpty.classList.remove('hidden');
            }
        }
    }
});

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

const style = document.createElement('style');
style.textContent = `
    .modal-overlay {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.7);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
        padding: 20px;
        animation: fadeIn 0.3s ease;
    }
    .modal {
        background: var(--bg-card);
        border-radius: var(--radius);
        max-width: 700px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        border: 1px solid var(--border);
        box-shadow: var(--shadow);
        animation: slideUp 0.3s ease;
    }
    @keyframes slideUp {
        from { transform: translateY(30px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
    .modal-close {
        position: absolute;
        top: 16px;
        right: 16px;
        background: none;
        border: none;
        color: var(--text-muted);
        font-size: 1.2rem;
        cursor: pointer;
        padding: 8px;
        transition: var(--transition);
    }
    .modal-close:hover { color: var(--text); }
    .modal-header {
        padding: 32px 32px 20px;
        border-bottom: 1px solid var(--border);
        position: relative;
    }
    .modal-header h2 {
        font-size: 1.6rem;
        margin-bottom: 12px;
        padding-right: 40px;
    }
    .modal-body {
        padding: 24px 32px 32px;
    }
    .modal-body h3 {
        font-size: 1rem;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 12px;
        margin-top: 20px;
    }
    .modal-body h3:first-child { margin-top: 0; }
    .modal-ingredients {
        list-style: none;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
    }
    .modal-ingredients li {
        padding: 6px 14px;
        background: rgba(255,255,255,0.05);
        border-radius: 20px;
        font-size: 0.9rem;
        color: var(--text);
    }
    .modal-instructions {
        font-size: 0.95rem;
        line-height: 1.8;
        color: var(--text-muted);
        white-space: pre-line;
    }
    .modal-footer-actions {
        margin-top: 24px;
        padding-top: 20px;
        border-top: 1px solid var(--border);
    }
    .modal-footer-actions .btn { width: 100%; justify-content: center; }
`;
document.head.appendChild(style);
