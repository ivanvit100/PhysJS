document.addEventListener('DOMContentLoaded', function() {
    const container = document.querySelector('.experiments-grid') || document.getElementById('experiments-container');
    const tagsContainer = document.querySelector('.tags-container');
    const showTagsButton = document.querySelector('#tags .show');
    
    if (!container) return;
    
    let allLabs = [];
    let activeTag = null;
    
    if (showTagsButton) {
        showTagsButton.addEventListener('click', function(e) {
            e.stopPropagation();
            tagsContainer.classList.toggle('visible');
            showTagsButton.classList.toggle('active');
            
            tagsContainer.classList.contains('visible') ?
                tagsContainer.style.transform = 'translateX(-350px)' :
                tagsContainer.style.transform = 'translateX(0)';
        });
        
        document.addEventListener('click', function(e) {
            if (tagsContainer.classList.contains('visible') && 
                !tagsContainer.contains(e.target) && 
                e.target !== showTagsButton) {
                tagsContainer.classList.remove('visible');
                showTagsButton.classList.remove('active');
                tagsContainer.style.transform = 'translateX(0)';
            }
        });
        
        tagsContainer.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }
    
    async function loadLabs() {
        try {
            container.innerHTML = '<div class="loading">Загрузка лабораторных работ...</div>';
            const response = await fetch('/api/labs');
            
            if (!response.ok)
                throw new Error(`Ошибка HTTP: ${response.status}`);
            
            allLabs = await response.json();
            container.innerHTML = '';
            
            await loadTags();
            applyStoredFilter();
            
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
    
    function getQueryParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }
    
    function applyStoredFilter() {
        const urlFilter = getQueryParam('filter');
        
        if (urlFilter) {
            activeTag = decodeURIComponent(urlFilter);
            localStorage.setItem('activeFilter', activeTag);
        } else {
            activeTag = localStorage.getItem('activeFilter') || null;
        }
        
        if (activeTag) {
            const tagButton = document.querySelector(`.tag-btn[data-tag="${activeTag}"]`);
            
            if (tagButton) {
                tagButton.classList.add('active');
                
                const filteredLabs = allLabs.filter(lab => 
                    lab.tags && lab.tags.includes(activeTag)
                );
                
                renderLabCards(filteredLabs);
            } else {
                resetFilter();
            }
        } else {
            resetFilter();
        }
    }
    
    function resetFilter() {
        activeTag = null;
        localStorage.removeItem('activeFilter');
        renderLabCards(allLabs);
    }
    
    async function loadTags() {
        if (!tagsContainer) return;
        
        try {
            const response = await fetch('/api/tags');
            
            if (!response.ok)
                throw new Error(`Ошибка HTTP: ${response.status}`);
            
            const tagsData = await response.json();
            
            tagsContainer.innerHTML = '';
            
            const sortedTags = Object.entries(tagsData.tagsWithCount)
                .sort((a, b) => b[1] - a[1])
                .map(entry => entry[0]);
            
            sortedTags.forEach(tag => {
                const count = tagsData.tagsWithCount[tag];
                const tagButton = document.createElement('button');
                tagButton.className = 'tag-btn';
                tagButton.textContent = `${tag} (${count})`;
                tagButton.dataset.tag = tag;
                
                tagButton.addEventListener('click', () => {
                    filterLabsByTag(tag);
                });
                
                tagsContainer.appendChild(tagButton);
            });
            
            return Promise.resolve();
            
        } catch (error) {
            console.error('Ошибка при загрузке тегов:', error);
            tagsContainer.innerHTML = '<div class="error">Не удалось загрузить фильтры по тегам</div>';
            return Promise.reject(error);
        }
    }
    
    function filterLabsByTag(tag) {
        activeTag = tag === activeTag ? null : tag;
        
        if (activeTag) {
            localStorage.setItem('activeFilter', activeTag);
            const url = new URL(window.location);
            url.searchParams.set('filter', activeTag);
            window.history.pushState({}, '', url);
        } else {
            localStorage.removeItem('activeFilter');
            const url = new URL(window.location);
            url.searchParams.delete('filter');
            window.history.pushState({}, '', url);
        }
        
        document.querySelectorAll('.tag-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tag === activeTag);
        });
        
        let filteredLabs = allLabs;
        
        if (activeTag) {
            filteredLabs = allLabs.filter(lab => 
                lab.tags && lab.tags.includes(activeTag)
            );
        }
        
        renderLabCards(filteredLabs);
    }
    
    function renderLabCards(labs) {
        container.innerHTML = '';
        
        if (!Array.isArray(labs) || labs.length === 0) {
            container.innerHTML = '<div class="no-results">Нет лабораторных работ, соответствующих выбранному фильтру.</div>';
            return;
        }
        
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
                        ${lab.tags.map(tag => `
                            <span class="card-badge ${tag === activeTag ? 'active' : ''}">${tag}</span>
                        `).join('')}
                    </div>
                </div>
                <span class="number">#${lab.id}</span>
            `;
            
            container.appendChild(labCard);
        });
    }
    
    loadLabs();
});