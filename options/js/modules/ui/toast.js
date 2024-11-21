// Toast 通知系统
export const toast = {
    show(message, type = 'info', duration = 3000) {
        const container = document.querySelector('.toast-container');
        const toastElement = document.createElement('div');
        toastElement.className = `toast ${type}`;
        toastElement.textContent = message;

        container.appendChild(toastElement);

        setTimeout(() => {
            toastElement.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => container.removeChild(toastElement), 300);
        }, duration);
    },
    
    success(message, duration) {
        this.show(message, 'success', duration);
    },
    
    error(message, duration) {
        this.show(message, 'error', duration);
    },
    
    warning(message, duration) {
        this.show(message, 'warning', duration);
    }
}; 