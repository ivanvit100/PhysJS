document.addEventListener('DOMContentLoaded', function() {
    const container = document.querySelector('.experiments-grid') || document.getElementById('experiments-container');
    
    if (!container) return;
    
    async function loadLabs() {
        try {
            container.innerHTML = '<div class="loading">Загрузка лабораторных работ...</div>';
            const response = await fetch('/api/labs');
            
            if (!response.ok)
                throw new Error(`Ошибка HTTP: ${response.status}`);
            
            const labs = await response.json();
            container.innerHTML = '';
            
            renderLabCards(labs);
            
        } catch (error) {
            container.innerHTML = `
                <div class="error-message">
                    <h3>Не удалось загрузить список лабораторных работ</h3>
                    <p>${error.message}</p>
                    <button onclick="location.reload()">Попробовать снова</button>
                </div>
            `;
        }
    }
    
    function renderLabCards(labs) {
        if (!Array.isArray(labs)) return;
        
        labs.forEach(lab => {
            const labCard = document.createElement('a');
            labCard.href = `/lab/${lab.id}`;
            labCard.className = 'experiment-card';
            
            labCard.innerHTML = `
                <div class="card-image" style="background-image: url('./static/images/lab${lab.id}.png');">
                    <div class="card-overlay"></div>
                </div>
                <div class="card-content">
                    <h3>${lab.title}</h3>
                    <p>${lab.description}</p>
                    <div class="tags-container">
                        ${lab.tags.map(tag => `<span class="card-badge">${tag}</span>`).join('')}
                    </div>
                </div>
                <span class="number">#${lab.id}</span>
            `;
            
            container.appendChild(labCard);
        });
    }
    
    loadLabs();
});