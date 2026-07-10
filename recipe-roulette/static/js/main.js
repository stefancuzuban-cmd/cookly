document.addEventListener('DOMContentLoaded', () => {

    // Nav toggle
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');
    if (navToggle) {
        navToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    // Toast
    window.showToast = (message, type = 'success') => {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type} show`;
        setTimeout(() => toast.classList.remove('show'), 3000);
    };

    // Generate page
    const ingredientInput = document.getElementById('ingredientInput');
    const addBtn = document.getElementById('addIngredientBtn');
    const tagsContainer = document.getElementById('ingredientTags');
    const generateBtn = document.getElementById('generateBtn');
    const loadingSection = document.getElementById('loadingSection');
    const recipeResult = document.getElementById('recipeResult');
    let ingredients = JSON.parse(localStorage.getItem('rr_ingredients') || '[]');

    if (tagsContainer) {
        renderTags();
        updateGenerateBtn();

        addBtn.addEventListener('click', addIngredient);
        ingredientInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') addIngredient();
        });
        generateBtn.addEventListener('click', generateRecipe);
    }

    function addIngredient() {
        const val = ingredientInput.value.trim();
        if (!val || ingredients.includes(val)) {
            if (!val) ingredientInput.focus();
            return;
        }
        ingredients.push(val);
        localStorage.setItem('rr_ingredients', JSON.stringify(ingredients));
        renderTags();
        updateGenerateBtn();
        ingredientInput.value = '';
        ingredientInput.focus();
    }

    function removeIngredient(index) {
        ingredients.splice(index, 1);
        localStorage.setItem('rr_ingredients', JSON.stringify(ingredients));
        renderTags();
        updateGenerateBtn();
    }

    function renderTags() {
        tagsContainer.innerHTML = ingredients.map((ing, i) =>
            `<span class="tag">${ing} <i class="fas fa-times" data-index="${i}"></i></span>`
        ).join('');
        tagsContainer.querySelectorAll('.fa-times').forEach(el => {
            el.addEventListener('click', () => removeIngredient(parseInt(el.dataset.index)));
        });
    }

    function updateGenerateBtn() {
        generateBtn.disabled = ingredients.length === 0;
    }

    async function generateRecipe() {
        if (ingredients.length === 0) return;
        loadingSection.classList.remove('hidden');
        recipeResult.classList.add('hidden');
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';

        try {
            const data = await API.generateRecipe(ingredients);
            if (data.success) {
                displayRecipe(data.recipe);
                await API.addHistory(data.recipe.id).catch(() => {});
            } else {
                showToast(data.error || 'Failed to generate recipe', 'error');
            }
        } catch (err) {
            showToast(err.message || 'Something went wrong', 'error');
        } finally {
            loadingSection.classList.add('hidden');
            generateBtn.disabled = false;
            generateBtn.innerHTML = '<i class="fas fa-dice"></i> Generate Recipe';
        }
    }

    function displayRecipe(recipe) {
        document.getElementById('recipeCategory').textContent = recipe.category || 'Dinner';
        document.getElementById('recipeName').textContent = recipe.name;
        document.getElementById('recipeTime').textContent = recipe.cooking_time || '30';
        document.getElementById('recipeDifficulty').textContent = recipe.difficulty || 'Medium';

        const ratingEl = document.getElementById('recipeRating');
        const rating = recipe.rating || 3;
        ratingEl.innerHTML = Array.from({length: 5}, (_, i) =>
            `<i class="fa${i < Math.round(rating) ? 's' : 'r'} fa-star"></i>`
        ).join('') + ` <span style="color:var(--dark-light);font-size:0.85rem">(${rating.toFixed(1)})</span>`;

        const ingList = document.getElementById('recipeIngredients');
        let ingArray;
        if (typeof recipe.ingredients === 'string') {
            try { ingArray = JSON.parse(recipe.ingredients); } catch { ingArray = [recipe.ingredients]; }
        } else { ingArray = recipe.ingredients || []; }
        ingList.innerHTML = ingArray.map(i => `<li>${i}</li>`).join('');

        const instList = document.getElementById('recipeInstructions');
        let instArray;
        if (typeof recipe.instructions === 'string') {
            try { instArray = JSON.parse(recipe.instructions); } catch { instArray = [recipe.instructions]; }
        } else { instArray = recipe.instructions || []; }
        instList.innerHTML = instArray.map(s => `<li>${s}</li>`).join('');

        const videoSection = document.getElementById('videoSection');
        const videoLink = document.getElementById('videoLink');
        const videoSubtext = document.getElementById('videoSubtext');
        const videoDesc = document.getElementById('videoDesc');
        const recipeNameEl = document.getElementById('recipeName');
        if (videoSection && videoLink) {
            const name = recipeNameEl.textContent;
            const searchQuery = encodeURIComponent(name + ' recipe tutorial');
            videoLink.href = `https://www.youtube.com/results?search_query=${searchQuery}`;
            if (videoSubtext) videoSubtext.textContent = `Search YouTube for "${name}"`;
            if (videoDesc) videoDesc.textContent = `Follow along with a cooking tutorial for ${name}.`;
            videoSection.classList.remove('hidden');
        }

        const saveBtn = document.getElementById('saveFavoriteBtn');
        saveBtn.dataset.recipeId = recipe.id;
        saveBtn.onclick = async () => {
            try {
                await API.addFavorite(recipe.id);
                showToast('Saved to favorites!');
                saveBtn.innerHTML = '<i class="fas fa-check"></i> Saved!';
                saveBtn.disabled = true;
            } catch (err) {
                showToast(err.message || 'Already in favorites', 'error');
            }
        };

        const newBtn = document.getElementById('newRecipeBtn');
        newBtn.onclick = () => {
            recipeResult.classList.add('hidden');
            saveBtn.innerHTML = '<i class="fas fa-heart"></i> Save to Favorites';
            saveBtn.disabled = false;
        };

        recipeResult.classList.remove('hidden');
        recipeResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Favorites page
    const favoritesGrid = document.getElementById('favoritesGrid');
    const noFavorites = document.getElementById('noFavorites');
    const searchFavs = document.getElementById('searchFavorites');

    if (favoritesGrid) {
        loadFavorites();

        if (searchFavs) {
            searchFavs.addEventListener('input', () => loadFavorites(searchFavs.value));
        }
    }

    async function loadFavorites(search = '') {
        try {
            const data = await API.getFavorites();
            const filtered = search
                ? data.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
                : data;

            if (filtered.length === 0) {
                favoritesGrid.innerHTML = '';
                noFavorites.classList.remove('hidden');
                return;
            }
            noFavorites.classList.add('hidden');

            favoritesGrid.innerHTML = filtered.map(f => `
                <div class="recipe-card-mini" data-id="${f.id}" data-recipe-id="${f.recipe_id}">
                    <div class="card-actions">
                        <button class="btn-delete" data-fav-id="${f.id}" title="Remove"><i class="fas fa-trash"></i></button>
                    </div>
                    <span class="recipe-category">${f.category || 'Dinner'}</span>
                    <h3>${f.name}</h3>
                    <div class="recipe-meta">
                        <span><i class="fas fa-clock"></i> ${f.cooking_time || 30} min</span>
                        <span><i class="fas fa-signal"></i> ${f.difficulty || 'Medium'}</span>
                    </div>
                </div>
            `).join('');

            favoritesGrid.querySelectorAll('.recipe-card-mini').forEach(card => {
                card.addEventListener('click', (e) => {
                    if (e.target.closest('.btn-delete')) return;
                    openModal(parseInt(card.dataset.recipeId));
                });
            });

            favoritesGrid.querySelectorAll('.btn-delete').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    try {
                        await API.removeFavorite(parseInt(btn.dataset.favId));
                        showToast('Removed from favorites');
                        loadFavorites(searchFavs ? searchFavs.value : '');
                    } catch (err) {
                        showToast(err.message, 'error');
                    }
                });
            });
        } catch (err) {
            showToast('Failed to load favorites', 'error');
        }
    }

    // History page
    const historyList = document.getElementById('historyList');
    const noHistory = document.getElementById('noHistory');
    const searchHist = document.getElementById('searchHistory');

    if (historyList) {
        loadHistory();

        if (searchHist) {
            searchHist.addEventListener('input', () => loadHistory(searchHist.value));
        }
    }

    async function loadHistory(search = '') {
        try {
            const data = await API.getHistory();
            const filtered = search
                ? data.filter(h => h.name.toLowerCase().includes(search.toLowerCase()))
                : data;

            if (filtered.length === 0) {
                historyList.innerHTML = '';
                noHistory.classList.remove('hidden');
                return;
            }
            noHistory.classList.add('hidden');

            historyList.innerHTML = filtered.map(h => `
                <div class="history-item" data-recipe-id="${h.recipe_id}">
                    <div class="history-icon"><i class="fas fa-utensils"></i></div>
                    <div class="history-info">
                        <h4>${h.name}</h4>
                        <span>${h.category || 'Dinner'} · ${h.difficulty || 'Medium'}</span>
                    </div>
                    <span class="history-time">${timeAgo(h.viewed_at)}</span>
                </div>
            `).join('');

            historyList.querySelectorAll('.history-item').forEach(item => {
                item.addEventListener('click', () => {
                    openModal(parseInt(item.dataset.recipeId));
                });
            });
        } catch (err) {
            showToast('Failed to load history', 'error');
        }
    }

    function timeAgo(iso) {
        if (!iso) return '';
        const diff = Date.now() - new Date(iso).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        return `${days}d ago`;
    }

    // Modal
    const modal = document.getElementById('recipeModal');

    async function openModal(recipeId) {
        if (!modal) return;
        try {
            const recipe = await API.getRecipe(recipeId);
            const body = modal.querySelector('.modal-body');

            let ingArray;
            if (typeof recipe.ingredients === 'string') {
                try { ingArray = JSON.parse(recipe.ingredients); } catch { ingArray = [recipe.ingredients]; }
            } else { ingArray = recipe.ingredients || []; }

            let instArray;
            if (typeof recipe.instructions === 'string') {
                try { instArray = JSON.parse(recipe.instructions); } catch { instArray = [recipe.instructions]; }
            } else { instArray = recipe.instructions || []; }

            body.innerHTML = `
                <div class="recipe-card" style="box-shadow:none;padding:0">
                    <div class="recipe-header">
                        <span class="recipe-category">${recipe.category || 'Dinner'}</span>
                        <div class="recipe-rating">${'<i class="fas fa-star"></i>'.repeat(Math.round(recipe.rating || 3))}</div>
                    </div>
                    <h2 class="recipe-name">${recipe.name}</h2>
                    <div class="recipe-meta">
                        <span><i class="fas fa-clock"></i> ${recipe.cooking_time || 30} min</span>
                        <span><i class="fas fa-signal"></i> ${recipe.difficulty || 'Medium'}</span>
                    </div>
                    <div class="recipe-section">
                        <h3><i class="fas fa-shopping-basket"></i> Ingredients</h3>
                        <ul class="ingredient-list">${ingArray.map(i => `<li>${i}</li>`).join('')}</ul>
                    </div>
                    <div class="recipe-section">
                        <h3><i class="fas fa-list-ol"></i> Instructions</h3>
                        <ol class="instruction-list">${instArray.map(s => `<li>${s}</li>`).join('')}</ol>
                    </div>
                    <div class="recipe-section video-section">
                        <div class="recipe-section-header">
                            <i class="fab fa-youtube"></i>
                            <h3>Video Tutorial</h3>
                        </div>
                        <p>Follow along with a step-by-step cooking guide for ${recipe.name}.</p>
                        <a href="https://www.youtube.com/results?search_query=${encodeURIComponent(recipe.name + ' recipe tutorial')}" target="_blank" rel="noopener" class="video-button">
                            <span class="play-icon"><i class="fas fa-play"></i></span>
                            <div class="btn-text">
                                <span>Find Recipe on YouTube</span>
                                <span>Search YouTube for "${recipe.name}"</span>
                            </div>
                            <i class="fas fa-arrow-right arrow"></i>
                        </a>
                    </div>
                </div>
            `;
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            await API.addHistory(recipeId).catch(() => {});
        } catch (err) {
            showToast('Failed to load recipe', 'error');
        }
    }

    if (modal) {
        modal.querySelector('.modal-close').addEventListener('click', closeModal);
        modal.querySelector('.modal-backdrop').addEventListener('click', closeModal);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeModal();
        });
    }

    function closeModal() {
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }

    // Home page stats
    async function loadStats() {
        const statRecipes = document.getElementById('statRecipes');
        const statFavs = document.getElementById('statFavorites');
        const statDiff = document.getElementById('statDifficulty');
        if (!statRecipes) return;

        try {
            const [recipes, favs] = await Promise.all([
                API.getRecipes(),
                API.getFavorites()
            ]);
            statRecipes.textContent = recipes.length;
            statFavs.textContent = favs.length;
            if (recipes.length > 0) {
                const avg = recipes.reduce((s, r) => {
                    const d = {easy: 1, medium: 2, hard: 3};
                    return s + (d[r.difficulty?.toLowerCase()] || 2);
                }, 0) / recipes.length;
                statDiff.textContent = avg.toFixed(1);
            } else {
                statDiff.textContent = '0';
            }
        } catch {}
    }

    loadStats();
});
