export function showConfirm(message) {
    return new Promise((resolve) => {
        const dialog = document.getElementById('confirmDialog');
        const messageElement = document.getElementById('confirmMessage');
        const okButton = document.getElementById('confirmOk');
        const cancelButton = document.getElementById('confirmCancel');

        messageElement.textContent = message;
        dialog.style.display = 'flex';

        function handleClose(result) {
            dialog.style.display = 'none';
            resolve(result);
        }

        okButton.onclick = () => handleClose(true);
        cancelButton.onclick = () => handleClose(false);
        dialog.onclick = (e) => {
            if (e.target === dialog) handleClose(false);
        };
    });
} 