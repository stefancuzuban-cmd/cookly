const API = {
    async request(url, options = {}) {
        try {
            const res = await fetch(url, {
                headers: { 'Content-Type': 'application/json' },
                ...options
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Request failed');
            return data;
        } catch (err) {
            throw err;
        }
    },

    generateRecipe(ingredients) {
        return this.request('/api/recipes/generate', {
            method: 'POST',
            body: JSON.stringify({ ingredients })
        });
    },

    getRecipes(params = {}) {
        const qs = new URLSearchParams(params).toString();
        return this.request(`/api/recipes${qs ? '?' + qs : ''}`);
    },

    getRecipe(id) {
        return this.request(`/api/recipes/${id}`);
    },

    deleteRecipe(id) {
        return this.request(`/api/recipes/${id}`, { method: 'DELETE' });
    },

    getFavorites() {
        return this.request('/api/favorites');
    },

    addFavorite(recipeId) {
        return this.request('/api/favorites', {
            method: 'POST',
            body: JSON.stringify({ recipe_id: recipeId })
        });
    },

    removeFavorite(favId) {
        return this.request(`/api/favorites/${favId}`, { method: 'DELETE' });
    },

    getHistory() {
        return this.request('/api/history');
    },

    addHistory(recipeId) {
        return this.request('/api/history', {
            method: 'POST',
            body: JSON.stringify({ recipe_id: recipeId })
        });
    }
};
