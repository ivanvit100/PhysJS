(function() {
  if (typeof document !== 'undefined') {
    if (!document.getElementById('introjs-css')) {
      const link = document.createElement('link');
      link.id = 'introjs-css';
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/intro.js/7.2.0/introjs.min.css';
      document.head.appendChild(link);
    }
    
    if (typeof introJs === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/intro.js/7.2.0/intro.min.js';
      script.onload = function() {
        console.log('Intro.js успешно загружен');
      };
      document.head.appendChild(script);
    }
  }

  const intro = {
    _instance: null,

    init: function(steps) {
      const checkIntroJs = () => {
        if (typeof introJs === 'undefined') {
          setTimeout(checkIntroJs, 100);
          return;
        }
        
        this._instance = introJs();
        
        const introSteps = steps.map(step => ({
          title: step.title,
          intro: step.description,
          element: step.element,
          position: step.position || 'bottom'
        }));
        
        this._instance.setOptions({
          steps: introSteps,
          showBullets: true,
          showProgress: true,
          exitOnOverlayClick: false,
          exitOnEsc: true,
          nextLabel: 'Далее',
          prevLabel: 'Назад',
          skipLabel: '>',
          doneLabel: 'Готово'
        });
      };
      
      checkIntroJs();
      return this;
    },
    
    start: function() {
      if (!this._instance) return;
      this._instance.start();
    },
    
    createTabContent: function(elementIds, containerId = 'tabs-container', title = 'Информационная панель') {
      let container;
      if (containerId) {
        container = document.getElementById(containerId);
        if (!container) {
          container = document.createElement('div');
          container.id = containerId;
          
          const firstElement = document.getElementById(elementIds[0]);
          firstElement ?
            firstElement.parentNode.insertBefore(container, firstElement) :
            document.body.appendChild(container);
        }
      } else {
        container = document.createElement('div');
        container.id = 'tabs-container';
        
        const firstElement = document.getElementById(elementIds[0]);
        firstElement ?
          firstElement.parentNode.insertBefore(container, firstElement) :
          document.body.appendChild(container);
      }
    
      const infoContent = document.createElement('div');
      infoContent.className = 'info-content';
      
      const header = document.createElement('div');
      header.className = 'info-content-header';
      const headerTitle = document.createElement('h3');
      headerTitle.textContent = title;
      header.appendChild(headerTitle);
      infoContent.appendChild(header);
      
      const contentContainer = document.createElement('div');
      contentContainer.className = 'info-content-panels';
      contentContainer.style.position = 'relative';
      infoContent.appendChild(contentContainer);
      
      const buttonsContainer = document.createElement('div');
      buttonsContainer.className = 'info-content-buttons';
      
      const elements = [];
      
      elementIds.forEach((id, index) => {
        const element = document.getElementById(id);
        if (!element) return;
        
        elements.push(element);
        
        if (index === 0) {
          element.style.position = 'relative';
          element.style.opacity = '1';
          element.style.zIndex = '1';
        } else {
          element.style.position = 'absolute';
          element.style.top = '0';
          element.style.left = '0';
          element.style.width = '100%';
          element.style.opacity = '0';
          element.style.zIndex = '-1';
        }
        
        element.style.transition = 'opacity 0.3s ease';
        contentContainer.appendChild(element);
        
        const button = document.createElement('button');
        button.textContent = `Таб ${index + 1}`;
        button.className = index === 0 ? 'active' : '';
        
        button.addEventListener('click', () => {
          elements.forEach(el => {
            el.style.position = 'absolute';
            el.style.top = '0';
            el.style.left = '0';
            el.style.width = '100%';
            el.style.opacity = '0';
            el.style.zIndex = '-1';
          });
          
          element.style.position = 'relative';
          element.style.top = '';
          element.style.left = '';
          element.style.width = '';
          element.style.opacity = '1';
          element.style.zIndex = '1';
          
          buttonsContainer.querySelectorAll('button').forEach(btn => {
            btn.className = '';
          });
          button.className = 'active';
        });
        
        buttonsContainer.appendChild(button);
      });
      
      infoContent.appendChild(buttonsContainer);
      container.appendChild(infoContent);
      
      return infoContent;
    }
  };

  if (typeof module !== 'undefined' && module.exports)
    module.exports = intro;
  else if (typeof define === 'function' && define.amd)
    define([], function() { return intro; });
  else
    window.intro = intro;
})();