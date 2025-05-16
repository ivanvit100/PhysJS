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
        
        // Добавляем кастомные стили для IntroJS
        if (!document.getElementById('introjs-custom-styles')) {
          const customStyles = document.createElement('style');
          customStyles.id = 'introjs-custom-styles';
          customStyles.textContent = `
            .introjs-button {
              padding: 8px 12px !important;
              background: linear-gradient(to bottom, var(--color-primary, #3498db) 0%, var(--color-primary-dark, #2980b9) 100%) !important;
              color: white !important;
              border: none !important;
              border-radius: var(--radius-md, 6px) !important;
              font-weight: 600 !important;
              cursor: pointer !important;
              box-shadow: 0 2px 10px rgba(52, 152, 219, 0.3) !important;
              transition: all 0.2s ease !important;
              text-shadow: none !important;
              font-family: var(--font-sans, 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif) !important;
              min-width: 80px !important;
              text-align: center !important;
            }
            
            .introjs-button:hover {
              background: linear-gradient(to bottom, var(--color-primary-dark, #2980b9) 0%, #2471a3 100%) !important;
              box-shadow: 0 4px 12px rgba(52, 152, 219, 0.4) !important;
              transform: translateY(-1px) !important;
            }
            
            .introjs-button:active {
              transform: translateY(1px) !important;
              box-shadow: 0 1px 5px rgba(52, 152, 219, 0.4) !important;
            }
            
            .introjs-prevbutton {
              background: linear-gradient(to bottom, #f5f7fa 0%, #e4edf5 100%) !important;
              color: var(--color-secondary, #2c3e50) !important;
              border: 1px solid rgba(52, 152, 219, 0.3) !important;
              margin-right: 8px !important;
            }
            
            .introjs-prevbutton:hover {
              background: linear-gradient(to bottom, #e4edf5 0%, #d4e3ef 100%) !important;
              border-color: rgba(52, 152, 219, 0.5) !important;
            }
            
            .introjs-disabled, .introjs-disabled:hover, .introjs-disabled:focus {
              background: #95a5a6 !important;
              color: rgba(255, 255, 255, 0.7) !important;
              border: none !important;
              box-shadow: none !important;
              cursor: not-allowed !important;
              transform: none !important;
              opacity: 0.7 !important;
            }
            
            .introjs-donebutton {
              background: linear-gradient(to bottom, #2ecc71 0%, #27ae60 100%) !important;
              color: white !important;
            }
            
            .introjs-donebutton:hover {
              background: linear-gradient(to bottom, #27ae60 0%, #219955 100%) !important;
            }
            
            .introjs-tooltip {
              background: rgba(255, 255, 255, 0.95) !important;
              backdrop-filter: blur(5px) !important;
              border-radius: var(--radius-lg, 8px) !important;
              box-shadow: 0 5px 25px rgba(0, 0, 0, 0.15) !important;
              border: 1px solid rgba(52, 152, 219, 0.2) !important;
            }
            
            .introjs-tooltiptext {
              padding: 15px !important;
            }
            
            .introjs-tooltip-title {
              color: var(--color-primary, #3498db) !important;
              font-weight: 600 !important;
              margin-bottom: 8px !important;
            }
            
            .introjs-tooltipbuttons {
              border-top: 1px solid rgba(52, 152, 219, 0.2) !important;
              padding: 10px !important;
            }
            
            .introjs-bullets ul li a {
              background: rgba(52, 152, 219, 0.3) !important;
              width: 10px !important;
              height: 10px !important;
            }
            
            .introjs-bullets ul li a.active {
              background: var(--color-primary, #3498db) !important;
            }
            
            .introjs-progress, .introjs-progressbar {
              display: none !important;
            }
          `;
          document.head.appendChild(customStyles);
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
          skipLabel: 'x',
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