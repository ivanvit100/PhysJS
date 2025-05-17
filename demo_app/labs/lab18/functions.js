const experimentFunctions = {
    initializeExperiment(state, elements) {
        this.resetExperiment(state, elements);
        this.updateCoinBox(state, elements);
        this.updateTable(state, elements);
        this.drawChart(state, elements);
        
        window.addEventListener('resize', () => {
            this.drawChart(state, elements);
        });
    },

    handleCoinBoxClick(event, state, elements) {
        const currentTime = new Date().getTime();
        const timeDifference = currentTime - state.lastClickTime;

        if (timeDifference < 1000 && timeDifference > 50)
            this.simulateToss(state, elements);

        state.lastClickTime = currentTime;
    },

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    },

    simulateToss(state, elements) {
        if (state.remainingCoins <= 0) {
            this.showToast('Нет монет для эксперимента!', 'error', elements);
            return;
        }

        if (state.isShaking) return;

        state.isShaking = true;
        elements.resetButton.disabled = true;
        elements.coinBoxElement.classList.add('box-shake');

        const allCoins = elements.coinBoxElement.querySelectorAll('.coin');
        allCoins.forEach(coin => {
            coin.classList.add('coin-flipping');
            
            coin.addEventListener('animationend', function handler() {
                coin.classList.remove('coin-flipping');
                coin.removeEventListener('animationend', handler);
            }, {once: true});
        });

        setTimeout(() => {
            elements.coinBoxElement.classList.remove('box-shake');

            const headsCount = Math.round(state.remainingCoins * 0.5 * (0.8 + Math.random() * 0.4));
            const newRemaining = state.remainingCoins - headsCount;

            const indices = Array.from({length: state.remainingCoins}, (_, i) => i);
            this.shuffleArray(indices);
            const headsIndices = indices.slice(0, headsCount);

            allCoins.forEach((coin, index) => {
                if (headsIndices.includes(index)) coin.classList.add('heads');
            });

            state.remainingCoins = newRemaining;
            state.currentTrial.push(newRemaining);

            this.showToast(`Бросок ${state.currentTrial.length}: ${headsCount} монет выпало "орлом", ${newRemaining} осталось.`, 'success', elements);

            setTimeout(() => {
                const headsCoins = elements.coinBoxElement.querySelectorAll('.coin.heads');
                headsCoins.forEach(coin => {
                    coin.style.opacity = '0';
                    coin.style.transform = 'scale(0.8) translateY(10px)';
                    setTimeout(() => coin.remove(), 300);
                });

                this.updateTable(state, elements);
                this.drawChart(state, elements);

                state.remainingCoins == 0 && this.createLargeChart(state, elements);

                elements.resetButton.disabled = false;
                state.isShaking = false;
            }, 2000);
        }, 800);
    },

    resetExperiment(state, elements) {
        state.remainingCoins = state.INITIAL_COINS;
        state.currentTrial = [];

        const chartContainer = elements.canvas.parentElement.parentElement.parentElement;
        chartContainer.classList.remove('chart-container-zoomed');

        this.updateCoinBox(state, elements);
        this.updateTable(state, elements);
        this.drawChart(state, elements);
    },

    updateCoinBox(state, elements) {
        elements.coinBoxElement.innerHTML = '';

        if (state.remainingCoins <= 0) {
            const noCoinsMessage = document.createElement('div');
            noCoinsMessage.className = 'no-coins-message';
            noCoinsMessage.textContent = 'Нет монет';
            elements.coinBoxElement.appendChild(noCoinsMessage);
            return;
        }

        for (let i = 0; i < state.remainingCoins; i++) {
            const coin = document.createElement('div');
            coin.className = 'coin';

            coin.addEventListener('mouseenter', function() {
                if (!this.classList.contains('coin-flipping')) {
                    this.classList.add('coin-flipping');              
                    this.addEventListener('animationend', function handler() {
                        this.classList.remove('coin-flipping');
                        this.removeEventListener('animationend', handler);
                    }, {once: true});
                }
            });

            elements.coinBoxElement.appendChild(coin);
        }
        
        const hintElement = document.createElement('div');
        hintElement.className = 'coin-box-hint';
        hintElement.textContent = 'Дважды кликните для броска';
        elements.coinBoxElement.appendChild(hintElement);
        
        setTimeout(() => {
            if (hintElement.parentNode) {
                hintElement.style.opacity = '0';
                setTimeout(() => {
                    hintElement.parentNode && hintElement.parentNode.removeChild(hintElement);
                }, 500);
            }
        }, 3000);
    },

    updateTable(state, elements) {
        elements.resultsTableBody.innerHTML = '';

        const maxLength = state.currentTrial.length + 1;

        for (let i = 0; i < maxLength; i++) {
            const row = document.createElement('tr');

            const tossCell = document.createElement('td');
            tossCell.textContent = i;
            row.appendChild(tossCell);

            const currentTailsCell = document.createElement('td');
            currentTailsCell.className = 'text-center';
            currentTailsCell.textContent = i === 0 ? state.INITIAL_COINS : (state.currentTrial[i-1] !== undefined ? state.currentTrial[i-1] : '-');
            row.appendChild(currentTailsCell);

            const currentHeadsCell = document.createElement('td');
            currentHeadsCell.className = 'text-center';
            currentHeadsCell.textContent = i === 0 ? 0 : (state.currentTrial[i-1] !== undefined ? state.INITIAL_COINS - state.currentTrial[i-1] : '-');
            row.appendChild(currentHeadsCell);

            const theoreticalCell = document.createElement('td');
            theoreticalCell.className = 'text-center';
            theoreticalCell.textContent = Math.round(state.INITIAL_COINS * Math.pow(0.5, i));
            row.appendChild(theoreticalCell);

            elements.resultsTableBody.appendChild(row);
        }
    },

    drawChart(state, elements) {
        const ctx = elements.ctx;
        const canvas = elements.canvas;
            
        const dpr = window.devicePixelRatio || 1;
        canvas.width = canvas.offsetWidth * dpr;
        canvas.height = canvas.offsetHeight * dpr;
        ctx.scale(dpr, dpr);
            
        ctx.clearRect(0, 0, canvas.width, canvas.height);
            
        const width = canvas.offsetWidth;
        const height = canvas.offsetHeight;
            
        const margin = { 
            top: 20,  
            right: 20, 
            bottom: 80, 
            left: 50
        }; 
        
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;
            
        const maxTosses = Math.max(state.currentTrial.length, 7);
        const xScale = chartWidth / maxTosses;
        const yScale = chartHeight / state.INITIAL_COINS;
    
        ctx.beginPath();
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1;
        ctx.moveTo(margin.left, margin.top);
        ctx.lineTo(margin.left, margin.top + chartHeight);
        ctx.moveTo(margin.left, margin.top + chartHeight);
        ctx.lineTo(margin.left + chartWidth, margin.top + chartHeight);
        ctx.stroke();
    
        ctx.beginPath();
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 0.5;
    
        const yValues = [0, 32, 64, 96, 128];
        
        yValues.forEach(value => {
            const yPos = margin.top + chartHeight - (value * yScale);
            ctx.moveTo(margin.left, yPos);
            ctx.lineTo(margin.left + chartWidth, yPos);
        });
    
        for (let i = 0; i <= maxTosses; i++) {
            const x = margin.left + i * xScale;
            ctx.moveTo(x, margin.top);
            ctx.lineTo(x, margin.top + chartHeight);
        }
        ctx.stroke();
    
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'center';
    
        for (let i = 0; i <= maxTosses; i++) {
            const x = margin.left + i * xScale;
            ctx.fillText(i.toString(), x, margin.top + chartHeight + 20);
        }
    
        ctx.textAlign = 'right';
        ctx.font = '13px sans-serif';
        
        yValues.forEach(value => {
            const yPos = margin.top + chartHeight - (value * yScale);
            ctx.fillText(value.toString(), margin.left - 10, yPos + 4);
        });
    
        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#334155';
        ctx.textAlign = 'center';
        ctx.fillText('Номер броска', margin.left + chartWidth / 2, margin.top + chartHeight + 40);
    
        ctx.save();
        ctx.translate(margin.left - 40, margin.top + chartHeight / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Количество монет', 0, 0);
        ctx.restore();
    
        const theoreticalData = [];
        for (let i = 0; i <= maxTosses; i++) {
            theoreticalData.push({
                toss: i,
                value: state.INITIAL_COINS * Math.pow(0.5, i)
            });
        }
    
        ctx.beginPath();
        ctx.strokeStyle = '#ff7300';
        ctx.lineWidth = 2;
            
        theoreticalData.forEach((point, index) => {
            const x = margin.left + point.toss * xScale;
            const y = margin.top + chartHeight - (point.value * yScale);
    
            index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
    
        ctx.stroke();
    
        if (state.currentTrial.length > 0) {
            ctx.beginPath();
            ctx.strokeStyle = '#8884d8';
            ctx.lineWidth = 2;
    
            ctx.moveTo(margin.left, margin.top + chartHeight - (state.INITIAL_COINS * yScale));
    
            state.currentTrial.forEach((value, index) => {
                const x = margin.left + (index + 1) * xScale;
                const y = margin.top + chartHeight - (value * yScale);
                ctx.lineTo(x, y);
            });
    
            ctx.stroke();
        
            ctx.fillStyle = '#8884d8';
            ctx.beginPath();
            ctx.arc(margin.left, margin.top + chartHeight - (state.INITIAL_COINS * yScale), 4, 0, Math.PI * 2);
            ctx.fill();
    
            state.currentTrial.forEach((value, index) => {
                const x = margin.left + (index + 1) * xScale;
                const y = margin.top + chartHeight - (value * yScale);
    
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, Math.PI * 2);
                ctx.fill();
            });
        }
    
        let legendX = margin.left;
        let legendY = margin.top + chartHeight + 55;
        const legendSpacing = 20;
    
        ctx.beginPath();
        ctx.strokeStyle = '#ff7300';
        ctx.lineWidth = 2;
        ctx.moveTo(legendX, legendY);
        ctx.lineTo(legendX + 20, legendY);
        ctx.stroke();
    
        ctx.fillStyle = '#334155';
        ctx.textAlign = 'left';
        ctx.fillText('Теоретическая кривая', legendX + 30, legendY + 4);
    
        if (state.currentTrial.length > 0) {
            legendY += legendSpacing;
            
            ctx.beginPath();
            ctx.strokeStyle = '#8884d8';
            ctx.lineWidth = 2;
            ctx.moveTo(legendX, legendY);
            ctx.lineTo(legendX + 20, legendY);
            ctx.stroke();
    
            ctx.fillStyle = '#8884d8';
            ctx.beginPath();
            ctx.arc(legendX + 10, legendY, 4, 0, Math.PI * 2);
            ctx.fill();
    
            ctx.fillStyle = '#334155';
            ctx.fillText('Экспериментальная кривая', legendX + 30, legendY + 4);
        }
    },

    createLargeChart(state, elements) {
        const existingModal = document.getElementById('large-chart-modal');
        existingModal && existingModal.remove();
            
        const modal = document.createElement('div');
        modal.id = 'large-chart-modal';
        modal.className = 'large-chart-modal';
            
        const chartContainer = document.createElement('div');
        chartContainer.className = 'large-chart-container';
            
        const header = document.createElement('h2');
        header.textContent = 'Результаты эксперимента';
        header.className = 'large-chart-title';
        chartContainer.appendChild(header);
            
        const canvas = document.createElement('canvas');
        canvas.id = 'large-decay-chart';
        chartContainer.appendChild(canvas);
            
        const closeButton = document.createElement('button');
        closeButton.className = 'modal-close-btn';
        closeButton.innerHTML = '&times;';
        closeButton.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        chartContainer.appendChild(closeButton);

        modal.appendChild(chartContainer);
        document.body.appendChild(modal);

        modal.addEventListener('click', (e) => {
            e.target === modal && document.body.removeChild(modal);
        });

        setTimeout(() => {
            const ctx = canvas.getContext('2d');
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);

            const width = rect.width;
            const height = rect.height;

            const margin = { 
                top: 40,  
                right: 40, 
                bottom: 100, 
                left: 80
            };      

            const chartWidth = width - margin.left - margin.right;
            const chartHeight = height - margin.top - margin.bottom;            
            const maxTosses = Math.max(state.currentTrial.length, 7);
            const xScale = chartWidth / maxTosses;
            const yScale = chartHeight / state.INITIAL_COINS;           
            
            ctx.clearRect(0, 0, width, height);
            ctx.beginPath();
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 2;
            ctx.moveTo(margin.left, margin.top);
            ctx.lineTo(margin.left, margin.top + chartHeight);
            ctx.moveTo(margin.left, margin.top + chartHeight);
            ctx.lineTo(margin.left + chartWidth, margin.top + chartHeight);
            ctx.stroke();           
            ctx.beginPath();
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 1;          
            
            const yValues = [0, 32, 64, 96, 128];           
            
            yValues.forEach(value => {
                const yPos = margin.top + chartHeight - (value * yScale);
                ctx.moveTo(margin.left, yPos);
                ctx.lineTo(margin.left + chartWidth, yPos);
            });         
            
            for (let i = 0; i <= maxTosses; i++) {
                const x = margin.left + i * xScale;
                ctx.moveTo(x, margin.top);
                ctx.lineTo(x, margin.top + chartHeight);
            }
            
            ctx.stroke();           
            ctx.font = '16px sans-serif';
            ctx.fillStyle = '#64748b';
            ctx.textAlign = 'center';           
            
            for (let i = 0; i <= maxTosses; i++) {
                const x = margin.left + i * xScale;
                ctx.fillText(i.toString(), x, margin.top + chartHeight + 30);
            }           
            
            ctx.textAlign = 'right';
            ctx.font = '16px sans-serif';           
            
            yValues.forEach(value => {
                const yPos = margin.top + chartHeight - (value * yScale);
                ctx.fillText(value.toString(), margin.left - 15, yPos + 5);
            });         
            
            ctx.font = '18px sans-serif';
            ctx.fillStyle = '#334155';
            ctx.textAlign = 'center';
            ctx.fillText('Номер броска', margin.left + chartWidth / 2, margin.top + chartHeight + 70);          
            ctx.save();
            ctx.translate(margin.left - 50, margin.top + chartHeight / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText('Количество монет', 0, 0);
            ctx.restore();          
            
            const theoreticalData = [];
            
            for (let i = 0; i <= maxTosses; i++) {
                theoreticalData.push({
                    toss: i,
                    value: state.INITIAL_COINS * Math.pow(0.5, i)
                });
            }   

            ctx.beginPath();
            ctx.strokeStyle = '#ff7300';
            ctx.lineWidth = 3;          
            
            theoreticalData.forEach((point, index) => {
                const x = margin.left + point.toss * xScale;
                const y = margin.top + chartHeight - (point.value * yScale);          
                index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            });     

            ctx.stroke();           
            
            if (state.currentTrial.length > 0) {
                ctx.beginPath();
                ctx.strokeStyle = '#8884d8';
                ctx.lineWidth = 3;            
                ctx.moveTo(margin.left, margin.top + chartHeight - (state.INITIAL_COINS * yScale));           
                
                state.currentTrial.forEach((value, index) => {
                    const x = margin.left + (index + 1) * xScale;
                    const y = margin.top + chartHeight - (value * yScale);
                    ctx.lineTo(x, y);
                }); 

                ctx.stroke();
                ctx.fillStyle = '#8884d8';
                ctx.beginPath();
                ctx.arc(margin.left, margin.top + chartHeight - (state.INITIAL_COINS * yScale), 6, 0, Math.PI * 2);
                ctx.fill();           
                
                state.currentTrial.forEach((value, index) => {
                    const x = margin.left + (index + 1) * xScale;
                    const y = margin.top + chartHeight - (value * yScale);
                    
                    ctx.beginPath();
                    ctx.arc(x, y, 6, 0, Math.PI * 2);
                    ctx.fill();
                });
            }     

            let legendX = margin.left + 20;
            let legendY = margin.top + 30;
            const legendSpacing = 30;           
            
            ctx.beginPath();
            ctx.strokeStyle = '#ff7300';
            ctx.lineWidth = 3;
            ctx.moveTo(legendX, legendY);
            ctx.lineTo(legendX + 30, legendY);
            ctx.stroke();           
            ctx.fillStyle = '#334155';
            ctx.textAlign = 'left';
            ctx.font = '16px sans-serif';
            ctx.fillText('Теоретическая кривая', legendX + 40, legendY + 5);            
            
            if (state.currentTrial.length > 0) {
                legendY += legendSpacing;         
                ctx.beginPath();
                ctx.strokeStyle = '#8884d8';
                ctx.lineWidth = 3;
                ctx.moveTo(legendX, legendY);
                ctx.lineTo(legendX + 30, legendY);
                ctx.stroke();         
                ctx.fillStyle = '#8884d8';
                ctx.beginPath();
                ctx.arc(legendX + 15, legendY, 6, 0, Math.PI * 2);
                ctx.fill();           
                ctx.fillStyle = '#334155';
                ctx.fillText('Экспериментальная кривая', legendX + 40, legendY + 5);
            }
        }, 100);
    },

    showToast(message, type = 'success', elements) {
        elements.toastContent.textContent = message;
        elements.toast.className = `toast ${type} show`;

        setTimeout(() => {
            elements.toast.className = 'toast';
        }, 3000);
    },

    backToMainPage() {
        window.location.href = window.location.origin;
    }
};

export default experimentFunctions;